from datetime import datetime

from pydantic import BaseModel, Field


class JudgingCriterion(BaseModel):
    _id: str | None = None

    # Public identifier (UUIDv7)
    uuid: str

    # Parent hackathon UUID
    hackathon_uuid: str

    # Criterion details
    name: str

    # Maximum points a judge can award for this criterion.
    max_score: float = Field(gt=0)

    # Allows an organizer to temporarily disable a criterion
    # without deleting it from the hackathon.
    is_active: bool = True

    # Audit fields
    created_at: datetime | None = None
    updated_at: datetime | None = None