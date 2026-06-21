from datetime import datetime
from pydantic import BaseModel


class TeamMember(BaseModel):
    _id: str | None = None

    # Parent references
    team_uuid: str
    user_uuid: str

    # Membership lifecycle
    joined_at: datetime | None = None
    left_at: datetime | None = None