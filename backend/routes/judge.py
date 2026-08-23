from fastapi import APIRouter

from handlers.judge import (
    CreateEvaluationPayload,
    EvaluationResponse,
    JudgeAssignmentDetailResponse,
    JudgeAssignmentListResponse,
    get_judge_assignment,
    list_judge_assignments,
    submit_evaluation,
)


router = APIRouter(
    prefix="/judge",
    tags=["judge"],
)


# ------------------------------------------------------------------
# Assignment Endpoints
# ------------------------------------------------------------------


router.get(
    "/assignments",
    response_model=JudgeAssignmentListResponse,
)(list_judge_assignments)


router.get(
    "/assignments/{assignment_uuid}",
    response_model=JudgeAssignmentDetailResponse,
)(get_judge_assignment)


# ------------------------------------------------------------------
# Evaluation Endpoints
# ------------------------------------------------------------------


router.post(
    "/assignments/{assignment_uuid}/evaluation",
    response_model=EvaluationResponse,
)(submit_evaluation)