from datetime import datetime
from pydantic import BaseModel, EmailStr
from backend.models.user import UserPublic


class Hackathon(BaseModel):
    _id: str
    uuid: str
    title: str
    subtitle: str | None = None
    description: str
    start_date: datetime
    end_date: datetime
    location: str
    contact_email: EmailStr
    max_team_size: int
    host_id: str


class HackathonPublic(BaseModel):
    uuid: str
    title: str
    subtitle: str | None = None
    description: str
    start_time: datetime
    end_time: datetime
    location: str
    contact_email: EmailStr
    max_team_size: int
    host: UserPublic
