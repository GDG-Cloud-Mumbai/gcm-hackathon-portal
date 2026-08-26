from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class HackathonStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    REGISTRATION_OPEN = "registration_open"
    REGISTRATION_CLOSED = "registration_closed"
    ONGOING = "ongoing"
    JUDGING = "judging"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Hackathon(BaseModel):
    _id: str | None = None

    # Public identifier (UUIDv7)
    uuid: str

    # URL-friendly unique identifier (e.g. build-grow-ai-2027)
    slug: str

    # Basic information
    name: str
    description: str | None = None

    # Event timezone
    timezone: str = "Asia/Kolkata"

    # Lifecycle
    status: HackathonStatus = HackathonStatus.DRAFT

    # Registration timeline
    registration_start: datetime
    registration_end: datetime

    # Event timeline
    event_start: datetime
    event_end: datetime

    # Submission timeline
    submission_start: datetime
    submission_deadline: datetime

    # Team configuration
    min_team_size: int
    max_team_size: int

    allow_individual_registration: bool = False

    # Visibility
    is_public: bool = True

    # Audit fields
    created_at: datetime | None = None
    updated_at: datetime | None = None
