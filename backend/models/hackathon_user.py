from pydantic import BaseModel

from backend.models.hackathon import HackathonPublic
from backend.models.user import UserPublic


class Role(BaseModel):
    name: str

    def __init__(self, **data):
        super().__init__(**data)
        if self.name not in {
            "participant",
            "mentor",
            "organizer",
            "volunteer",
            "judge",
        }:
            raise ValueError("Invalid role name")


class HackathonUser(BaseModel):
    _id: str | None = None
    uuid: str
    hackathon_id: str
    user_id: str
    role: Role


class HackathonUserPublic(BaseModel):
    uuid: str
    hackathon: HackathonPublic
    role: Role
    user: UserPublic


class Team(BaseModel):
    _id: str | None = None
    uuid: str
    hackathon_id: str
    name: str
    is_banned: bool = False
    team_code: str
    # TODO: can only leader submit or everyone submit?
    member_ids: list[str]


class TeamPublic(BaseModel):
    uuid: str
    name: str
    is_banned: bool = False
    team_code: str
    members: list[UserPublic]
