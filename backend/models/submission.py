from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class SubmissionStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"


class Submission(BaseModel):
    _id: str | None = None

    # Public identifier
    uuid: str

    # Parent references
    hackathon_uuid: str
    track_uuid: str
    team_uuid: str

    # Submission details
    title: str
    description: str | None = None

    # Project links
    repository_url: str | None = None
    demo_url: str | None = None
    video_url: str | None = None

    # Lifecycle
    status: SubmissionStatus = SubmissionStatus.DRAFT

    # Audit fields
    submitted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None