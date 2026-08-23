from datetime import datetime
from enum import Enum

from pydantic import BaseModel
from uuid6 import uuid7


class EvaluationStatus(str, Enum):
    DRAFT = "draft"
    COMPLETED = "completed"


class CriterionScore(BaseModel):
    # Reference to the judging criterion being scored.
    criterion_uuid: str

    # Score given by the judge for this criterion.
    score: float


class Evaluation(BaseModel):
    _id: str | None = None

    # Public identifier.
    uuid: str

    # Parent references.
    hackathon_uuid: str
    submission_uuid: str
    judge_uuid: str

    # Individual scores for each judging criterion.
    criterion_scores: list[CriterionScore] = []

    # Automatically calculated total score.
    # This should normally be the sum of all criterion scores.
    score: float | None = None

    # Overall comments from the judge.
    feedback: str | None = None

    # Evaluation lifecycle.
    status: EvaluationStatus = EvaluationStatus.DRAFT

    # Audit fields.
    created_at: datetime | None = None
    updated_at: datetime | None = None
    completed_at: datetime | None = None