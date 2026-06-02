from fastapi import APIRouter

from handlers.auth import (
    AuthTokenResponse,
    auth_me,
    request_otp,
    verify_otp,
    update_profile,
)
from models.user import UserPublic


router = APIRouter(prefix="/auth", tags=["auth"])
router.post("/request-otp")(request_otp)
router.post("/verify-otp", response_model=AuthTokenResponse)(verify_otp)
router.get("/me", response_model=UserPublic)(auth_me)
router.post("/update-profile", response_model=UserPublic)(update_profile)
