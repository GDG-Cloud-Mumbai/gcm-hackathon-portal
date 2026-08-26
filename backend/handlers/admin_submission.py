from datetime import datetime
from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database

from middlewares.auth import get_current_user
from models.user import UserPrivate
from utils.db import get_db


# ------------------------------------------------------------------
# Response Models
# ------------------------------------------------------------------


class AdminTrackSummaryResponse(BaseModel):
    """Track information associated with a submission."""

    uuid: str
    name: str
    description: str | None = None
    status: str


class AdminTeamSummaryResponse(BaseModel):
    """Team information associated with a submission."""

    uuid: str
    name: str
    leader_uuid: str
    is_public: bool
    required_skills: list[str]


class AdminSubmissionResponse(BaseModel):
    """Submission data exposed to administrators."""

    uuid: str
    hackathon_uuid: str

    # Keep the UUIDs so the frontend can use them for navigation
    # or additional API requests.
    track_uuid: str
    team_uuid: str

    title: str
    description: str | None = None

    repository_url: str | None = None
    demo_url: str | None = None
    video_url: str | None = None

    status: str

    # Related resources used for displaying readable information
    # in the admin dashboard.
    track: AdminTrackSummaryResponse | None = None
    team: AdminTeamSummaryResponse | None = None

    submitted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AdminSubmissionListResponse(BaseModel):
    """List response for administrator submissions."""

    submissions: list[AdminSubmissionResponse]


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _submission_collection(db: Database[Any]) -> Any:
    """Return the submissions collection."""

    return db["submissions"]


def _hackathon_collection(db: Database[Any]) -> Any:
    """Return the hackathons collection."""

    return db["hackathons"]


def _track_collection(db: Database[Any]) -> Any:
    """Return the tracks collection."""

    return db["tracks"]


def _team_collection(db: Database[Any]) -> Any:
    """Return the teams collection."""

    return db["teams"]


def _authorize_admin(current_user: UserPrivate) -> None:
    """Ensure that the current user has administrator privileges."""

    if current_user.global_role.name not in {
        "admin",
        "superadmin",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action",
        )


def _get_hackathon(
    *,
    hackathon_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Return a hackathon by UUID or raise 404."""

    hackathon = _hackathon_collection(db).find_one(
        {
            "uuid": hackathon_uuid,
        }
    )

    if hackathon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon not found",
        )

    return hackathon


def _get_track_summary(
    *,
    track_uuid: str,
    hackathon_uuid: str,
    db: Database[Any],
) -> AdminTrackSummaryResponse | None:
    """
    Return the track associated with a submission.

    The hackathon UUID is also checked so that a submission cannot
    accidentally expose a track belonging to another hackathon.
    """

    track = _track_collection(db).find_one(
        {
            "uuid": track_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    if track is None:
        return None

    return AdminTrackSummaryResponse(
        uuid=track["uuid"],
        name=track["name"],
        description=track.get("description"),
        status=track.get("status", "active"),
    )


def _get_team_summary(
    *,
    team_uuid: str,
    hackathon_uuid: str,
    db: Database[Any],
) -> AdminTeamSummaryResponse | None:
    """
    Return the team associated with a submission.

    The hackathon UUID is checked as an additional safety condition
    because team UUIDs should only be resolved within this hackathon.
    """

    team = _team_collection(db).find_one(
        {
            "uuid": team_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    if team is None:
        return None

    return AdminTeamSummaryResponse(
        uuid=team["uuid"],
        name=team["name"],
        leader_uuid=team["leader_uuid"],
        is_public=team.get("is_public", True),
        required_skills=team.get("required_skills", []),
    )


def _build_submission_response(
    submission: dict[str, Any],
    db: Database[Any],
) -> AdminSubmissionResponse:
    """Build an admin submission response with related resources."""

    hackathon_uuid = submission["hackathon_uuid"]
    track_uuid = submission["track_uuid"]
    team_uuid = submission["team_uuid"]

    # Resolve the related track so the admin dashboard can display
    # its name instead of only showing the UUID.
    track = _get_track_summary(
        track_uuid=track_uuid,
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    # Resolve the related team for the same reason.
    team = _get_team_summary(
        team_uuid=team_uuid,
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    return AdminSubmissionResponse(
        uuid=submission["uuid"],
        hackathon_uuid=hackathon_uuid,
        track_uuid=track_uuid,
        team_uuid=team_uuid,
        title=submission["title"],
        description=submission.get("description"),
        repository_url=submission.get("repository_url"),
        demo_url=submission.get("demo_url"),
        video_url=submission.get("video_url"),
        status=submission.get("status", "draft"),
        track=track,
        team=team,
        submitted_at=submission.get("submitted_at"),
        created_at=submission.get("created_at"),
        updated_at=submission.get("updated_at"),
    )


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------


def list_admin_submissions(
    hackathon_uuid: str,
    status: str | None = None,
    track_uuid: str | None = None,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> AdminSubmissionListResponse:
    """
    List submissions belonging to a hackathon.

    Administrators can optionally filter submissions by status
    and track.
    """

    _authorize_admin(current_user)

    # Make sure the requested hackathon exists before querying
    # its submissions.
    _get_hackathon(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    query: dict[str, Any] = {
        "hackathon_uuid": hackathon_uuid,
    }

    # Optional submission status filter.
    if status is not None:
        query["status"] = status

    # Optional track filter.
    if track_uuid is not None:
        query["track_uuid"] = track_uuid

    documents = _submission_collection(db).find(
        query
    ).sort(
        [
            ("submitted_at", -1),
            ("created_at", -1),
        ]
    )

    submissions = [
        _build_submission_response(
            submission=document,
            db=db,
        )
        for document in documents
    ]

    return AdminSubmissionListResponse(
        submissions=submissions,
    )


def get_admin_submission(
    hackathon_uuid: str,
    submission_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> AdminSubmissionResponse:
    """Get a single submission belonging to a hackathon."""

    _authorize_admin(current_user)

    # Verify that the hackathon exists.
    _get_hackathon(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

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

    return _build_submission_response(
        submission=submission,
        db=db,
    )