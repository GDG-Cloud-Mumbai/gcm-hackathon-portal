from fastapi import APIRouter

from handlers.auth import (
    AuthTokenResponse,
    auth_me,
    request_otp,
    verify_otp,
    update_profile,
)
from models.user import UserPrivate


router = APIRouter(prefix="/auth", tags=["auth"])
router.post("/request-otp")(request_otp)
router.post("/verify-otp", response_model=AuthTokenResponse)(verify_otp)
router.get("/me", response_model=UserPrivate)(auth_me)
router.patch("/update-profile", response_model=UserPrivate)(update_profile)
