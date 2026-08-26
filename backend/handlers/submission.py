from datetime import UTC, datetime, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl
from pymongo import ReturnDocument
from pymongo.database import Database
from uuid6 import uuid7

from middlewares.auth import get_current_user
from models.submission import Submission, SubmissionStatus
from models.user import UserPrivate
from utils.db import get_db


# ------------------------------------------------------------------
# Payload Models
# ------------------------------------------------------------------


class CreateSubmissionPayload(BaseModel):
    hackathon_uuid: str
    track_uuid: str

    title: str
    description: str | None = None

    repository_url: HttpUrl | None = None
    demo_url: HttpUrl | None = None
    video_url: HttpUrl | None = None


class UpdateSubmissionPayload(BaseModel):
    title: str | None = None
    description: str | None = None

    repository_url: HttpUrl | None = None
    demo_url: HttpUrl | None = None
    video_url: HttpUrl | None = None


# ------------------------------------------------------------------
# Response Models
# ------------------------------------------------------------------


class SubmissionResponse(BaseModel):
    uuid: str
    hackathon_uuid: str
    track_uuid: str
    team_uuid: str

    title: str
    description: str | None = None

    repository_url: str | None = None
    demo_url: str | None = None
    video_url: str | None = None

    status: SubmissionStatus

    submitted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SubmissionListResponse(BaseModel):
    submissions: list[SubmissionResponse]


# ------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------


def _utcnow() -> datetime:
    """Return the current UTC time."""
    return datetime.now(UTC)

def _ensure_utc(value: datetime) -> datetime:
    """Normalize a datetime to timezone-aware UTC."""

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _submission_collection(db: Database[Any]) -> Any:
    return db["submissions"]


def _hackathon_collection(db: Database[Any]) -> Any:
    return db["hackathons"]


def _track_collection(db: Database[Any]) -> Any:
    return db["tracks"]


def _team_collection(db: Database[Any]) -> Any:
    return db["teams"]


def _team_member_collection(db: Database[Any]) -> Any:
    return db["team_members"]

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


def _get_track_by_uuid(
    *,
    track_uuid: str,
    hackathon_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Return a track belonging to the specified hackathon."""

    track = _track_collection(db).find_one(
        {
            "uuid": track_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    if track is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Track not found",
        )

    return track


def _get_team_by_uuid(
    *,
    team_uuid: str,
    hackathon_uuid: str,
    track_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Return a team belonging to the specified hackathon and track."""

    team = _team_collection(db).find_one(
        {
            "uuid": team_uuid,
            "hackathon_uuid": hackathon_uuid,
            "track_uuid": track_uuid,
        }
    )

    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    return team

def _require_team_membership(
    *,
    team_uuid: str,
    user_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Ensure the current user is an active member of the team."""

    membership = _team_member_collection(db).find_one(
        {
            "team_uuid": team_uuid,
            "user_uuid": user_uuid,
            "left_at": None,
        }
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this team",
        )

    return membership

def create_submission(
    payload: CreateSubmissionPayload,
    team_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> SubmissionResponse:
    """Create a draft submission for the current user's team."""

    hackathon = _get_hackathon_by_uuid(
        hackathon_uuid=payload.hackathon_uuid,
        db=db,
    )

    if hackathon.get("status") == "archived":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create a submission for an archived hackathon",
        )

    track = _get_track_by_uuid(
        track_uuid=payload.track_uuid,
        hackathon_uuid=payload.hackathon_uuid,
        db=db,
    )

    if track.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Track is not active",
        )

    team = _get_team_by_uuid(
        team_uuid=team_uuid,
        hackathon_uuid=payload.hackathon_uuid,
        track_uuid=payload.track_uuid,
        db=db,
    )

    _require_team_membership(
        team_uuid=team_uuid,
        user_uuid=current_user.uuid,
        db=db,
    )

    existing_submission = _submission_collection(db).find_one(
        {
            "team_uuid": team_uuid,
            "hackathon_uuid": payload.hackathon_uuid,
        }
    )

    if existing_submission is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A submission already exists for this team",
        )

    now = _utcnow()

    submission = Submission(
        uuid=str(uuid7()),
        hackathon_uuid=payload.hackathon_uuid,
        track_uuid=payload.track_uuid,
        team_uuid=team_uuid,
        title=payload.title,
        description=payload.description,
        repository_url=(
            str(payload.repository_url)
            if payload.repository_url is not None
            else None
        ),
        demo_url=(
            str(payload.demo_url)
            if payload.demo_url is not None
            else None
        ),
        video_url=(
            str(payload.video_url)
            if payload.video_url is not None
            else None
        ),
        status=SubmissionStatus.DRAFT,
        submitted_at=None,
        created_at=now,
        updated_at=now,
    )

    _submission_collection(db).insert_one(
        submission.model_dump()
    )

    return SubmissionResponse(
        uuid=submission.uuid,
        hackathon_uuid=submission.hackathon_uuid,
        track_uuid=submission.track_uuid,
        team_uuid=submission.team_uuid,
        title=submission.title,
        description=submission.description,
        repository_url=(
            str(submission.repository_url)
            if submission.repository_url is not None
            else None
        ),
        demo_url=(
            str(submission.demo_url)
            if submission.demo_url is not None
            else None
        ),
        video_url=(
            str(submission.video_url)
            if submission.video_url is not None
            else None
        ),
        status=submission.status,
        submitted_at=submission.submitted_at,
        created_at=submission.created_at,
        updated_at=submission.updated_at,
    )

def update_submission(
    submission_uuid: str,
    payload: UpdateSubmissionPayload,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> SubmissionResponse:
    """Update a draft submission belonging to the current user's team."""

    submission = _submission_collection(db).find_one(
        {"uuid": submission_uuid}
    )

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    if submission.get("status") != SubmissionStatus.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft submissions can be updated",
        )

    _require_team_membership(
        team_uuid=submission["team_uuid"],
        user_uuid=current_user.uuid,
        db=db,
    )

    update_data: dict[str, Any] = {
        "updated_at": _utcnow(),
    }

    if payload.title is not None:
        update_data["title"] = payload.title

    if payload.description is not None:
        update_data["description"] = payload.description

    if payload.repository_url is not None:
        update_data["repository_url"] = str(payload.repository_url)

    if payload.demo_url is not None:
        update_data["demo_url"] = str(payload.demo_url)

    if payload.video_url is not None:
        update_data["video_url"] = str(payload.video_url)

    _submission_collection(db).update_one(
        {"uuid": submission_uuid},
        {"$set": update_data},
    )

    updated_submission = _submission_collection(db).find_one(
        {"uuid": submission_uuid}
    )

    return SubmissionResponse(
        uuid=updated_submission["uuid"],
        hackathon_uuid=updated_submission["hackathon_uuid"],
        track_uuid=updated_submission["track_uuid"],
        team_uuid=updated_submission["team_uuid"],
        title=updated_submission["title"],
        description=updated_submission.get("description"),
        repository_url=updated_submission.get("repository_url"),
        demo_url=updated_submission.get("demo_url"),
        video_url=updated_submission.get("video_url"),
        status=SubmissionStatus(updated_submission["status"]),
        submitted_at=updated_submission.get("submitted_at"),
        created_at=updated_submission.get("created_at"),
        updated_at=updated_submission.get("updated_at"),
    )

def submit_submission(
    submission_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> SubmissionResponse:
    """Finalize a draft submission."""

    submission = _submission_collection(db).find_one(
        {"uuid": submission_uuid}
    )

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    if submission.get("status") != SubmissionStatus.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft submissions can be submitted",
        )

    _require_team_membership(
        team_uuid=submission["team_uuid"],
        user_uuid=current_user.uuid,
        db=db,
    )

    hackathon = _get_hackathon_by_uuid(
        hackathon_uuid=submission["hackathon_uuid"],
        db=db,
    )

    now = _utcnow()

    submission_deadline = _ensure_utc(
    hackathon["submission_deadline"]
)

    if now > submission_deadline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission deadline has passed",
        )

    updated_submission = _submission_collection(db).find_one_and_update(
        {
            "uuid": submission_uuid,
            "status": SubmissionStatus.DRAFT.value,
        },
        {
            "$set": {
                "status": SubmissionStatus.SUBMITTED.value,
                "submitted_at": now,
                "updated_at": now,
            }
        },
        return_document=True,
    )

    if updated_submission is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Submission could not be submitted",
        )

    return SubmissionResponse(
        uuid=updated_submission["uuid"],
        hackathon_uuid=updated_submission["hackathon_uuid"],
        track_uuid=updated_submission["track_uuid"],
        team_uuid=updated_submission["team_uuid"],
        title=updated_submission["title"],
        description=updated_submission.get("description"),
        repository_url=updated_submission.get("repository_url"),
        demo_url=updated_submission.get("demo_url"),
        video_url=updated_submission.get("video_url"),
        status=SubmissionStatus(updated_submission["status"]),
        submitted_at=updated_submission.get("submitted_at"),
        created_at=updated_submission.get("created_at"),
        updated_at=updated_submission.get("updated_at"),
    )

def list_my_submissions(
    hackathon_uuid: str | None = None,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> SubmissionListResponse:
    """List submissions belonging to teams the current user is a member of."""

    memberships = _team_member_collection(db).find(
        {
            "user_uuid": current_user.uuid,
            "left_at": None,
        },
        {
            "team_uuid": 1,
        },
    )

    team_uuids = [
        membership["team_uuid"]
        for membership in memberships
    ]

    if not team_uuids:
        return SubmissionListResponse(
            submissions=[]
        )

    query: dict[str, Any] = {
        "team_uuid": {
            "$in": team_uuids,
        }
    }

    if hackathon_uuid is not None:
        query["hackathon_uuid"] = hackathon_uuid

    submissions = _submission_collection(db).find(query)

    submission_items = [
        SubmissionResponse(
            uuid=submission["uuid"],
            hackathon_uuid=submission["hackathon_uuid"],
            track_uuid=submission["track_uuid"],
            team_uuid=submission["team_uuid"],
            title=submission["title"],
            description=submission.get("description"),
            repository_url=submission.get("repository_url"),
            demo_url=submission.get("demo_url"),
            video_url=submission.get("video_url"),
            status=SubmissionStatus(submission["status"]),
            submitted_at=submission.get("submitted_at"),
            created_at=submission.get("created_at"),
            updated_at=submission.get("updated_at"),
        )
        for submission in submissions
    ]

    return SubmissionListResponse(
        submissions=submission_items,
    )

def get_submission(
    submission_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> SubmissionResponse:
    """Get a submission belonging to the current user's active team."""

    submission = _submission_collection(db).find_one(
        {
            "uuid": submission_uuid,
        }
    )

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    _require_team_membership(
        team_uuid=submission["team_uuid"],
        user_uuid=current_user.uuid,
        db=db,
    )

    return SubmissionResponse(
        uuid=submission["uuid"],
        hackathon_uuid=submission["hackathon_uuid"],
        track_uuid=submission["track_uuid"],
        team_uuid=submission["team_uuid"],
        title=submission["title"],
        description=submission.get("description"),
        repository_url=submission.get("repository_url"),
        demo_url=submission.get("demo_url"),
        video_url=submission.get("video_url"),
        status=SubmissionStatus(submission["status"]),
        submitted_at=submission.get("submitted_at"),
        created_at=submission.get("created_at"),
        updated_at=submission.get("updated_at"),
    )
