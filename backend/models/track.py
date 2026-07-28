from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class TrackStatus(str, Enum):
    ACTIVE = "active"
    DISABLED = "disabled"
    ARCHIVED = "archived"


class Track(BaseModel):
    _id: str | None = None

    # Public identifier (UUIDv7)
    uuid: str

    # Parent hackathon UUID
    hackathon_uuid: str

    # Track details
    name: str
    description: str

    # Lifecycle
    status: TrackStatus = TrackStatus.ACTIVE

    # Audit fields
    created_at: datetime | None = None
    updated_at: datetime | None = None
