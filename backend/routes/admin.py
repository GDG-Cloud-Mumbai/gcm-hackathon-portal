from fastapi import APIRouter

from handlers.hackathon import (
    HackathonResponse,
    HackathonListResponse,
    HackathonDetailResponse,
    create_hackathon,
    list_hackathons,
    get_hackathon,
    publish_hackathon,
    open_registration,
    close_registration,
    start_hackathon,
    start_judging,
    complete_hackathon,
    archive_hackathon,
    restore_hackathon,

)

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)


@router.get("/ping")
def ping():
    return {
        "message": "admin route working",
    }


router.post(
    "/hackathons",
    response_model=HackathonResponse,
)(create_hackathon)


router.get(
    "/hackathons",
    response_model=HackathonListResponse,
)(list_hackathons)


router.get(
    "/hackathons/{hackathon_uuid}",
    response_model=HackathonDetailResponse,
)(get_hackathon)


router.post(
    "/hackathons/{hackathon_uuid}/publish",
    response_model=HackathonResponse,
)(publish_hackathon)

router.post(
    "/hackathons/{hackathon_uuid}/open-registration",
    response_model=HackathonResponse,
)(open_registration)


router.post(
    "/hackathons/{hackathon_uuid}/close-registration",
    response_model=HackathonResponse,
)(close_registration)


router.post(
    "/hackathons/{hackathon_uuid}/start",
    response_model=HackathonResponse,
)(start_hackathon)


router.post(
    "/hackathons/{hackathon_uuid}/start-judging",
    response_model=HackathonResponse,
)(start_judging)


router.post(
    "/hackathons/{hackathon_uuid}/complete",
    response_model=HackathonResponse,
)(complete_hackathon)


router.post(
    "/hackathons/{hackathon_uuid}/archive",
    response_model=HackathonResponse,
)(archive_hackathon)


router.post(
    "/hackathons/{hackathon_uuid}/restore",
    response_model=HackathonResponse,
)(restore_hackathon)