from fastapi import APIRouter

from handlers.participant import (
    TeamResponse,
    create_team,
)

router = APIRouter(
    prefix="/participants",
    tags=["participants"],
)


@router.get("/ping")
def ping():
    return {"message": "participants route working"}


router.post(
    "/teams",
    response_model=TeamResponse,
)(create_team)

