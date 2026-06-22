import random
import string
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, Field
from pymongo.database import Database
from uuid6 import uuid7

from middlewares.auth import get_current_user
from models.user import UserPrivate
from utils.db import get_db


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_team_code(length: int = 6) -> str:
    return "".join(
        random.choices(
            string.ascii_uppercase + string.digits,
            k=length,
        )
    )


class CreateTeamPayload(BaseModel):
    hackathon_uuid: str
    track_uuid: str

    name: str
    description: str | None = None

    is_public: bool = True
    required_skills: list[str] = Field(default_factory=list)


class TeamResponse(BaseModel):
    uuid: str
    name: str
    team_code: str


def create_team(
    payload: CreateTeamPayload,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> TeamResponse:
    team_name = payload.name.strip()

    if not team_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Team name cannot be empty",
        )

    # Ensure user is not already part of a team in this hackathon.
    active_memberships = db.team_members.find(
        {
            "user_uuid": current_user.uuid,
            "left_at": None,
        }
    )

    for membership in active_memberships:
        existing_team = db.teams.find_one(
            {"uuid": membership["team_uuid"]}
        )

        if (
            existing_team
            and existing_team.get("hackathon_uuid")
            == payload.hackathon_uuid
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already part of a team in this hackathon",
            )

    # Generate unique team code.
    while True:
        team_code = _generate_team_code()

        existing = db.teams.find_one(
            {"team_code": team_code}
        )

        if existing is None:
            break

    now = _utcnow()
    team_uuid = str(uuid7())

    db.teams.insert_one(
        {
            "uuid": team_uuid,
            "hackathon_uuid": payload.hackathon_uuid,
            "track_uuid": payload.track_uuid,
            "leader_uuid": current_user.uuid,
            "name": team_name,
            "description": payload.description,
            "team_code": team_code,
            "is_public": payload.is_public,
            "required_skills": payload.required_skills,
            "created_at": now,
            "updated_at": now,
        }
    )

    db.team_members.insert_one(
        {
            "team_uuid": team_uuid,
            "user_uuid": current_user.uuid,
            "joined_at": now,
            "left_at": None,
        }
    )

    return TeamResponse(
        uuid=team_uuid,
        name=team_name,
        team_code=team_code,
    )

