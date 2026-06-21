from datetime import datetime
from pydantic import BaseModel


class Track(BaseModel):
    _id: str | None = None

    # Public identifier (UUIDv7)
    uuid: str

    # Parent hackathon UUID
    hackathon_uuid: str

    # Track details
    title: str
    description: str

    # Soft-disable support
    is_active: bool = True

    # Audit fields
    created_at: datetime | None = None
    updated_at: datetime | None = None