from datetime import datetime
from enum import Enum
from pydantic import BaseModel


class TeamInvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    ACCEPTED_ELSEWHERE = "accepted_elsewhere"


class TeamInvitation(BaseModel):
    _id: str | None = None

    team_uuid: str
    user_uuid: str

    status: TeamInvitationStatus = TeamInvitationStatus.PENDING

    created_at: datetime | None = None
    updated_at: datetime | None = None