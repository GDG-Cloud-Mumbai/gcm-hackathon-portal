from datetime import UTC, datetime
from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database
from uuid6 import uuid7

from middlewares.auth import get_current_user
from models.hackathon import HackathonStatus
from models.judging_criteria import JudgingCriterion
from models.user import UserPrivate
from utils.db import get_db


# ------------------------------------------------------------------
# Payload Models
# ------------------------------------------------------------------


class CreateJudgingCriterionPayload(BaseModel):
    # Name displayed to judges.
    name: str

    # Maximum number of points available for this criterion.
    max_score: float


class UpdateJudgingCriterionPayload(BaseModel):
    # Both fields are optional because this is a PATCH endpoint.
    name: str | None = None
    max_score: float | None = None
    is_active: bool | None = None


# ------------------------------------------------------------------
# Response Models
# ------------------------------------------------------------------


class JudgingCriterionResponse(BaseModel):
    uuid: str
    hackathon_uuid: str
    name: str
    max_score: float
    is_active: bool


class JudgingCriterionListResponse(BaseModel):
    criteria: list[JudgingCriterionResponse]


# ------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------


def _utcnow() -> datetime:
    """Return the current UTC time."""
    return datetime.now(UTC)


def _criterion_collection(db: Database[Any]) -> Any:
    """Return the judging criteria collection."""
    return db["judging_criteria"]


def _hackathon_collection(db: Database[Any]) -> Any:
    """Return the hackathons collection."""
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


def _get_criterion_by_uuid(
    *,
    criterion_uuid: str,
    hackathon_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Return a judging criterion belonging to the hackathon."""

    criterion = _criterion_collection(db).find_one(
        {
            "uuid": criterion_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    if criterion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Judging criterion not found",
        )

    return criterion


def _validate_criterion_name(
    *,
    db: Database[Any],
    hackathon_uuid: str,
    name: str,
    exclude_criterion_uuid: str | None = None,
) -> None:
    """Ensure that a criterion name is unique within a hackathon."""

    name = name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Criterion name cannot be empty",
        )

    existing_criterion = _criterion_collection(db).find_one(
        {
            "hackathon_uuid": hackathon_uuid,
            "name": name,
        }
    )

    if (
        existing_criterion is not None
        and existing_criterion["uuid"] != exclude_criterion_uuid
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Judging criterion already exists for this hackathon",
        )


def _validate_max_score(max_score: float) -> None:
    """Ensure that a criterion has a valid maximum score."""

    if max_score <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum score must be greater than zero",
        )


def _build_criterion_response(
    criterion: JudgingCriterion,
) -> JudgingCriterionResponse:
    """Build a public response model for a judging criterion."""

    return JudgingCriterionResponse(
        uuid=criterion.uuid,
        hackathon_uuid=criterion.hackathon_uuid,
        name=criterion.name,
        max_score=criterion.max_score,
        is_active=criterion.is_active,
    )


def _build_criterion_from_document(
    document: dict[str, Any],
) -> JudgingCriterion:
    """Convert a MongoDB document into a JudgingCriterion model."""

    return JudgingCriterion(**document)


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------


async def create_judging_criterion(
    hackathon_uuid: str,
    payload: CreateJudgingCriterionPayload,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> JudgingCriterionResponse:
    """Create a judging criterion for a hackathon."""

    # Only administrators can configure judging criteria.
    _authorize_admin(current_user)

    # Make sure the parent hackathon exists.
    hackathon = _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    # Archived hackathons should not be modified.
    if hackathon["status"] == HackathonStatus.ARCHIVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create judging criteria for an archived hackathon",
        )

    name = payload.name.strip()

    _validate_criterion_name(
        db=db,
        hackathon_uuid=hackathon_uuid,
        name=name,
    )

    _validate_max_score(payload.max_score)

    now = _utcnow()

    criterion = JudgingCriterion(
        uuid=str(uuid7()),
        hackathon_uuid=hackathon_uuid,
        name=name,
        max_score=payload.max_score,
        is_active=True,
        created_at=now,
        updated_at=now,
    )

    _criterion_collection(db).insert_one(
        criterion.model_dump(exclude={"_id"})
    )

    return _build_criterion_response(criterion)


async def list_judging_criteria(
    hackathon_uuid: str,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> JudgingCriterionListResponse:
    """List all judging criteria for a hackathon."""

    # Only administrators can manage judging configuration.
    _authorize_admin(current_user)

    # Make sure the parent hackathon exists.
    _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    documents = _criterion_collection(db).find(
        {
            "hackathon_uuid": hackathon_uuid,
        }
    )

    criteria = [
        _build_criterion_response(
            _build_criterion_from_document(document)
        )
        for document in documents
    ]

    return JudgingCriterionListResponse(
        criteria=criteria,
    )


async def update_judging_criterion(
    hackathon_uuid: str,
    criterion_uuid: str,
    payload: UpdateJudgingCriterionPayload,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> JudgingCriterionResponse:
    """Update an existing judging criterion."""

    # Only administrators can modify judging criteria.
    _authorize_admin(current_user)

    # Make sure the parent hackathon exists.
    _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    criterion_document = _get_criterion_by_uuid(
        criterion_uuid=criterion_uuid,
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    criterion = _build_criterion_from_document(
        criterion_document
    )

    # Keep the existing name when the request does not provide one.
    name = (
        payload.name.strip()
        if payload.name is not None
        else criterion.name
    )

    # Keep the existing score when the request does not provide one.
    max_score = (
        payload.max_score
        if payload.max_score is not None
        else criterion.max_score
    )

    # Keep the existing active state when it is not provided.
    is_active = (
        payload.is_active
        if payload.is_active is not None
        else criterion.is_active
    )

    _validate_criterion_name(
        db=db,
        hackathon_uuid=hackathon_uuid,
        name=name,
        exclude_criterion_uuid=criterion.uuid,
    )

    _validate_max_score(max_score)

    criterion.name = name
    criterion.max_score = max_score
    criterion.is_active = is_active
    criterion.updated_at = _utcnow()

    _criterion_collection(db).update_one(
        {
            "uuid": criterion.uuid,
            "hackathon_uuid": hackathon_uuid,
        },
        {
            "$set": {
                "name": criterion.name,
                "max_score": criterion.max_score,
                "is_active": criterion.is_active,
                "updated_at": criterion.updated_at,
            }
        },
    )

    return _build_criterion_response(criterion)


async def delete_judging_criterion(
    hackathon_uuid: str,
    criterion_uuid: str,
    db: Database[Any] = Depends(get_db),
    current_user: UserPrivate = Depends(get_current_user),
) -> dict[str, str]:
    """Delete a judging criterion from a hackathon."""

    # Only administrators can delete judging criteria.
    _authorize_admin(current_user)

    # Make sure the parent hackathon exists.
    _get_hackathon_by_uuid(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    # Make sure the criterion exists before deleting it.
    _get_criterion_by_uuid(
        criterion_uuid=criterion_uuid,
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    _criterion_collection(db).delete_one(
        {
            "uuid": criterion_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    return {
        "message": "Judging criterion deleted successfully",
    }