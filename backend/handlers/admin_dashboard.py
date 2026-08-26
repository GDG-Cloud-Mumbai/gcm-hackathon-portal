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


class AdminDashboardHackathonResponse(BaseModel):
    """Basic hackathon information shown on the admin dashboard."""

    uuid: str
    name: str
    status: str


class AdminDashboardParticipantsResponse(BaseModel):
    """Participant metrics for the hackathon."""

    total: int


class AdminDashboardTeamsResponse(BaseModel):
    """Team metrics for the hackathon."""

    total: int


class AdminDashboardSubmissionsResponse(BaseModel):
    """Submission metrics for the hackathon."""

    total: int
    draft: int
    submitted: int


class AdminDashboardTrackResponse(BaseModel):
    """Team and submission metrics for one track."""

    uuid: str
    name: str
    teams: int
    submissions: int


class AdminDashboardJudgingResponse(BaseModel):
    """Judging progress metrics for the hackathon."""

    assignments: int
    completed: int
    pending: int


class AdminDashboardResponse(BaseModel):
    """Complete dashboard summary for a hackathon."""

    hackathon: AdminDashboardHackathonResponse
    participants: AdminDashboardParticipantsResponse
    teams: AdminDashboardTeamsResponse
    submissions: AdminDashboardSubmissionsResponse
    submission_rate: float
    tracks: list[AdminDashboardTrackResponse]
    judging: AdminDashboardJudgingResponse


# ------------------------------------------------------------------
# Collection Helpers
# ------------------------------------------------------------------


def _hackathon_collection(db: Database[Any]) -> Any:
    """Return the hackathons collection."""

    return db["hackathons"]


def _team_collection(db: Database[Any]) -> Any:
    """Return the teams collection."""

    return db["teams"]


def _team_member_collection(db: Database[Any]) -> Any:
    """Return the team membership collection."""

    return db["team_members"]


def _submission_collection(db: Database[Any]) -> Any:
    """Return the submissions collection."""

    return db["submissions"]


def _track_collection(db: Database[Any]) -> Any:
    """Return the tracks collection."""

    return db["tracks"]


def _judge_assignment_collection(db: Database[Any]) -> Any:
    """Return the judge assignments collection."""

    return db["judge_assignments"]


# ------------------------------------------------------------------
# Authorization / Validation Helpers
# ------------------------------------------------------------------


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


# ------------------------------------------------------------------
# Metric Helpers
# ------------------------------------------------------------------


def _get_active_participant_count(
    *,
    hackathon_uuid: str,
    db: Database[Any],
) -> int:
    """
    Count unique active participants in a hackathon.

    Participants are determined from active team memberships
    belonging to teams in this hackathon.

    A membership with left_at == null represents an active
    membership. Distinct user UUIDs are counted so a participant
    belonging to multiple teams is only counted once.
    """

    teams = _team_collection(db).find(
        {
            "hackathon_uuid": hackathon_uuid,
        },
        {
            "uuid": 1,
        },
    )

    team_uuids = [
        team["uuid"]
        for team in teams
    ]

    if not team_uuids:
        return 0

    pipeline = [
        {
            "$match": {
                "team_uuid": {
                    "$in": team_uuids,
                },
                "left_at": None,
            }
        },
        {
            "$group": {
                "_id": "$user_uuid",
            }
        },
        {
            "$count": "total",
        },
    ]

    result = list(
        _team_member_collection(db).aggregate(pipeline)
    )

    if not result:
        return 0

    return int(result[0]["total"])


def _get_submission_metrics(
    *,
    hackathon_uuid: str,
    db: Database[Any],
) -> AdminDashboardSubmissionsResponse:
    """Calculate submission counts for the hackathon."""

    collection = _submission_collection(db)

    total = collection.count_documents(
        {
            "hackathon_uuid": hackathon_uuid,
        }
    )

    draft = collection.count_documents(
        {
            "hackathon_uuid": hackathon_uuid,
            "status": "draft",
        }
    )

    submitted = collection.count_documents(
        {
            "hackathon_uuid": hackathon_uuid,
            "status": "submitted",
        }
    )

    return AdminDashboardSubmissionsResponse(
        total=total,
        draft=draft,
        submitted=submitted,
    )


def _get_track_metrics(
    *,
    hackathon_uuid: str,
    db: Database[Any],
) -> list[AdminDashboardTrackResponse]:
    """
    Calculate team and submission counts for every track.

    Tracks are read from the tracks collection so the dashboard
    also shows tracks that currently have zero teams or submissions.
    """

    tracks = list(
        _track_collection(db).find(
            {
                "hackathon_uuid": hackathon_uuid,
            }
        )
    )

    responses: list[AdminDashboardTrackResponse] = []

    for track in tracks:
        track_uuid = track["uuid"]

        team_count = _team_collection(db).count_documents(
            {
                "hackathon_uuid": hackathon_uuid,
                "track_uuid": track_uuid,
            }
        )

        submission_count = _submission_collection(db).count_documents(
            {
                "hackathon_uuid": hackathon_uuid,
                "track_uuid": track_uuid,
            }
        )

        responses.append(
            AdminDashboardTrackResponse(
                uuid=track_uuid,
                name=track["name"],
                teams=team_count,
                submissions=submission_count,
            )
        )

    return responses


def _get_judging_metrics(
    *,
    hackathon_uuid: str,
    db: Database[Any],
) -> AdminDashboardJudgingResponse:
    """Calculate judge assignment completion metrics."""

    collection = _judge_assignment_collection(db)

    assignments = collection.count_documents(
        {
            "hackathon_uuid": hackathon_uuid,
        }
    )

    completed = collection.count_documents(
        {
            "hackathon_uuid": hackathon_uuid,
            "status": "completed",
        }
    )

    pending = collection.count_documents(
        {
            "hackathon_uuid": hackathon_uuid,
            "status": {
                "$ne": "completed",
            },
        }
    )

    return AdminDashboardJudgingResponse(
        assignments=assignments,
        completed=completed,
        pending=pending,
    )


# ------------------------------------------------------------------
# Dashboard Endpoint
# ------------------------------------------------------------------


def get_admin_dashboard(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> AdminDashboardResponse:
    """
    Return the dashboard metrics for a hackathon.

    This endpoint is intentionally aggregated so the admin
    frontend can load the main dashboard with a single request.
    """

    _authorize_admin(current_user)

    hackathon = _get_hackathon(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    # Count teams directly from the teams collection.
    team_count = _team_collection(db).count_documents(
        {
            "hackathon_uuid": hackathon_uuid,
        }
    )

    # Calculate unique active participants from team memberships.
    participant_count = _get_active_participant_count(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    submission_metrics = _get_submission_metrics(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    # Submission rate is based on teams that have submitted.
    #
    # Using teams rather than participants avoids inflating the
    # percentage when a team contains multiple members.
    submission_rate = (
        (
            submission_metrics.submitted
            / team_count
        )
        * 100
        if team_count > 0
        else 0.0
    )

    track_metrics = _get_track_metrics(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    judging_metrics = _get_judging_metrics(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    return AdminDashboardResponse(
        hackathon=AdminDashboardHackathonResponse(
            uuid=hackathon["uuid"],
            name=hackathon["name"],
            status=hackathon.get("status", "draft"),
        ),
        participants=AdminDashboardParticipantsResponse(
            total=participant_count,
        ),
        teams=AdminDashboardTeamsResponse(
            total=team_count,
        ),
        submissions=submission_metrics,
        submission_rate=round(
            submission_rate,
            2,
        ),
        tracks=track_metrics,
        judging=judging_metrics,
    )