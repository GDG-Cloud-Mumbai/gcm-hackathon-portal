from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database
from uuid6 import uuid7

from middlewares.auth import get_current_user
from models.judge_assignment import JudgeAssignment
from models.user import UserPrivate
from utils.db import get_db

from datetime import datetime

# ------------------------------------------------------------------
# Response Models
# ------------------------------------------------------------------


class JudgeAssignmentResponse(BaseModel):
    uuid: str
    hackathon_uuid: str
    judge_uuid: str
    submission_uuid: str
    status: str


class JudgeAssignmentListResponse(BaseModel):
    assignments: list[JudgeAssignmentResponse]


class JudgeSubmissionResponse(BaseModel):
    uuid: str
    hackathon_uuid: str
    track_uuid: str
    team_uuid: str

    title: str
    description: str | None = None

    repository_url: str | None = None
    demo_url: str | None = None
    video_url: str | None = None

    status: str
    submitted_at: Any | None = None


class JudgeAssignmentDetailResponse(BaseModel):
    assignment: JudgeAssignmentResponse
    submission: JudgeSubmissionResponse


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _assignment_collection(db: Database[Any]) -> Any:
    return db["judge_assignments"]


def _hackathon_member_collection(db: Database[Any]) -> Any:
    return db["hackathon_members"]


def _submission_collection(db: Database[Any]) -> Any:
    return db["submissions"]


def _ensure_judge(
    *,
    hackathon_uuid: str,
    user_uuid: str,
    db: Database[Any],
) -> None:
    """Ensure the current user is a judge for this hackathon."""

    member = _hackathon_member_collection(db).find_one(
        {
            "hackathon_uuid": hackathon_uuid,
            "user_uuid": user_uuid,
            "role": "judge",
        }
    )

    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a judge for this hackathon",
        )


def _build_assignment_response(
    assignment: JudgeAssignment,
) -> JudgeAssignmentResponse:
    return JudgeAssignmentResponse(
        uuid=assignment.uuid,
        hackathon_uuid=assignment.hackathon_uuid,
        judge_uuid=assignment.judge_uuid,
        submission_uuid=assignment.submission_uuid,
        status=assignment.status.value,
    )


def _build_assignment_from_document(
    document: dict[str, Any],
) -> JudgeAssignment:
    return JudgeAssignment(**document)


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------


def list_judge_assignments(
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> JudgeAssignmentListResponse:
    """List assignments belonging to the current judge."""

    assignments = list(
        _assignment_collection(db).find(
            {
                "judge_uuid": current_user.uuid,
            }
        )
    )

    responses: list[JudgeAssignmentResponse] = []

    for document in assignments:
        assignment = _build_assignment_from_document(document)

        # Only expose assignments where the user is actually
        # registered as a judge for that hackathon.
        _ensure_judge(
            hackathon_uuid=assignment.hackathon_uuid,
            user_uuid=current_user.uuid,
            db=db,
        )

        responses.append(
            _build_assignment_response(assignment)
        )

    return JudgeAssignmentListResponse(
        assignments=responses,
    )


def get_judge_assignment(
    assignment_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> JudgeAssignmentDetailResponse:
    """Get an assigned submission for the current judge."""

    assignment_document = _assignment_collection(db).find_one(
        {
            "uuid": assignment_uuid,
        }
    )

    if assignment_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Judge assignment not found",
        )

    assignment = _build_assignment_from_document(
        assignment_document
    )

    # Prevent a judge from accessing another judge's assignment.
    if assignment.judge_uuid != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this submission",
        )

    # Make sure the user is still a judge for this hackathon.
    _ensure_judge(
        hackathon_uuid=assignment.hackathon_uuid,
        user_uuid=current_user.uuid,
        db=db,
    )

    submission_document = _submission_collection(db).find_one(
        {
            "uuid": assignment.submission_uuid,
            "hackathon_uuid": assignment.hackathon_uuid,
        }
    )

    if submission_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    submission = JudgeSubmissionResponse(
        uuid=submission_document["uuid"],
        hackathon_uuid=submission_document["hackathon_uuid"],
        track_uuid=submission_document["track_uuid"],
        team_uuid=submission_document["team_uuid"],
        title=submission_document["title"],
        description=submission_document.get("description"),
        repository_url=submission_document.get("repository_url"),
        demo_url=submission_document.get("demo_url"),
        video_url=submission_document.get("video_url"),
        status=submission_document.get("status", "draft"),
        submitted_at=submission_document.get("submitted_at"),
    )

    return JudgeAssignmentDetailResponse(
        assignment=_build_assignment_response(assignment),
        submission=submission,
    )


# ------------------------------------------------------------------
# Evaluation Payload Models
# ------------------------------------------------------------------

class CriterionScorePayload(BaseModel):
    # The judging criterion being scored.
    criterion_uuid: str

    # Score given by the judge for this criterion.
    score: float


class CreateEvaluationPayload(BaseModel):
    # Individual scores provided for each judging criterion.
    scores: list[CriterionScorePayload]

    # Optional overall feedback from the judge.
    feedback: str | None = None


# ------------------------------------------------------------------
# Evaluation Response Models
# ------------------------------------------------------------------

class EvaluationCriterionScoreResponse(BaseModel):
    # Criterion reference.
    criterion_uuid: str

    # Score given by the judge.
    score: float


class EvaluationResponse(BaseModel):
    # Public identifier.
    uuid: str

    # Parent references.
    hackathon_uuid: str
    assignment_uuid: str
    submission_uuid: str
    judge_uuid: str

    # Individual criterion scores.
    criterion_scores: list[EvaluationCriterionScoreResponse]

    # Automatically calculated total score.
    score: float | None = None

    # Overall judge feedback.
    feedback: str | None = None

    # Evaluation lifecycle.
    status: str

    # Audit fields.
    created_at: Any | None = None
    updated_at: Any | None = None
    completed_at: Any | None = None

# ------------------------------------------------------------------
# Evaluation Helpers
# ------------------------------------------------------------------

def _criterion_collection(db: Database[Any]) -> Any:
    # Return the judging criteria collection.
    return db["judging_criteria"]


def _get_active_criteria(
    *,
    hackathon_uuid: str,
    db: Database[Any],
) -> list[dict[str, Any]]:
    # Only active criteria configured for this hackathon
    # can be used during evaluation.
    return list(
        _criterion_collection(db).find(
            {
                "hackathon_uuid": hackathon_uuid,
                "is_active": True,
            }
        )
    )

def _evaluation_collection(db: Database[Any]) -> Any:
    # Return the evaluations collection.
    return db["evaluations"]


# ------------------------------------------------------------------
# Evaluation Helpers
# ------------------------------------------------------------------

def _get_evaluation_by_assignment(
    *,
    assignment: JudgeAssignment,
    db: Database[Any],
) -> dict[str, Any] | None:
    """
    Find the evaluation belonging to a specific judge assignment.

    assignment_uuid is the direct relationship between an evaluation
    and the assignment that produced it.
    """
    return _evaluation_collection(db).find_one(
        {
            "assignment_uuid": assignment.uuid,
        }
    )


def _build_evaluation_response(
    evaluation: dict[str, Any],
) -> EvaluationResponse:
    """
    Convert a MongoDB evaluation document into the public API response.
    """

    # Convert the stored criterion score documents into Pydantic
    # response objects.
    criterion_scores = [
        EvaluationCriterionScoreResponse(
            criterion_uuid=item["criterion_uuid"],
            score=item["score"],
        )
        for item in evaluation.get("criterion_scores", [])
    ]

    return EvaluationResponse(
        uuid=evaluation["uuid"],
        hackathon_uuid=evaluation["hackathon_uuid"],
        assignment_uuid=evaluation["assignment_uuid"],
        submission_uuid=evaluation["submission_uuid"],
        judge_uuid=evaluation["judge_uuid"],
        criterion_scores=criterion_scores,
        score=evaluation.get("score"),
        feedback=evaluation.get("feedback"),
        status=evaluation.get("status", "draft"),
        created_at=evaluation.get("created_at"),
        updated_at=evaluation.get("updated_at"),
        completed_at=evaluation.get("completed_at"),
    )


# ------------------------------------------------------------------
# Judge Evaluation Endpoint
# ------------------------------------------------------------------

def submit_evaluation(
    assignment_uuid: str,
    payload: CreateEvaluationPayload,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> EvaluationResponse:
    """
    Submit a completed evaluation for a judge assignment.

    The judge must own the assignment and must still be
    registered as a judge for the hackathon.
    """

    # --------------------------------------------------------------
    # Find the assignment
    # --------------------------------------------------------------

    assignment_document = _assignment_collection(db).find_one(
        {
            "uuid": assignment_uuid,
        }
    )

    if assignment_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Judge assignment not found",
        )

    assignment = _build_assignment_from_document(
        assignment_document
    )

    # --------------------------------------------------------------
    # Authorization
    # --------------------------------------------------------------

    # A judge can only evaluate submissions assigned to them.
    if assignment.judge_uuid != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this submission",
        )

    # The judge must still be registered as a judge
    # for this hackathon.
    _ensure_judge(
        hackathon_uuid=assignment.hackathon_uuid,
        user_uuid=current_user.uuid,
        db=db,
    )

    # --------------------------------------------------------------
    # Assignment validation
    # --------------------------------------------------------------

    # A completed assignment cannot be evaluated again.
    if assignment.status.value == "completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This judge assignment has already been completed",
        )

    # --------------------------------------------------------------
    # Submission validation
    # --------------------------------------------------------------

    submission_document = _submission_collection(db).find_one(
        {
            "uuid": assignment.submission_uuid,
            "hackathon_uuid": assignment.hackathon_uuid,
        }
    )

    if submission_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Judges should only evaluate finalized submissions.
    if submission_document.get("status") != "submitted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only submitted submissions can be evaluated",
        )

    # --------------------------------------------------------------
    # Prevent duplicate evaluations
    # --------------------------------------------------------------

    existing_evaluation = _get_evaluation_by_assignment(
        assignment=assignment,
        db=db,
    )

    if existing_evaluation is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An evaluation already exists for this submission",
        )

    # --------------------------------------------------------------
    # Load judging criteria
    # --------------------------------------------------------------

    criteria = _get_active_criteria(
        hackathon_uuid=assignment.hackathon_uuid,
        db=db,
    )

    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active judging criteria configured",
        )

    # Create a lookup table so we can quickly validate
    # the criterion UUID sent by the judge.
    criteria_by_uuid = {
        criterion["uuid"]: criterion
        for criterion in criteria
    }



    # --------------------------------------------------------------
    # Validate submitted criterion scores
    # --------------------------------------------------------------

    submitted_criterion_uuids = [
        item.criterion_uuid
        for item in payload.scores
    ]

    # Do not allow the same criterion to be scored twice.
    if len(submitted_criterion_uuids) != len(
        set(submitted_criterion_uuids)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A judging criterion cannot be scored more than once",
        )

    # Every active criterion must receive a score.
    expected_criterion_uuids = set(criteria_by_uuid.keys())
    submitted_criterion_uuid_set = set(
        submitted_criterion_uuids
    )

    missing_criteria = (
        expected_criterion_uuids
        - submitted_criterion_uuid_set
    )

    if missing_criteria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All active judging criteria must be scored",
        )

    # Do not allow the judge to submit criteria that
    # do not belong to this hackathon.
    unknown_criteria = (
        submitted_criterion_uuid_set
        - expected_criterion_uuids
    )

    if unknown_criteria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid judging criterion",
        )

    # --------------------------------------------------------------
    # Validate individual scores and calculate total
    # --------------------------------------------------------------

    criterion_scores: list[dict[str, Any]] = []
    total_score = 0.0

    for item in payload.scores:
        criterion = criteria_by_uuid[item.criterion_uuid]
        max_score = float(criterion["max_score"])

        # Each criterion has its own maximum score.
        if item.score < 0 or item.score > max_score:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Score for '{criterion['name']}' "
                    f"must be between 0 and {max_score}"
                ),
            )

        criterion_scores.append(
            {
                "criterion_uuid": item.criterion_uuid,
                "score": item.score,
            }
        )

        total_score += item.score

    # --------------------------------------------------------------
    # Create evaluation
    # --------------------------------------------------------------

    now = datetime.now()

    evaluation = {
    # Generate a unique public identifier for the evaluation.
    "uuid": str(uuid7()),

    # Link the evaluation to the hackathon.
    "hackathon_uuid": assignment.hackathon_uuid,

    # Link the evaluation directly to the judge assignment.
    "assignment_uuid": assignment.uuid,

    # Link the evaluation to the submitted project.
    "submission_uuid": assignment.submission_uuid,

    # Store the judge who performed the evaluation.
    "judge_uuid": current_user.uuid,

    # Store the individual criterion scores.
    "criterion_scores": criterion_scores,

    # Store the automatically calculated total score.
    "score": total_score,

    # Store optional feedback from the judge.
    "feedback": (
        payload.feedback.strip()
        if payload.feedback
        else None
    ),

    # Mark the evaluation as completed.
    "status": "completed",

    # Store audit timestamps.
    "created_at": now,
    "updated_at": now,
    "completed_at": now,
}

    _evaluation_collection(db).insert_one(evaluation)

    # --------------------------------------------------------------
    # Complete the assignment
    # --------------------------------------------------------------

    _assignment_collection(db).update_one(
        {
            "uuid": assignment.uuid,
            "hackathon_uuid": assignment.hackathon_uuid,
        },
        {
            "$set": {
                "status": "completed",
                "updated_at": now,
                "completed_at": now,
            }
        },
    )

    return _build_evaluation_response(evaluation)

# ------------------------------------------------------------------
# Get Judge Evaluation Endpoint
# ------------------------------------------------------------------

def get_evaluation(
    assignment_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> EvaluationResponse:
    """
    Get the evaluation for a judge assignment.

    A judge can only view the evaluation belonging to their own
    assignment.
    """

    # --------------------------------------------------------------
    # Find the assignment
    # --------------------------------------------------------------

    assignment_document = _assignment_collection(db).find_one(
        {
            "uuid": assignment_uuid,
        }
    )

    if assignment_document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Judge assignment not found",
        )

    assignment = _build_assignment_from_document(
        assignment_document
    )

    # --------------------------------------------------------------
    # Authorization
    # --------------------------------------------------------------

    # Prevent a judge from viewing another judge's assignment.
    if assignment.judge_uuid != current_user.uuid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this submission",
        )

    # Make sure the user is still registered as a judge
    # for this hackathon.
    _ensure_judge(
        hackathon_uuid=assignment.hackathon_uuid,
        user_uuid=current_user.uuid,
        db=db,
    )

    # --------------------------------------------------------------
    # Find the evaluation
    # --------------------------------------------------------------

    evaluation = _get_evaluation_by_assignment(
        assignment=assignment,
        db=db,
    )

    # An assignment can exist before the judge has submitted
    # their evaluation.
    if evaluation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found",
        )

    # --------------------------------------------------------------
    # Return the evaluation
    # --------------------------------------------------------------

    return _build_evaluation_response(evaluation)

