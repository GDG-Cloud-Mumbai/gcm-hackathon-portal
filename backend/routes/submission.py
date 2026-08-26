from fastapi import APIRouter

from handlers.submission import (
    SubmissionResponse,
    SubmissionListResponse,
    create_submission,
    update_submission,
    submit_submission,
    list_my_submissions,
    get_submission,
)


router = APIRouter(
    prefix="/participants/submissions",
    tags=["submissions"],
)


router.post(
    "/teams/{team_uuid}",
    response_model=SubmissionResponse,
)(create_submission)


router.patch(
    "/{submission_uuid}",
    response_model=SubmissionResponse,
)(update_submission)


router.post(
    "/{submission_uuid}/submit",
    response_model=SubmissionResponse,
)(submit_submission)


router.get(
    "",
    response_model=SubmissionListResponse,
)(list_my_submissions)


router.get(
    "/{submission_uuid}",
    response_model=SubmissionResponse,
)(get_submission)