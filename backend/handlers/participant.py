import random
import string
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, Field
from pymongo.database import Database
from uuid6 import uuid7

from middlewares.auth import get_current_user
from models.user import UserPrivate, UserPublic
from utils.db import get_db
from bson import ObjectId


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_team_code(length: int = 6) -> str:
    return "".join(
        random.choices(
            string.ascii_uppercase + string.digits,
            k=length,
        )
    )


class CreateTeamPayload(BaseModel):
    hackathon_uuid: str
    track_uuid: str

    name: str
    description: str | None = None

    is_public: bool = True
    required_skills: list[str] = Field(default_factory=list)


class TeamResponse(BaseModel):
    uuid: str
    name: str
    team_code: str


def create_team(
    payload: CreateTeamPayload,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> TeamResponse:
    team_name = payload.name.strip()

    if not team_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team name cannot be empty",
        )

    # Ensure user is not already part of a team in this hackathon.
    active_memberships = db.team_members.find(
        {
            "user_uuid": current_user.uuid,
            "left_at": None,
        }
    )

    for membership in active_memberships:
        existing_team = db.teams.find_one(
            {"uuid": membership["team_uuid"]}
        )

        if (
            existing_team
            and existing_team.get("hackathon_uuid")
            == payload.hackathon_uuid
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already part of a team in this hackathon",
            )

    # Generate unique team code.
    while True:
        team_code = _generate_team_code()

        existing = db.teams.find_one(
            {"team_code": team_code}
        )

        if existing is None:
            break

    now = _utcnow()
    team_uuid = str(uuid7())

    db.teams.insert_one(
        {
            "uuid": team_uuid,
            "hackathon_uuid": payload.hackathon_uuid,
            "track_uuid": payload.track_uuid,
            "leader_uuid": current_user.uuid,
            "name": team_name,
            "description": payload.description,
            "team_code": team_code,
            "is_public": payload.is_public,
            "required_skills": payload.required_skills,
            "created_at": now,
            "updated_at": now,
        }
    )

    db.team_members.insert_one(
        {
            "team_uuid": team_uuid,
            "user_uuid": current_user.uuid,
            "joined_at": now,
            "left_at": None,
        }
    )

    return TeamResponse(
        uuid=team_uuid,
        name=team_name,
        team_code=team_code,
    )


class JoinTeamPayload(BaseModel):
    # Required only for private teams.
    team_code: str | None = None


class JoinRequestResponse(BaseModel):
    # Team for which the request was created.
    team_uuid: str

    # Current request status.
    status: str

def join_team(
    team_uuid: str,
    payload: JoinTeamPayload,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> JoinRequestResponse:

    # Ensure the target team exists.
    team = db.teams.find_one({"uuid": team_uuid})

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    # Team leaders cannot create join requests for their own teams.
    if team["leader_uuid"] == current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already the leader of this team",
        )

    # Prevent users from joining multiple teams in the same hackathon.
    active_memberships = db.team_members.find(
        {
            "user_uuid": current_user.uuid,
            "left_at": None,
        }
    )

    for membership in active_memberships:
        existing_team = db.teams.find_one(
            {"uuid": membership["team_uuid"]}
        )

        if (
            existing_team
            and existing_team.get("hackathon_uuid")
            == team["hackathon_uuid"]
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already part of a team in this hackathon",
            )

    # Prevent duplicate active requests for the same team.
    existing_request = db.team_join_requests.find_one(
        {
            "team_uuid": team_uuid,
            "user_uuid": current_user.uuid,
            "status": {
                "$in": [
                    "pending",
                    "waitlisted",
                ]
            },
        }
    )

    if existing_request is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Join request already exists for this team",
        )

    # Private teams require a valid team code.
    if not team["is_public"]:
        if payload.team_code is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Team code is required",
            )

        if payload.team_code != team["team_code"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid team code",
            )

    now = _utcnow()

    # Create a new join request.
    db.team_join_requests.insert_one(
        {
            "team_uuid": team_uuid,
            "user_uuid": current_user.uuid,
            "status": "pending",
            "created_at": now,
            "updated_at": now,
        }
    )

    return JoinRequestResponse(
        team_uuid=team_uuid,
        status="pending",
    )

class JoinRequestItem(BaseModel):
    # Join request identifier.
    request_id: str

    # Public applicant information.
    user: UserPublic

    # Current request status.
    status: str

    # Request creation timestamp.
    created_at: datetime | None = None


def list_join_requests(
    team_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> list[JoinRequestItem]:

    # Ensure the team exists.
    team = db.teams.find_one({"uuid": team_uuid})

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    # Only the team leader can review join requests.
    if team["leader_uuid"] != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leaders can view join requests",
        )

    response: list[JoinRequestItem] = []

    # Return only actionable requests.
    pending_requests = db.team_join_requests.find(
        {
            "team_uuid": team_uuid,
            "status": "pending",
        }
    )

    for request in pending_requests:

        # Load applicant information.
        user_doc = db.users.find_one(
            {"uuid": request["user_uuid"]},
            {
                "_id": 0,
                "uuid": 1,
                "username": 1,
                "name": 1,
            },
        )

        if user_doc is None:
            continue

        response.append(
            JoinRequestItem(
                request_id=str(request["_id"]),
                user=UserPublic(**user_doc),
                status=request["status"],
                created_at=request.get("created_at"),
            )
        )

    return response

class RequestActionResponse(BaseModel):
    # Join request identifier.
    request_id: str

    # Updated request status.
    status: str

def approve_join_request(
    request_id: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> RequestActionResponse:

    # Ensure the join request exists.
    join_request = db.team_join_requests.find_one(
        {"_id": ObjectId(request_id)}
    )

    if join_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found",
        )

    # Only pending requests can be approved.
    if join_request["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Join request is no longer pending",
        )

    # Load the team associated with the request.
    team = db.teams.find_one(
        {"uuid": join_request["team_uuid"]}
    )

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    # Only the team leader can approve requests.
    if team["leader_uuid"] != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leaders can approve requests",
        )

    applicant_uuid = join_request["user_uuid"]

    # Prevent duplicate memberships.
    existing_membership = db.team_members.find_one(
        {
            "team_uuid": team["uuid"],
            "user_uuid": applicant_uuid,
            "left_at": None,
        }
    )

    if existing_membership is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a team member",
        )

    # Ensure the applicant has not already joined another team
    # in the same hackathon.
    active_memberships = db.team_members.find(
        {
            "user_uuid": applicant_uuid,
            "left_at": None,
        }
    )

    for membership in active_memberships:
        existing_team = db.teams.find_one(
            {"uuid": membership["team_uuid"]}
        )

        if (
            existing_team
            and existing_team.get("hackathon_uuid")
            == team["hackathon_uuid"]
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already belongs to a team in this hackathon",
            )

    now = _utcnow()

    # Create team membership.
    db.team_members.insert_one(
        {
            "team_uuid": team["uuid"],
            "user_uuid": applicant_uuid,
            "joined_at": now,
            "left_at": None,
        }
    )

    # Mark request approved.
    db.team_join_requests.update_one(
        {"_id": join_request["_id"]},
        {
            "$set": {
                "status": "approved",
                "approved_at": now,
                "approved_by": current_user.uuid,
                "updated_at": now,
            }
        },
    )

    # Close competing requests in the same hackathon.
    competing_requests = db.team_join_requests.find(
        {
            "user_uuid": applicant_uuid,
            "status": "pending",
        }
    )

    for request in competing_requests:

        other_team = db.teams.find_one(
            {"uuid": request["team_uuid"]}
        )

        if (
            other_team
            and other_team.get("hackathon_uuid")
            == team["hackathon_uuid"]
        ):
            db.team_join_requests.update_one(
                {"_id": request["_id"]},
                {
                    "$set": {
                        "status": "accepted_elsewhere",
                        "updated_at": now,
                    }
                },
            )

    return RequestActionResponse(
        request_id=request_id,
        status="approved",
    )


def reject_join_request(
    request_id: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> RequestActionResponse:

    # Ensure the join request exists.
    join_request = db.team_join_requests.find_one(
        {"_id": ObjectId(request_id)}
    )

    if join_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found",
        )

    # Only pending requests can be rejected.
    if join_request["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Join request is no longer pending",
        )

    # Load the associated team.
    team = db.teams.find_one(
        {"uuid": join_request["team_uuid"]}
    )

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    # Only the team leader can reject requests.
    if team["leader_uuid"] != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leaders can reject requests",
        )

    now = _utcnow()

    # Mark request as rejected.
    db.team_join_requests.update_one(
        {"_id": join_request["_id"]},
        {
            "$set": {
                "status": "rejected",
                "rejected_at": now,
                "rejected_by": current_user.uuid,
                "updated_at": now,
            }
        },
    )

    return RequestActionResponse(
        request_id=request_id,
        status="rejected",
    )

class CreateInvitationPayload(BaseModel):
    # User to invite.
    user_uuid: str


class InvitationResponse(BaseModel):
    invitation_id: str
    status: str


class InvitationItem(BaseModel):
    invitation_id: str

    team_uuid: str
    team_name: str

    status: str

    created_at: datetime | None = None


def create_invitation(
    team_uuid: str,
    payload: CreateInvitationPayload,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> InvitationResponse:

    # Ensure the team exists.
    team = db.teams.find_one(
        {"uuid": team_uuid}
    )

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    # Only team leaders can send invitations.
    if team["leader_uuid"] != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team leaders can send invitations",
        )

    # Ensure the target user exists.
    target_user = db.users.find_one(
        {"uuid": payload.user_uuid}
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Leader cannot invite themselves.
    if payload.user_uuid == current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot invite yourself",
        )

    # Prevent inviting existing members.
    existing_member = db.team_members.find_one(
        {
            "team_uuid": team_uuid,
            "user_uuid": payload.user_uuid,
            "left_at": None,
        }
    )

    if existing_member is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this team",
        )

    # Prevent duplicate pending invitations.
    existing_invitation = db.team_invitations.find_one(
        {
            "team_uuid": team_uuid,
            "user_uuid": payload.user_uuid,
            "status": "pending",
        }
    )

    if existing_invitation is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation already exists",
        )

    # Ensure user is not already part of another team
    # in the same hackathon.
    active_memberships = db.team_members.find(
        {
            "user_uuid": payload.user_uuid,
            "left_at": None,
        }
    )

    for membership in active_memberships:
        existing_team = db.teams.find_one(
            {"uuid": membership["team_uuid"]}
        )

        if (
            existing_team
            and existing_team.get("hackathon_uuid")
            == team["hackathon_uuid"]
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already belongs to a team in this hackathon",
            )

    now = _utcnow()

    result = db.team_invitations.insert_one(
        {
            "team_uuid": team_uuid,
            "user_uuid": payload.user_uuid,
            "status": "pending",
            "created_at": now,
            "updated_at": now,
        }
    )

    return InvitationResponse(
        invitation_id=str(result.inserted_id),
        status="pending",
    )


def list_invitations(
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> list[InvitationItem]:

    response: list[InvitationItem] = []

    invitations = db.team_invitations.find(
        {
            "user_uuid": current_user.uuid,
            "status": "pending",
        }
    )

    for invitation in invitations:

        team = db.teams.find_one(
            {"uuid": invitation["team_uuid"]}
        )

        if team is None:
            continue

        response.append(
            InvitationItem(
                invitation_id=str(invitation["_id"]),
                team_uuid=team["uuid"],
                team_name=team["name"],
                status=invitation["status"],
                created_at=invitation.get("created_at"),
            )
        )

    return response




def accept_invitation(
    invitation_id: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> InvitationResponse:

    # Ensure invitation exists.
    invitation = db.team_invitations.find_one(
        {"_id": ObjectId(invitation_id)}
    )

    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    # Only the invited user can accept.
    if invitation["user_uuid"] != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot accept this invitation",
        )

    # Only pending invitations may be accepted.
    if invitation["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation is no longer pending",
        )

    team = db.teams.find_one(
        {"uuid": invitation["team_uuid"]}
    )

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    # Ensure user is not already part of a team
    # in this hackathon.
    active_memberships = db.team_members.find(
        {
            "user_uuid": current_user.uuid,
            "left_at": None,
        }
    )

    for membership in active_memberships:
        existing_team = db.teams.find_one(
            {"uuid": membership["team_uuid"]}
        )

        if (
            existing_team
            and existing_team.get("hackathon_uuid")
            == team["hackathon_uuid"]
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already belongs to a team in this hackathon",
            )

    now = _utcnow()

    # Create membership.
    db.team_members.insert_one(
        {
            "team_uuid": team["uuid"],
            "user_uuid": current_user.uuid,
            "joined_at": now,
            "left_at": None,
        }
    )

    # Mark invitation accepted.
    db.team_invitations.update_one(
        {"_id": invitation["_id"]},
        {
            "$set": {
                "status": "accepted",
                "updated_at": now,
            }
        },
    )

    # Close competing invitations
    # in the same hackathon.
    other_invitations = db.team_invitations.find(
        {
            "user_uuid": current_user.uuid,
            "status": "pending",
        }
    )

    for other_invitation in other_invitations:

        other_team = db.teams.find_one(
            {"uuid": other_invitation["team_uuid"]}
        )

        if (
            other_team
            and other_team.get("hackathon_uuid")
            == team["hackathon_uuid"]
        ):
            db.team_invitations.update_one(
                {"_id": other_invitation["_id"]},
                {
                    "$set": {
                        "status": "accepted_elsewhere",
                        "updated_at": now,
                    }
                },
            )

    # Close pending join requests
    # in the same hackathon.
    join_requests = db.team_join_requests.find(
        {
            "user_uuid": current_user.uuid,
            "status": "pending",
        }
    )

    for request in join_requests:

        request_team = db.teams.find_one(
            {"uuid": request["team_uuid"]}
        )

        if (
            request_team
            and request_team.get("hackathon_uuid")
            == team["hackathon_uuid"]
        ):
            db.team_join_requests.update_one(
                {"_id": request["_id"]},
                {
                    "$set": {
                        "status": "accepted_elsewhere",
                        "updated_at": now,
                    }
                },
            )

    return InvitationResponse(
        invitation_id=invitation_id,
        status="accepted",
    )


def decline_invitation(
    invitation_id: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> InvitationResponse:

    invitation = db.team_invitations.find_one(
        {"_id": ObjectId(invitation_id)}
    )

    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    if invitation["user_uuid"] != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot decline this invitation",
        )

    if invitation["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invitation is no longer pending",
        )

    now = _utcnow()

    db.team_invitations.update_one(
        {"_id": invitation["_id"]},
        {
            "$set": {
                "status": "declined",
                "updated_at": now,
            }
        },
    )

    return InvitationResponse(
        invitation_id=invitation_id,
        status="declined",
    )


class TeamMemberItem(BaseModel):
    uuid: str
    username: str | None = None
    name: str
    is_leader: bool


class MyTeamResponse(BaseModel):
    team_uuid: str
    team_name: str
    team_code: str

    hackathon_uuid: str
    track_uuid: str

    is_leader: bool

    members: list[TeamMemberItem]

def get_my_team(
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> MyTeamResponse:

    membership = db.team_members.find_one(
        {
            "user_uuid": current_user.uuid,
            "left_at": None,
        }
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not part of any team",
        )

    team = db.teams.find_one(
        {"uuid": membership["team_uuid"]}
    )

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    members: list[TeamMemberItem] = []

    team_members = db.team_members.find(
        {
            "team_uuid": team["uuid"],
            "left_at": None,
        }
    )

    for member in team_members:

        user = db.users.find_one(
            {"uuid": member["user_uuid"]}
        )

        if user is None:
            continue

        members.append(
            TeamMemberItem(
                uuid=user["uuid"],
                username=user.get("username"),
                name=user["name"],
                is_leader=(
                    user["uuid"]
                    == team["leader_uuid"]
                ),
            )
        )

    return MyTeamResponse(
        team_uuid=team["uuid"],
        team_name=team["name"],
        team_code=team["team_code"],
        hackathon_uuid=team["hackathon_uuid"],
        track_uuid=team["track_uuid"],
        is_leader=(
            current_user.uuid
            == team["leader_uuid"]
        ),
        members=members,
    )


class LeaveTeamResponse(BaseModel):
    team_uuid: str
    status: str

def leave_team(
    team_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> LeaveTeamResponse:

    team = db.teams.find_one(
        {"uuid": team_uuid}
    )

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    membership = db.team_members.find_one(
        {
            "team_uuid": team_uuid,
            "user_uuid": current_user.uuid,
            "left_at": None,
        }
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of this team",
        )

    # Leader special rules.
    if team["leader_uuid"] == current_user.uuid:

        active_member_count = db.team_members.count_documents(
            {
                "team_uuid": team_uuid,
                "left_at": None,
            }
        )

        # Leader cannot leave while other members exist.
        if active_member_count > 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Transfer leadership before leaving the team",
            )

    now = _utcnow()

    db.team_members.update_one(
        {"_id": membership["_id"]},
        {
            "$set": {
                "left_at": now,
            }
        },
    )

    return LeaveTeamResponse(
        team_uuid=team_uuid,
        status="left",
    )

class TransferLeadershipPayload(BaseModel):
    member_uuid: str


class TransferLeadershipResponse(BaseModel):
    team_uuid: str
    leader_uuid: str

def transfer_leadership(
    team_uuid: str,
    payload: TransferLeadershipPayload,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> TransferLeadershipResponse:

    team = db.teams.find_one(
        {"uuid": team_uuid}
    )

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    if team["leader_uuid"] != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the current leader can transfer leadership",
        )

    if payload.member_uuid == current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already the team leader",
        )

    target_membership = db.team_members.find_one(
        {
            "team_uuid": team_uuid,
            "user_uuid": payload.member_uuid,
            "left_at": None,
        }
    )

    if target_membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user is not an active team member",
        )

    db.teams.update_one(
        {"uuid": team_uuid},
        {
            "$set": {
                "leader_uuid": payload.member_uuid,
                "updated_at": _utcnow(),
            }
        },
    )

    return TransferLeadershipResponse(
        team_uuid=team_uuid,
        leader_uuid=payload.member_uuid,
    )

class RemoveMemberPayload(BaseModel):
    member_uuid: str


class RemoveMemberResponse(BaseModel):
    team_uuid: str
    member_uuid: str
    status: str

def remove_member(
    team_uuid: str,
    payload: RemoveMemberPayload,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> RemoveMemberResponse:

    team = db.teams.find_one(
        {"uuid": team_uuid}
    )

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    if team["leader_uuid"] != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the team leader can remove members",
        )

    if payload.member_uuid == current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Use leave team instead",
        )

    membership = db.team_members.find_one(
        {
            "team_uuid": team_uuid,
            "user_uuid": payload.member_uuid,
            "left_at": None,
        }
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user is not an active team member",
        )

    now = _utcnow()

    db.team_members.update_one(
        {"_id": membership["_id"]},
        {
            "$set": {
                "left_at": now,
            }
        },
    )

    return RemoveMemberResponse(
        team_uuid=team_uuid,
        member_uuid=payload.member_uuid,
        status="removed",
    )

class CancelInvitationResponse(BaseModel):
    invitation_id: str
    status: str

def cancel_invitation(
    invitation_id: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> CancelInvitationResponse:

    invitation = db.team_invitations.find_one(
        {"_id": ObjectId(invitation_id)}
    )

    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    team = db.teams.find_one(
        {"uuid": invitation["team_uuid"]}
    )

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    if team["leader_uuid"] != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the team leader can cancel invitations",
        )

    if invitation["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending invitations can be cancelled",
        )

    now = _utcnow()

    db.team_invitations.update_one(
        {"_id": invitation["_id"]},
        {
            "$set": {
                "status": "cancelled",
                "updated_at": now,
            }
        },
    )

    return CancelInvitationResponse(
        invitation_id=invitation_id,
        status="cancelled",
    )

