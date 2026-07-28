"""
Hackathon Management

Responsibilities
----------------
- Create hackathons
- Update hackathons
- Manage hackathon lifecycle
- Validate hackathon timelines
- Configure hackathon settings
"""

from datetime import UTC, datetime
import re
from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database
from uuid6 import uuid7

from middlewares.auth import get_current_user
from models.hackathon import Hackathon, HackathonStatus
from models.user import UserPrivate
from utils.db import get_db


# ------------------------------------------------------------------
# Payload Models
# ------------------------------------------------------------------


class CreateHackathonPayload(BaseModel):
    # Basic information
    name: str
    description: str | None = None

    # Branding
    logo_url: str | None = None
    banner_url: str | None = None

    # Event timezone
    timezone: str = "Asia/Kolkata"

    # Registration timeline
    registration_start: datetime
    registration_end: datetime

    # Event timeline
    event_start: datetime
    event_end: datetime

    # Submission timeline
    submission_start: datetime
    submission_deadline: datetime

    # Team configuration
    min_team_size: int
    max_team_size: int

    allow_individual_registration: bool = False

    # Visibility
    is_public: bool = True


# ------------------------------------------------------------------
# Response Models
# ------------------------------------------------------------------

class HackathonResponse(BaseModel):
    uuid: str
    slug: str
    name: str
    status: HackathonStatus


class HackathonListItem(BaseModel):
    uuid: str
    slug: str
    name: str

    status: HackathonStatus

    registration_start: datetime
    registration_end: datetime

    event_start: datetime
    event_end: datetime

    is_public: bool


class HackathonListResponse(BaseModel):
    hackathons: list[HackathonListItem]


class HackathonDetailResponse(BaseModel):
    uuid: str
    slug: str

    name: str
    description: str | None = None

    logo_url: str | None = None
    banner_url: str | None = None

    timezone: str

    status: HackathonStatus

    registration_start: datetime
    registration_end: datetime

    event_start: datetime
    event_end: datetime

    submission_start: datetime
    submission_deadline: datetime

    min_team_size: int
    max_team_size: int

    allow_individual_registration: bool

    is_public: bool

    created_at: datetime | None = None
    updated_at: datetime | None = None


# ------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------


def _utcnow() -> datetime:

    """Return the current UTC timestamp."""

    return datetime.utcnow()


def _hackathon_collection(
    db: Database[Any],
):
    """Return the hackathons collection."""

    return db.hackathons


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


def _validate_slug_format(slug: str) -> None:
    """Validate slug format."""

    if not re.fullmatch(r"[a-z0-9-]+", slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Slug may only contain lowercase letters, "
                "numbers and hyphens"
            ),
        )


def _validate_timeline(
    *,
    registration_start: datetime,
    registration_end: datetime,
    event_start: datetime,
    event_end: datetime,
    submission_start: datetime,
    submission_deadline: datetime,
) -> None:
    """Validate hackathon timeline."""

    if registration_start >= registration_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration start must be before registration end",
        )

    if event_start >= event_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event start must be before event end",
        )

    if registration_end > event_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration must end before the event starts",
        )

    if submission_start > submission_deadline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission start must be before submission deadline",
        )

    if submission_deadline > event_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission deadline cannot be after the event ends",
        )


def _validate_team_configuration(
    *,
    min_team_size: int,
    max_team_size: int,
) -> None:
    """Validate team configuration."""

    if min_team_size < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum team size must be at least one",
        )

    if min_team_size > max_team_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum team size cannot exceed maximum team size",
        )


def _generate_unique_slug(
    *,
    name: str,
    db: Database[Any],
) -> str:
    """Generate a unique slug for a hackathon."""

    base_slug = _generate_slug(name)
    slug = base_slug

    counter = 2

    while _hackathon_collection(db).find_one({"slug": slug}):
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug


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

_ALLOWED_STATUS_TRANSITIONS = {
    HackathonStatus.DRAFT: {
        HackathonStatus.PUBLISHED,
    },
    HackathonStatus.PUBLISHED: {
        HackathonStatus.REGISTRATION_OPEN,
    },
    HackathonStatus.REGISTRATION_OPEN: {
        HackathonStatus.REGISTRATION_CLOSED,
    },
    HackathonStatus.REGISTRATION_CLOSED: {
        HackathonStatus.ONGOING,
    },
    HackathonStatus.ONGOING: {
        HackathonStatus.JUDGING,
    },
    HackathonStatus.JUDGING: {
        HackathonStatus.COMPLETED,
    },
    HackathonStatus.COMPLETED: set(),
}

def _validate_status_transition(
    *,
    current_status: HackathonStatus,
    target_status: HackathonStatus,
) -> None:
    """Validate whether a status transition is allowed."""

    allowed = _ALLOWED_STATUS_TRANSITIONS[current_status]

    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot transition hackathon from "
                f"{current_status.value} to {target_status.value}"
            ),
        )
    
def _transition_hackathon_status(
    *,
    hackathon_uuid: str,
    target_status: HackathonStatus,
    db: Database[Any],
) -> dict[str, Any]:
    """Transition a hackathon to a new lifecycle state."""

    hackathon = _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    current_status = HackathonStatus(hackathon["status"])

    _validate_status_transition(
        current_status=current_status,
        target_status=target_status,
    )

    now = _utcnow()

    update_fields = {
        "status": target_status.value,
        "updated_at": now,
    }

    
    _hackathon_collection(db).update_one(
        {"uuid": hackathon_uuid},
        {
            "$set": update_fields,
        },
    )

    hackathon["status"] = target_status.value
    hackathon["updated_at"] = now

    return hackathon


def _archive_hackathon(
    *,
    hackathon_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Archive a hackathon from any lifecycle state."""

    hackathon = _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    current_status = HackathonStatus(hackathon["status"])

    if current_status == HackathonStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hackathon is already archived",
        )

    now = _utcnow()

    _hackathon_collection(db).update_one(
        {"uuid": hackathon_uuid},
        {
            "$set": {
                "status": HackathonStatus.ARCHIVED.value,
                "archived_from_status": current_status.value,
                "updated_at": now,
            }
        },
    )

    hackathon["status"] = HackathonStatus.ARCHIVED.value
    hackathon["archived_from_status"] = current_status.value
    hackathon["updated_at"] = now

    return hackathon    


def restore_hackathon(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> HackathonResponse:
    """Restore an archived hackathon."""

    _authorize_admin(current_user)

    hackathon = _restore_hackathon(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    return _build_hackathon_response(hackathon)


def _restore_hackathon(
    *,
    hackathon_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Restore an archived hackathon."""

    hackathon = _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    if hackathon["status"] != HackathonStatus.ARCHIVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hackathon is not archived",
        )

    previous_status = hackathon.get("archived_from_status")

    if previous_status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archived hackathon cannot be restored",
        )

    now = _utcnow()

    _hackathon_collection(db).update_one(
        {"uuid": hackathon_uuid},
        {
            "$set": {
                "status": previous_status,
                "updated_at": now,
            },
            "$unset": {
                "archived_from_status": "",
            },
        },
    )

    hackathon["status"] = previous_status
    hackathon["updated_at"] = now
    hackathon.pop("archived_from_status", None)

    return hackathon


def _build_hackathon_response(
    hackathon: dict[str, Any],
) -> HackathonResponse:
    """Build a standard hackathon response."""

    return HackathonResponse(
        uuid=hackathon["uuid"],
        slug=hackathon["slug"],
        name=hackathon["name"],
        status=HackathonStatus(hackathon["status"]),
    )

def _generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from the hackathon name."""

    slug = name.lower()

    slug = re.sub(
        r"[^a-z0-9]+",
        "-",
        slug,
    )

    return slug.strip("-")


# ------------------------------------------------------------------
# Business Logic
# ------------------------------------------------------------------


def create_hackathon(
    payload: CreateHackathonPayload,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> HackathonResponse:
    """Create a new hackathon."""

    _authorize_admin(current_user)

    slug = _generate_unique_slug(
    name=payload.name,
    db=db,
    )

    _validate_timeline(
        registration_start=payload.registration_start,
        registration_end=payload.registration_end,
        event_start=payload.event_start,
        event_end=payload.event_end,
        submission_start=payload.submission_start,
        submission_deadline=payload.submission_deadline,
    )

    _validate_team_configuration(
        min_team_size=payload.min_team_size,
        max_team_size=payload.max_team_size,
    )


    hackathon_uuid = str(uuid7())
    now = _utcnow()

    hackathon = Hackathon(
        uuid=hackathon_uuid,
        slug=slug,
        name=payload.name,
        description=payload.description,
        logo_url=payload.logo_url,
        banner_url=payload.banner_url,
        timezone=payload.timezone,
        status=HackathonStatus.DRAFT,
        archived_from_status=None,
        registration_start=payload.registration_start,
        registration_end=payload.registration_end,
        event_start=payload.event_start,
        event_end=payload.event_end,
        submission_start=payload.submission_start,
        submission_deadline=payload.submission_deadline,
        min_team_size=payload.min_team_size,
        max_team_size=payload.max_team_size,
        allow_individual_registration=payload.allow_individual_registration,
        is_public=payload.is_public,
        created_at=now,
        updated_at=now,
    )

    _hackathon_collection(db).insert_one(
    hackathon.model_dump()
    )

    return HackathonResponse(
        uuid=hackathon.uuid,
        slug=hackathon.slug,
        name=hackathon.name,
        status=hackathon.status,
    )



def list_hackathons(
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> HackathonListResponse:
    """List all hackathons."""

    _authorize_admin(current_user)

    hackathons = []

    for document in _hackathon_collection(db).find():
        hackathons.append(
            HackathonListItem(
                uuid=document["uuid"],
                slug=document["slug"],
                name=document["name"],
                status=document["status"],
                registration_start=document["registration_start"],
                registration_end=document["registration_end"],
                event_start=document["event_start"],
                event_end=document["event_end"],
                is_public=document["is_public"],
            )
        )

    return HackathonListResponse(
        hackathons=hackathons,
    )



def get_hackathon(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> HackathonDetailResponse:
    """Get a hackathon by UUID."""

    _authorize_admin(current_user)

    hackathon = _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    return HackathonDetailResponse(
        **hackathon
    )

def open_registration(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> HackathonResponse:
    """Open hackathon registration."""

    _authorize_admin(current_user)

    hackathon = _transition_hackathon_status(
        hackathon_uuid=hackathon_uuid,
        target_status=HackathonStatus.REGISTRATION_OPEN,
        db=db,
    )

    return _build_hackathon_response(hackathon)

def close_registration(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> HackathonResponse:
    """Close hackathon registration."""

    _authorize_admin(current_user)

    hackathon = _transition_hackathon_status(
        hackathon_uuid=hackathon_uuid,
        target_status=HackathonStatus.REGISTRATION_CLOSED,
        db=db,
    )

    return _build_hackathon_response(hackathon)

def start_hackathon(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> HackathonResponse:
    """Start a hackathon."""

    _authorize_admin(current_user)

    hackathon = _transition_hackathon_status(
        hackathon_uuid=hackathon_uuid,
        target_status=HackathonStatus.ONGOING,
        db=db,
    )

    return _build_hackathon_response(hackathon)

def start_judging(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> HackathonResponse:
    """Start judging."""

    _authorize_admin(current_user)

    hackathon = _transition_hackathon_status(
        hackathon_uuid=hackathon_uuid,
        target_status=HackathonStatus.JUDGING,
        db=db,
    )

    return _build_hackathon_response(hackathon)

def complete_hackathon(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> HackathonResponse:
    """Complete a hackathon."""

    _authorize_admin(current_user)

    hackathon = _transition_hackathon_status(
        hackathon_uuid=hackathon_uuid,
        target_status=HackathonStatus.COMPLETED,
        db=db,
    )

    return _build_hackathon_response(hackathon)

def archive_hackathon(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> HackathonResponse:
    """Archive a hackathon."""

    _authorize_admin(current_user)

    hackathon = _archive_hackathon(
    hackathon_uuid=hackathon_uuid,
    db=db,
)

    return _build_hackathon_response(hackathon)

# ------------------------------------------------------------------
# Lifecycle
# ------------------------------------------------------------------


def publish_hackathon(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> HackathonResponse:
    """Publish a draft hackathon."""

    _authorize_admin(current_user)

    hackathon = _transition_hackathon_status(
        hackathon_uuid=hackathon_uuid,
        target_status=HackathonStatus.PUBLISHED,
        db=db,
    )

    return _build_hackathon_response(hackathon)