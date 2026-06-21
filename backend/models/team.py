from datetime import datetime
from pydantic import BaseModel, Field


class Team(BaseModel):
    _id: str | None = None

    # Public identifier (UUIDv7)
    uuid: str

    # Parent references
    hackathon_uuid: str
    track_uuid: str

    # Team leader UUID
    leader_uuid: str

    # Team details
    name: str
    description: str | None = None

    # Invite code
    team_code: str

    # Visibility
    is_public: bool = True

    # Recruitment requirements
    required_skills: list[str] = Field(default_factory=list)

    # Audit fields
    created_at: datetime | None = None
    updated_at: datetime | None = None