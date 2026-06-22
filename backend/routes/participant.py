from fastapi import APIRouter

from handlers.participant import (
    TeamResponse,
    JoinRequestResponse,
    JoinRequestItem,
    RequestActionResponse,
    create_team,
    join_team,
    list_join_requests,
    approve_join_request,
    reject_join_request,
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


# Create a join request for a team.
router.post(
    "/teams/{team_uuid}/join",
    response_model=JoinRequestResponse,
)(join_team)


# List pending join requests for a team.
router.get(
    "/teams/{team_uuid}/join-requests",
    response_model=list[JoinRequestItem],
)(list_join_requests)


# Approve a join request.
router.post(
    "/join-requests/{request_id}/approve",
    response_model=RequestActionResponse,
)(approve_join_request)


# Reject a join request.
router.post(
    "/join-requests/{request_id}/reject",
    response_model=RequestActionResponse,
)(reject_join_request)