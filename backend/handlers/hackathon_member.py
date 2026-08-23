from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database
from uuid6 import uuid7

from middlewares.auth import get_current_user
from models.hackathon_member import HackathonMember, HackathonMemberRole
from models.user import UserPrivate
from utils.db import get_db


# ------------------------------------------------------------------
# Payload Models
# ------------------------------------------------------------------


class CreateHackathonMemberPayload(BaseModel):
    user_uuid: str
    role: HackathonMemberRole


class UpdateHackathonMemberPayload(BaseModel):
    role: HackathonMemberRole


# ------------------------------------------------------------------
# Response Models
# ------------------------------------------------------------------


class HackathonMemberResponse(BaseModel):
    uuid: str
    hackathon_uuid: str
    user_uuid: str
    role: HackathonMemberRole


class HackathonMemberListResponse(BaseModel):
    members: list[HackathonMemberResponse]


# ------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------


def _utcnow() -> datetime:
    """Return the current UTC timestamp."""
    return datetime.now(UTC)


def _member_collection(db: Database[Any]) -> Any:
    """Return the hackathon members collection."""
    return db["hackathon_members"]


def _hackathon_collection(db: Database[Any]) -> Any:
    """Return the hackathons collection."""
    return db["hackathons"]


def _user_collection(db: Database[Any]) -> Any:
    """Return the users collection."""
    return db["users"]


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


def _get_user_by_uuid(
    *,
    user_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Return a user document by UUID."""

    user = _user_collection(db).find_one(
        {"uuid": user_uuid}
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


def _get_member_by_uuid(
    *,
    member_uuid: str,
    hackathon_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Return a hackathon member by UUID."""

    member = _member_collection(db).find_one(
        {
            "uuid": member_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon member not found",
        )

    return member


def _get_existing_membership(
    *,
    hackathon_uuid: str,
    user_uuid: str,
    db: Database[Any],
) -> dict[str, Any] | None:
    """Find an existing membership for a user in a hackathon."""

    return _member_collection(db).find_one(
        {
            "hackathon_uuid": hackathon_uuid,
            "user_uuid": user_uuid,
        }
    )


def _build_member_response(
    member: HackathonMember,
) -> HackathonMemberResponse:
    """Build a public response model."""

    return HackathonMemberResponse(
        uuid=member.uuid,
        hackathon_uuid=member.hackathon_uuid,
        user_uuid=member.user_uuid,
        role=member.role,
    )


def _build_member_from_document(
    document: dict[str, Any],
) -> HackathonMember:
    """Convert a MongoDB document into a HackathonMember model."""

    return HackathonMember(**document)


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------


async def create_hackathon_member(
    hackathon_uuid: str,
    payload: CreateHackathonMemberPayload,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> HackathonMemberResponse:
    """Add a user to a hackathon with a specific role."""

    _authorize_admin(current_user)

    _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    _get_user_by_uuid(
        user_uuid=payload.user_uuid,
        db=db,
    )

    existing_member = _get_existing_membership(
        hackathon_uuid=hackathon_uuid,
        user_uuid=payload.user_uuid,
        db=db,
    )

    if existing_member is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this hackathon",
        )

    now = _utcnow()

    member = HackathonMember(
        uuid=str(uuid7()),
        hackathon_uuid=hackathon_uuid,
        user_uuid=payload.user_uuid,
        role=payload.role,
        created_at=now,
        updated_at=now,
    )

    _member_collection(db).insert_one(
        member.model_dump(exclude={"_id"})
    )

    return _build_member_response(member)


async def list_hackathon_members(
    hackathon_uuid: str,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> HackathonMemberListResponse:
    """List all members of a hackathon."""

    _authorize_admin(current_user)

    _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    members = _member_collection(db).find(
        {
            "hackathon_uuid": hackathon_uuid,
        }
    )

    member_items = [
        _build_member_response(
            _build_member_from_document(member)
        )
        for member in members
    ]

    return HackathonMemberListResponse(
        members=member_items,
    )


async def update_hackathon_member(
    hackathon_uuid: str,
    member_uuid: str,
    payload: UpdateHackathonMemberPayload,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> HackathonMemberResponse:
    """Update a hackathon member's role."""

    _authorize_admin(current_user)

    member = _get_member_by_uuid(
        member_uuid=member_uuid,
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    now = _utcnow()

    _member_collection(db).update_one(
        {
            "uuid": member_uuid,
            "hackathon_uuid": hackathon_uuid,
        },
        {
            "$set": {
                "role": payload.role.value,
                "updated_at": now,
            }
        },
    )

    member["role"] = payload.role.value
    member["updated_at"] = now

    return _build_member_response(
        _build_member_from_document(member)
    )


async def delete_hackathon_member(
    hackathon_uuid: str,
    member_uuid: str,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> dict[str, str]:
    """Remove a user from a hackathon."""

    _authorize_admin(current_user)

    _get_member_by_uuid(
        member_uuid=member_uuid,
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    _member_collection(db).delete_one(
        {
            "uuid": member_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    return {
        "message": "Hackathon member removed successfully"
    }