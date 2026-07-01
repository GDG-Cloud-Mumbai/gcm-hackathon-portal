from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class JoinRequestStatus(str, Enum):
    PENDING = "pending"
    WAITLISTED = "waitlisted"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    ACCEPTED_ELSEWHERE = "accepted_elsewhere"


class TeamJoinRequest(BaseModel):
    _id: str | None = None

    # Team being requested
    team_uuid: str

    # User making the request
    user_uuid: str

    # Request status
    status: JoinRequestStatus = JoinRequestStatus.PENDING

    # Audit fields
    created_at: datetime | None = None
    updated_at: datetime | None = None