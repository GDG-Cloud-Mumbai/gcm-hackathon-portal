from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database
from uuid6 import uuid7

from middlewares.auth import get_current_user
from models.hackathon import HackathonStatus
from models.track import Track, TrackStatus
from models.user import UserPrivate
from utils.db import get_db


# ------------------------------------------------------------------
# Payload Models
# ------------------------------------------------------------------

class CreateTrackPayload(BaseModel):
    name: str
    description: str | None = None

class UpdateTrackPayload(BaseModel):
    name: str | None = None
    description: str | None = None

# ------------------------------------------------------------------
# Response Models
# ------------------------------------------------------------------

class TrackResponse(BaseModel):
    uuid: str
    hackathon_uuid: str
    name: str
    description: str | None = None
    status: TrackStatus

class TrackListResponse(BaseModel):
    tracks: list[TrackResponse]


# ------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------

def _utcnow() -> datetime:
    """Return the current UTC time."""
    return datetime.now(UTC)


def _track_collection(db: Database) -> Any:
    return db["tracks"]


def _hackathon_collection(db: Database) -> Any:
    return db["hackathons"]


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


def _get_track_by_uuid(
        *,
        track_uuid: str,
        hackathon_uuid: str,
        db: Database[Any],
    ) -> dict[str, Any]:
    """Return a track document by UUID."""

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


def _validate_unique_track_name(
    *,
    db: Database[Any],
    hackathon_uuid: str,
    name: str,
    exclude_track_uuid: str | None = None,
) -> None:
    """Ensure that a track name is unique within a hackathon."""

    name = name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Track name cannot be empty",
        )

    existing_track = _track_collection(db).find_one(
        {
            "hackathon_uuid": hackathon_uuid,
            "name": name,
        }
    )

    if (
        existing_track is not None
        and existing_track["uuid"] != exclude_track_uuid
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Track name already exists for this hackathon",
        )
    
    
def _build_track_response(track: Track) -> TrackResponse:
    """Build a public response model for a track."""
    return TrackResponse(
        uuid=track.uuid,
        hackathon_uuid=track.hackathon_uuid,
        name=track.name,
        description=track.description,
        status=track.status,
    )

def _build_track_from_document(
    document: dict[str, Any],
) -> Track:
    """Convert a MongoDB document into a Track model."""

    return Track(**document)


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------

async def create_track(
    hackathon_uuid: str,
    payload: CreateTrackPayload,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> TrackResponse:
    """Create a new track for a hackathon."""
    
    _authorize_admin(current_user)
    hackathon = _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    if hackathon["status"] == HackathonStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create tracks for an archived hackathon",
        )
    
    name = payload.name.strip()
    description = (
        payload.description.strip()
        if payload.description
        else None
    )

    _validate_unique_track_name(
        db=db,
        hackathon_uuid=hackathon_uuid,
        name=name,
    )

    now = _utcnow()

    track = Track(
        uuid=str(uuid7()),
        hackathon_uuid=hackathon_uuid,
        name=name,
        description=description,
        status=TrackStatus.ACTIVE,
        created_at=now,
        updated_at=now,
    )

    _track_collection(db).insert_one(
        track.model_dump(exclude={"_id"})
    )

    return _build_track_response(track)
    

async def list_tracks(
    hackathon_uuid: str,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> TrackListResponse:
    """List all tracks for a hackathon."""

    _authorize_admin(current_user)

    _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    documents = _track_collection(db).find(
        {
            "hackathon_uuid": hackathon_uuid,
        }
    )

    tracks = [
        _build_track_response(
            _build_track_from_document(document)
        )
        for document in documents
    ]

    return TrackListResponse(
        tracks=tracks,
    )


async def get_track(
    hackathon_uuid: str,
    track_uuid: str,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> TrackResponse:
    """Get a track by UUID."""

    _authorize_admin(current_user)

    _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    track_document = _get_track_by_uuid(
        track_uuid=track_uuid,
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    track = _build_track_from_document(track_document)

    return _build_track_response(track)


async def update_track(
    hackathon_uuid: str,
    track_uuid: str,
    payload: UpdateTrackPayload,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> TrackResponse:
    """Update an existing track."""

    _authorize_admin(current_user)

    _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    track_document = _get_track_by_uuid(
        track_uuid=track_uuid,
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    track = _build_track_from_document(track_document)

    name = (
        payload.name.strip()
        if payload.name is not None
        else track.name
    )

    description = (
        payload.description.strip()
        if payload.description is not None
        else track.description
    )

    _validate_unique_track_name(
        db=db,
        hackathon_uuid=hackathon_uuid,
        name=name,
        exclude_track_uuid=track.uuid,
    )
    
    track.name = name
    track.description = description
    track.updated_at = _utcnow()

    _track_collection(db).update_one(
        {
            "uuid": track.uuid,
        },
        {
            "$set": {
                "name": track.name,
                "description": track.description,
                "updated_at": track.updated_at,
            }
        },
    )
    
    return _build_track_response(track)


