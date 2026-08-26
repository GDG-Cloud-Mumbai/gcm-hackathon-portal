from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel
from pymongo.database import Database

from middlewares.auth import get_current_user
from models.user import UserPrivate
from utils.db import get_db


# ------------------------------------------------------------------
# Response Models
# ------------------------------------------------------------------


class AdminJudgingSummaryResponse(BaseModel):
    """Overall judging progress for a hackathon."""

    assignments: int
    completed: int
    pending: int
    average_score: float | None = None


class AdminJudgeResponse(BaseModel):
    """Judge information shown to administrators."""

    uuid: str
    name: str | None = None
    email: str


class AdminJudgingSubmissionResponse(BaseModel):
    """Submission information associated with a judge assignment."""

    uuid: str
    title: str
    team_uuid: str
    team_name: str | None = None
    track_uuid: str
    track_name: str | None = None


class AdminCriterionScoreResponse(BaseModel):
    """A single criterion score given by a judge."""

    criterion_uuid: str
    criterion_name: str
    score: float
    max_score: float


class AdminJudgingEvaluationResponse(BaseModel):
    """Detailed judging information for one assignment."""

    assignment_uuid: str

    judge: AdminJudgeResponse

    submission: AdminJudgingSubmissionResponse

    status: str

    score: float | None = None

    criterion_scores: list[AdminCriterionScoreResponse] = []

    feedback: str | None = None


class AdminJudgingResponse(BaseModel):
    """Complete judging dashboard response."""

    summary: AdminJudgingSummaryResponse

    evaluations: list[AdminJudgingEvaluationResponse]


# ------------------------------------------------------------------
# Collection Helpers
# ------------------------------------------------------------------


def _assignment_collection(db: Database[Any]) -> Any:
    """Return the judge assignments collection."""

    return db["judge_assignments"]


def _evaluation_collection(db: Database[Any]) -> Any:
    """Return the evaluations collection."""

    return db["evaluations"]


def _user_collection(db: Database[Any]) -> Any:
    """Return the users collection."""

    return db["users"]


def _submission_collection(db: Database[Any]) -> Any:
    """Return the submissions collection."""

    return db["submissions"]


def _team_collection(db: Database[Any]) -> Any:
    """Return the teams collection."""

    return db["teams"]


def _track_collection(db: Database[Any]) -> Any:
    """Return the tracks collection."""

    return db["tracks"]


def _criterion_collection(db: Database[Any]) -> Any:
    """Return the judging criteria collection."""

    return db["judging_criteria"]


def _hackathon_collection(db: Database[Any]) -> Any:
    """Return the hackathons collection."""

    return db["hackathons"]


# ------------------------------------------------------------------
# Authorization / Validation
# ------------------------------------------------------------------


def _authorize_admin(current_user: UserPrivate) -> None:
    """Ensure that the current user has administrator privileges."""

    if current_user.global_role.name not in {
        "admin",
        "superadmin",
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action",
        )


def _get_hackathon(
    *,
    hackathon_uuid: str,
    db: Database[Any],
) -> dict[str, Any]:
    """Return a hackathon by UUID or raise 404."""

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

    return hackathon


# ------------------------------------------------------------------
# Related Resource Helpers
# ------------------------------------------------------------------


def _get_judge(
    *,
    judge_uuid: str,
    db: Database[Any],
) -> AdminJudgeResponse:
    """Build the judge information for an assignment."""

    judge = _user_collection(db).find_one(
        {
            "uuid": judge_uuid,
        }
    )

    if judge is None:
        return AdminJudgeResponse(
            uuid=judge_uuid,
            name=None,
            email="",
        )

    return AdminJudgeResponse(
        uuid=judge["uuid"],
        name=judge.get("name"),
        email=judge.get("email", ""),
    )


def _get_submission(
    *,
    submission_uuid: str,
    hackathon_uuid: str,
    db: Database[Any],
) -> AdminJudgingSubmissionResponse:
    """Build submission, team, and track information."""

    submission = _submission_collection(db).find_one(
        {
            "uuid": submission_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    if submission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    team_uuid = submission["team_uuid"]
    track_uuid = submission["track_uuid"]

    team = _team_collection(db).find_one(
        {
            "uuid": team_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    track = _track_collection(db).find_one(
        {
            "uuid": track_uuid,
            "hackathon_uuid": hackathon_uuid,
        }
    )

    return AdminJudgingSubmissionResponse(
        uuid=submission["uuid"],
        title=submission["title"],
        team_uuid=team_uuid,
        team_name=(
            team.get("name")
            if team is not None
            else None
        ),
        track_uuid=track_uuid,
        track_name=(
            track.get("name")
            if track is not None
            else None
        ),
    )


# ------------------------------------------------------------------
# Criterion Helpers
# ------------------------------------------------------------------


def _build_criterion_scores(
    *,
    evaluation: dict[str, Any],
    hackathon_uuid: str,
    db: Database[Any],
) -> list[AdminCriterionScoreResponse]:
    """
    Resolve criterion UUIDs in an evaluation into readable
    criterion information.
    """

    criterion_scores: list[
        AdminCriterionScoreResponse
    ] = []

    for criterion_score in evaluation.get(
        "criterion_scores",
        [],
    ):
        criterion_uuid = criterion_score[
            "criterion_uuid"
        ]

        criterion = _criterion_collection(db).find_one(
            {
                "uuid": criterion_uuid,
                "hackathon_uuid": hackathon_uuid,
            }
        )

        if criterion is None:
            continue

        criterion_scores.append(
            AdminCriterionScoreResponse(
                criterion_uuid=criterion_uuid,
                criterion_name=criterion["name"],
                score=criterion_score["score"],
                max_score=criterion["max_score"],
            )
        )

    return criterion_scores


# ------------------------------------------------------------------
# Endpoint
# ------------------------------------------------------------------


def get_admin_judging(
    hackathon_uuid: str,
    current_user: UserPrivate = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> AdminJudgingResponse:
    """
    Return judging assignments and evaluation details for a
    hackathon.

    Assignments without an evaluation are returned as pending.
    Completed evaluations include their overall score,
    criterion-level scores, and feedback.
    """

    _authorize_admin(current_user)

    _get_hackathon(
        hackathon_uuid=hackathon_uuid,
        db=db,
    )

    # --------------------------------------------------------------
    # Load all assignments for the hackathon
    # --------------------------------------------------------------

    assignments = list(
        _assignment_collection(db).find(
            {
                "hackathon_uuid": hackathon_uuid,
            }
        )
    )

    responses: list[
        AdminJudgingEvaluationResponse
    ] = []

    completed_count = 0
    total_score = 0.0
    scored_evaluations = 0

    # --------------------------------------------------------------
    # Build detailed assignment information
    # --------------------------------------------------------------

    for assignment in assignments:
        assignment_uuid = assignment["uuid"]
        judge_uuid = assignment["judge_uuid"]
        submission_uuid = assignment[
            "submission_uuid"
        ]

        # An assignment can exist without an evaluation.
        evaluation = _evaluation_collection(db).find_one(
            {
                "assignment_uuid": assignment_uuid,
                "hackathon_uuid": hackathon_uuid,
            }
        )

        if evaluation is not None:
            evaluation_status = evaluation.get(
                "status",
                "completed",
            )

            score = evaluation.get("score")

            if evaluation_status == "completed":
                completed_count += 1

                if score is not None:
                    total_score += float(score)
                    scored_evaluations += 1

            criterion_scores = _build_criterion_scores(
                evaluation=evaluation,
                hackathon_uuid=hackathon_uuid,
                db=db,
            )

            feedback = evaluation.get("feedback")

        else:
            evaluation_status = assignment.get(
                "status",
                "assigned",
            )

            score = None
            criterion_scores = []
            feedback = None

        judge = _get_judge(
            judge_uuid=judge_uuid,
            db=db,
        )

        submission = _get_submission(
            submission_uuid=submission_uuid,
            hackathon_uuid=hackathon_uuid,
            db=db,
        )

        responses.append(
            AdminJudgingEvaluationResponse(
                assignment_uuid=assignment_uuid,
                judge=judge,
                submission=submission,
                status=evaluation_status,
                score=score,
                criterion_scores=criterion_scores,
                feedback=feedback,
            )
        )

    # --------------------------------------------------------------
    # Summary
    # --------------------------------------------------------------

    pending_count = (
        len(assignments) - completed_count
    )

    average_score = (
        total_score / scored_evaluations
        if scored_evaluations > 0
        else None
    )

    return AdminJudgingResponse(
        summary=AdminJudgingSummaryResponse(
            assignments=len(assignments),
            completed=completed_count,
            pending=pending_count,
            average_score=(
                round(average_score, 2)
                if average_score is not None
                else None
            ),
        ),
        evaluations=responses,
    )