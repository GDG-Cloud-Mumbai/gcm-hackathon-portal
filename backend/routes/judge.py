from fastapi import APIRouter

from handlers.judge import (
    CreateEvaluationPayload,
    EvaluationResponse,
    JudgeAssignmentDetailResponse,
    JudgeAssignmentListResponse,
    get_evaluation,
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


# List all assignments belonging to the current judge.
router.get(
    "/assignments",
    response_model=JudgeAssignmentListResponse,
)(list_judge_assignments)


# Get a specific assignment and its submission details.
router.get(
    "/assignments/{assignment_uuid}",
    response_model=JudgeAssignmentDetailResponse,
)(get_judge_assignment)


# ------------------------------------------------------------------
# Evaluation Endpoints
# ------------------------------------------------------------------


# Submit a completed evaluation for an assignment.
router.post(
    "/assignments/{assignment_uuid}/evaluation",
    response_model=EvaluationResponse,
)(submit_evaluation)


# Get the evaluation submitted for a specific assignment.
router.get(
    "/assignments/{assignment_uuid}/evaluation",
    response_model=EvaluationResponse,
)(get_evaluation)