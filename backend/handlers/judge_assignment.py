from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database
from uuid6 import uuid7

from middlewares.auth import get_current_user
from models.hackathon_member import HackathonMemberRole
from models.judge_assignment import (
    JudgeAssignment,
    JudgeAssignmentStatus,
)
from models.user import UserPrivate
from utils.db import get_db


# ------------------------------------------------------------------
# Payload Models
# ------------------------------------------------------------------


class CreateJudgeAssignmentPayload(BaseModel):
    judge_uuid: str
    submission_uuid: str


class UpdateJudgeAssignmentPayload(BaseModel):
    status: JudgeAssignmentStatus


# ------------------------------------------------------------------
# Response Models
# ------------------------------------------------------------------


class JudgeAssignmentResponse(BaseModel):
    uuid: str
    hackathon_uuid: str
    judge_uuid: str
    submission_uuid: str
    status: JudgeAssignmentStatus
    created_at: datetime | None = None
    updated_at: datetime | None = None
    completed_at: datetime | None = None


class JudgeAssignmentListResponse(BaseModel):
    assignments: list[JudgeAssignmentResponse]


class AdminJudgeResponse(BaseModel):
    """Judge information exposed to administrators."""

    uuid: str
    name: str | None = None
    email: str


class AdminJudgeSubmissionResponse(BaseModel):
    """Submission information exposed to administrators."""

    uuid: str
    title: str
    team_uuid: str
    team_name: str | None = None
    track_uuid: str
    track_name: str | None = None


class AdminJudgeAssignmentResponse(BaseModel):
    """Detailed judge assignment information for administrators."""

    uuid: str
    hackathon_uuid: str

    judge: AdminJudgeResponse
    submission: AdminJudgeSubmissionResponse

    status: JudgeAssignmentStatus

    created_at: datetime | None = None
    updated_at: datetime | None = None
    completed_at: datetime | None = None


class AdminJudgeAssignmentListResponse(BaseModel):
    """List of detailed judge assignments for administrators."""

    assignments: list[AdminJudgeAssignmentResponse]

# ------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------


def _utcnow() -> datetime:
    """Return the current UTC timestamp."""
    return datetime.now(UTC)


def _assignment_collection(db: Database[Any]) -> Any:
    """Return the judge assignments collection."""
    return db["judge_assignments"]


def _hackathon_collection(db: Database[Any]) -> Any:
    """Return the hackathons collection."""
    return db["hackathons"]


def _submission_collection(db: Database[Any]) -> Any:
    """Return the submissions collection."""
    return db["submissions"]


def _hackathon_member_collection(db: Database[Any]) -> Any:
    """Return the hackathon members collection."""
    return db["hackathon_members"]


def _team_member_collection(db: Database[Any]) -> Any:
    """Return the team members collection."""
    return db["team_members"]

def _user_collection(db: Database[Any]) -> Any:
    """Return the users collection."""
    return db["users"]


def _team_collection(db: Database[Any]) -> Any:
    """Return the teams collection."""
    return db["teams"]


def _track_collection(db: Database[Any]) -> Any:
    """Return the tracks collection."""
    return db["tracks"]


def _authorize_admin(current_user: UserPrivate) -> None:
    """Ensure the current user has administrator privileges."""

    if current_user.global_role.name not in {
        "admin",
        "superadmin",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action",
        )


def _get_hackathon_by_uuid(
    *,
    hackathon_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Return a hackathon document by UUID."""

    hackathon = _hackathon_collection(db).find_one(
        {"uuid": hackathon_uuid}
    )

    if hackathon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon not found",
        )

    return hackathon


def _get_submission_by_uuid(
    *,
    submission_uuid: str,
    hackathon_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Return a submission belonging to the hackathon."""

    submission = _submission_collection(db).find_one(
        {
            "uuid": submission_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    return submission


def _get_judge_membership(
    *,
    hackathon_uuid: str,
    judge_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Ensure the user is a judge for this hackathon."""

    membership = _hackathon_member_collection(db).find_one(
        {
            "hackathon_uuid": hackathon_uuid,
            "user_uuid": judge_uuid,
        }
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Judge is not a member of this hackathon",
        )

    if membership.get("role") != HackathonMemberRole.JUDGE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a judge for this hackathon",
        )

    return membership


def _get_assignment_by_uuid(
    *,
    assignment_uuid: str,
    hackathon_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Return an assignment belonging to the hackathon."""

    assignment = _assignment_collection(db).find_one(
        {
            "uuid": assignment_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Judge assignment not found",
        )

    return assignment


def _ensure_judge_not_on_submission_team(
    *,
    judge_uuid: str,
    submission: dict[str, Any],
    db: Database[Any],
) -> None:
    """Prevent a judge from evaluating their own team's submission."""

    membership = _team_member_collection(db).find_one(
        {
            "team_uuid": submission["team_uuid"],
            "user_uuid": judge_uuid,
            "left_at": None,
        }
    )

    if membership is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A judge cannot evaluate their own team's submission",
        )


def _get_existing_assignment(
    *,
    hackathon_uuid: str,
    judge_uuid: str,
    submission_uuid: str,
    db: Database[Any],
) -> dict[str, Any] | None:
    """Find an existing assignment for a judge and submission."""

    return _assignment_collection(db).find_one(
        {
            "hackathon_uuid": hackathon_uuid,
            "judge_uuid": judge_uuid,
            "submission_uuid": submission_uuid,
        }
    )


def _build_assignment_response(
    assignment: JudgeAssignment,
) -> JudgeAssignmentResponse:
    """Build a public response model."""

    return JudgeAssignmentResponse(
        uuid=assignment.uuid,
        hackathon_uuid=assignment.hackathon_uuid,
        judge_uuid=assignment.judge_uuid,
        submission_uuid=assignment.submission_uuid,
        status=assignment.status,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
        completed_at=assignment.completed_at,
    )


def _build_assignment_from_document(
    document: dict[str, Any],
) -> JudgeAssignment:
    """Convert a MongoDB document into a JudgeAssignment model."""

    return JudgeAssignment(**document)

def _build_admin_assignment_response(
    assignment: JudgeAssignment,
    db: Database[Any],
) -> AdminJudgeAssignmentResponse:
    """Build a detailed assignment response for administrators."""

    judge = _user_collection(db).find_one(
        {
            "uuid": assignment.judge_uuid,
        }
    )

    if judge is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Judge user not found",
        )

    submission = _submission_collection(db).find_one(
        {
            "uuid": assignment.submission_uuid,
            "hackathon_uuid": assignment.hackathon_uuid,
        }
    )

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    team = _team_collection(db).find_one(
        {
            "uuid": submission["team_uuid"],
            "hackathon_uuid": assignment.hackathon_uuid,
        }
    )

    track = _track_collection(db).find_one(
        {
            "uuid": submission["track_uuid"],
            "hackathon_uuid": assignment.hackathon_uuid,
        }
    )

    return AdminJudgeAssignmentResponse(
        uuid=assignment.uuid,
        hackathon_uuid=assignment.hackathon_uuid,
        judge=AdminJudgeResponse(
            uuid=judge["uuid"],
            name=judge.get("name"),
            email=judge.get("email", ""),
        ),
        submission=AdminJudgeSubmissionResponse(
            uuid=submission["uuid"],
            title=submission["title"],
            team_uuid=submission["team_uuid"],
            team_name=(
                team.get("name")
                if team is not None
                else None
            ),
            track_uuid=submission["track_uuid"],
            track_name=(
                track.get("name")
                if track is not None
                else None
            ),
        ),
        status=assignment.status,
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
        completed_at=assignment.completed_at,
    )


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------


async def create_judge_assignment(
    hackathon_uuid: str,
    payload: CreateJudgeAssignmentPayload,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> AdminJudgeAssignmentResponse:
    """Assign a judge to a submission."""

    _authorize_admin(current_user)

    _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    submission = _get_submission_by_uuid(
        submission_uuid=payload.submission_uuid,
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    _get_judge_membership(
        hackathon_uuid=hackathon_uuid,
        judge_uuid=payload.judge_uuid,
        db=db,
    )

    _ensure_judge_not_on_submission_team(
        judge_uuid=payload.judge_uuid,
        submission=submission,
        db=db,
    )

    existing_assignment = _get_existing_assignment(
        hackathon_uuid=hackathon_uuid,
        judge_uuid=payload.judge_uuid,
        submission_uuid=payload.submission_uuid,
        db=db,
    )

    if existing_assignment is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Judge is already assigned to this submission",
        )

    now = _utcnow()

    assignment = JudgeAssignment(
        uuid=str(uuid7()),
        hackathon_uuid=hackathon_uuid,
        judge_uuid=payload.judge_uuid,
        submission_uuid=payload.submission_uuid,
        status=JudgeAssignmentStatus.ASSIGNED,
        created_at=now,
        updated_at=now,
    )

    _assignment_collection(db).insert_one(
        assignment.model_dump(exclude={"_id"})
    )

    return _build_admin_assignment_response(
    assignment,
    db,
    )


async def list_judge_assignments(
    hackathon_uuid: str,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> AdminJudgeAssignmentListResponse:
    """List all judge assignments for a hackathon."""

    _authorize_admin(current_user)

    _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    assignments = _assignment_collection(db).find(
        {
            "hackathon_uuid": hackathon_uuid,
        }
    )

    assignment_items = [
    _build_admin_assignment_response(
        _build_assignment_from_document(assignment),
        db,
    )
    for assignment in assignments
    ]

    return AdminJudgeAssignmentListResponse(
    assignments=assignment_items,  
    )


async def update_judge_assignment(
    hackathon_uuid: str,
    assignment_uuid: str,
    payload: UpdateJudgeAssignmentPayload,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> AdminJudgeAssignmentResponse:
    """Update the status of a judge assignment."""

    _authorize_admin(current_user)

    assignment = _get_assignment_by_uuid(
        assignment_uuid=assignment_uuid,
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    current_status = JudgeAssignmentStatus(assignment["status"])
    new_status = payload.status

    # Do not allow a completed assignment to be reopened.
    if (
        current_status == JudgeAssignmentStatus.COMPLETED
        and new_status != JudgeAssignmentStatus.COMPLETED
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed judge assignments cannot be reopened",
        )

    now = _utcnow()

    update_fields: dict[str, Any] = {
        "status": new_status.value,
        "updated_at": now,
    }

    if new_status == JudgeAssignmentStatus.COMPLETED:
        # Only set completed_at the first time it is completed.
        if assignment.get("completed_at") is None:
            update_fields["completed_at"] = now

    elif new_status == JudgeAssignmentStatus.ASSIGNED:
        update_fields["completed_at"] = None

    _assignment_collection(db).update_one(
        {
            "uuid": assignment_uuid,
            "hackathon_uuid": hackathon_uuid,
        },
        {
            "$set": update_fields,
        },
    )

    assignment.update(update_fields)

    return _build_admin_assignment_response(
    _build_assignment_from_document(assignment),
    db,
    )


async def delete_judge_assignment(
    hackathon_uuid: str,
    assignment_uuid: str,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> dict[str, str]:
    """Remove a judge assignment."""

    _authorize_admin(current_user)

    assignment = _get_assignment_by_uuid(
        assignment_uuid=assignment_uuid,
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    # Completed assignments must be preserved because their
    # evaluations depend on the assignment.
    if (
        assignment.get("status")
        == JudgeAssignmentStatus.COMPLETED.value
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Completed judge assignments cannot be deleted",
        )

    _assignment_collection(db).delete_one(
        {
            "uuid": assignment_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    return {
        "message": "Judge assignment removed successfully",
    }

# ------------------------------------------------------------------
# Judge-side Response Models
# ------------------------------------------------------------------


class JudgeSubmissionResponse(BaseModel):
    uuid: str
    hackathon_uuid: str
    track_uuid: str
    team_uuid: str
    title: str
    description: str | None = None
    repository_url: str | None = None
    demo_url: str | None = None
    video_url: str | None = None
    status: str
    submitted_at: datetime | None = None


class JudgeAssignmentDetailResponse(BaseModel):
    assignment: JudgeAssignmentResponse
    submission: JudgeSubmissionResponse


# ------------------------------------------------------------------
# Judge-side Endpoints
# ------------------------------------------------------------------


def get_judge_assignment(
    assignment_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> JudgeAssignmentDetailResponse:
    """Get a submission assigned to the current judge."""

    assignment_document = _assignment_collection(db).find_one(
        {
            "uuid": assignment_uuid,
        }
    )

    if assignment_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Judge assignment not found",
        )

    assignment = _build_assignment_from_document(
        assignment_document
    )

    # The assignment must belong to the authenticated judge.
    if assignment.judge_uuid != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this submission",
        )

    # The user must still be a judge for this hackathon.
    _get_judge_membership(
        hackathon_uuid=assignment.hackathon_uuid,
        judge_uuid=current_user.uuid,
        db=db,
    )

    submission_document = _submission_collection(db).find_one(
        {
            "uuid": assignment.submission_uuid,
            "hackathon_uuid": assignment.hackathon_uuid,
        }
    )

    if submission_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    submission = JudgeSubmissionResponse(
        uuid=submission_document["uuid"],
        hackathon_uuid=submission_document["hackathon_uuid"],
        track_uuid=submission_document["track_uuid"],
        team_uuid=submission_document["team_uuid"],
        title=submission_document["title"],
        description=submission_document.get("description"),
        repository_url=submission_document.get("repository_url"),
        demo_url=submission_document.get("demo_url"),
        video_url=submission_document.get("video_url"),
        status=submission_document.get("status", "draft"),
        submitted_at=submission_document.get("submitted_at"),
    )

    return JudgeAssignmentDetailResponse(
        assignment=_build_assignment_response(assignment),
        submission=submission,
    )

