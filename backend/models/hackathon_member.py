from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class HackathonMemberRole(str, Enum):
    PARTICIPANT = "participant"
    MENTOR = "mentor"
    ORGANIZER = "organizer"
    VOLUNTEER = "volunteer"
    JUDGE = "judge"


class HackathonMember(BaseModel):
    _id: str | None = None

    # Public identifier
    uuid: str

    # Relationships
    hackathon_uuid: str
    user_uuid: str

    # Hackathon-scoped role
    role: HackathonMemberRole

    # Audit fields
    created_at: datetime | None = None
    updated_at: datetime | None = None