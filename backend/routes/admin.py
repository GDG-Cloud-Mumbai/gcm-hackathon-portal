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

from handlers.track import (
    create_track,
    list_tracks,
    get_track,
    TrackResponse,
    TrackListResponse,
    update_track,
    archive_track,
    restore_track,
)

from handlers.hackathon_member import (
    HackathonMemberResponse,
    HackathonMemberListResponse,
    CreateHackathonMemberPayload,
    UpdateHackathonMemberPayload,
    create_hackathon_member,
    list_hackathon_members,
    update_hackathon_member,
    delete_hackathon_member,
)


from handlers.judge_assignment import (
    JudgeAssignmentResponse,
    JudgeAssignmentListResponse,
    CreateJudgeAssignmentPayload,
    UpdateJudgeAssignmentPayload,
    create_judge_assignment,
    list_judge_assignments,
    update_judge_assignment,
    delete_judge_assignment,
)

from handlers.judging_criteria import (
    create_judging_criterion,
    list_judging_criteria,
    update_judging_criterion,
    delete_judging_criterion,
    JudgingCriterionResponse,
    JudgingCriterionListResponse,
)

from handlers.admin_submission import (
    AdminSubmissionListResponse,
    AdminSubmissionResponse,
    get_admin_submission,
    list_admin_submissions,
)

from handlers.admin_dashboard import (
    AdminDashboardResponse,
    get_admin_dashboard,
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

router.post(
    "/hackathons/{hackathon_uuid}/tracks",
    response_model=TrackResponse,
)(create_track)

router.get(
    "/hackathons/{hackathon_uuid}/tracks",
    response_model=TrackListResponse,
)(list_tracks)

router.get(
    "/hackathons/{hackathon_uuid}/tracks/{track_uuid}",
    response_model=TrackResponse,
)(get_track)

router.patch(
    "/hackathons/{hackathon_uuid}/tracks/{track_uuid}",
    response_model=TrackResponse,
)(update_track)

router.post(
    "/hackathons/{hackathon_uuid}/tracks/{track_uuid}/archive",
    response_model=TrackResponse,
)(archive_track)

router.post(
    "/hackathons/{hackathon_uuid}/tracks/{track_uuid}/restore",
    response_model=TrackResponse,
)(restore_track)

router.post(
    "/hackathons/{hackathon_uuid}/members",
    response_model=HackathonMemberResponse,
)(create_hackathon_member)

router.get(
    "/hackathons/{hackathon_uuid}/members",
    response_model=HackathonMemberListResponse,
)(list_hackathon_members)

router.patch(
    "/hackathons/{hackathon_uuid}/members/{member_uuid}",
    response_model=HackathonMemberResponse,
)(update_hackathon_member)

router.delete(
    "/hackathons/{hackathon_uuid}/members/{member_uuid}",
)(delete_hackathon_member)

router.post(
    "/hackathons/{hackathon_uuid}/judge-assignments",
    response_model=JudgeAssignmentResponse,
)(create_judge_assignment)

router.get(
    "/hackathons/{hackathon_uuid}/judge-assignments",
    response_model=JudgeAssignmentListResponse,
)(list_judge_assignments)

router.patch(
    "/hackathons/{hackathon_uuid}/judge-assignments/{assignment_uuid}",
    response_model=JudgeAssignmentResponse,
)(update_judge_assignment)

router.delete(
    "/hackathons/{hackathon_uuid}/judge-assignments/{assignment_uuid}",
)(delete_judge_assignment)


# ------------------------------------------------------------------
# Submission Management
# ------------------------------------------------------------------


# List all submissions for a hackathon.
#
# Optional filters:
#   ?status=submitted
#   ?track_uuid=<track UUID>
router.get(
    "/hackathons/{hackathon_uuid}/submissions",
    response_model=AdminSubmissionListResponse,
)(list_admin_submissions)


# Get details for a specific submission.
router.get(
    "/hackathons/{hackathon_uuid}/submissions/{submission_uuid}",
    response_model=AdminSubmissionResponse,
)(get_admin_submission)


# ------------------------------------------------------------------
# Admin Dashboard
# ------------------------------------------------------------------


# Return aggregated metrics for the hackathon admin dashboard.
#
# Keeping these metrics in a single endpoint allows the frontend
# dashboard to load its overview without making multiple requests.
router.get(
    "/hackathons/{hackathon_uuid}/dashboard",
    response_model=AdminDashboardResponse,
)(get_admin_dashboard)


# ------------------------------------------------------------------
# Judging Criteria
# ------------------------------------------------------------------

router.post(
    "/hackathons/{hackathon_uuid}/judging-criteria",
    response_model=JudgingCriterionResponse,
)(create_judging_criterion)

router.get(
    "/hackathons/{hackathon_uuid}/judging-criteria",
    response_model=JudgingCriterionListResponse,
)(list_judging_criteria)

router.patch(
    "/hackathons/{hackathon_uuid}/judging-criteria/{criterion_uuid}",
    response_model=JudgingCriterionResponse,
)(update_judging_criterion)

router.delete(
    "/hackathons/{hackathon_uuid}/judging-criteria/{criterion_uuid}",
)(delete_judging_criterion)