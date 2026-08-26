from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database

from middlewares.auth import get_current_user
from models.hackathon_member import HackathonMemberRole
from models.user import UserPrivate
from utils.db import get_db


# ------------------------------------------------------------------
# Response Models
# ------------------------------------------------------------------


class AdminJudgeWorkloadResponse(BaseModel):
    """Judge workload information for administrators."""

    uuid: str
    name: str | None = None
    email: str

    assignments: int
    completed: int
    pending: int


class AdminJudgeWorkloadListResponse(BaseModel):
    """List of judge workload information."""

    judges: list[AdminJudgeWorkloadResponse]


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _hackathon_collection(db: Database[Any]) -> Any:
    return db["hackathons"]


def _hackathon_member_collection(db: Database[Any]) -> Any:
    return db["hackathon_members"]


def _user_collection(db: Database[Any]) -> Any:
    return db["users"]


def _assignment_collection(db: Database[Any]) -> Any:
    return db["judge_assignments"]


def _authorize_admin(current_user: UserPrivate) -> None:
    if current_user.global_role.name not in {
        "admin",
        "superadmin",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action",
        )


# ------------------------------------------------------------------
# Endpoint
# ------------------------------------------------------------------


def list_admin_judges(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> AdminJudgeWorkloadListResponse:
    """List judges for a hackathon with assignment workload."""

    _authorize_admin(current_user)

    hackathon = _hackathon_collection(db).find_one(
        {
            "uuid": hackathon_uuid,
        }
    )

    if hackathon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hackathon not found",
        )

    memberships = _hackathon_member_collection(db).find(
        {
            "hackathon_uuid": hackathon_uuid,
            "role": HackathonMemberRole.JUDGE.value,
        }
    )

    judges: list[AdminJudgeWorkloadResponse] = []

    for membership in memberships:
        judge_uuid = membership["user_uuid"]

        user = _user_collection(db).find_one(
            {
                "uuid": judge_uuid,
            }
        )

        if user is None:
            continue

        assignments = _assignment_collection(db).find(
            {
                "hackathon_uuid": hackathon_uuid,
                "judge_uuid": judge_uuid,
            }
        )

        assignment_documents = list(assignments)

        completed = sum(
            1
            for assignment in assignment_documents
            if assignment.get("status") == "completed"
        )

        total = len(assignment_documents)

        judges.append(
            AdminJudgeWorkloadResponse(
                uuid=user["uuid"],
                name=user.get("name"),
                email=user.get("email", ""),
                assignments=total,
                completed=completed,
                pending=total - completed,
            )
        )

    judges.sort(
        key=lambda judge: judge.name or judge.email
    )

    return AdminJudgeWorkloadListResponse(
        judges=judges,
    )