from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class JudgeAssignmentStatus(str, Enum):
    ASSIGNED = "assigned"
    COMPLETED = "completed"
    EXPIRED = "expired"
    REASSIGNED = "reassigned"


class JudgeAssignment(BaseModel):
    _id: str | None = None

    # Public identifier
    uuid: str

    # Relationships
    hackathon_uuid: str
    judge_uuid: str
    submission_uuid: str

    # Assignment lifecycle
    status: JudgeAssignmentStatus = JudgeAssignmentStatus.ASSIGNED

    # Audit fields
    created_at: datetime | None = None
    updated_at: datetime | None = None
    completed_at: datetime | None = None