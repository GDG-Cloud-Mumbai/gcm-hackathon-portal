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