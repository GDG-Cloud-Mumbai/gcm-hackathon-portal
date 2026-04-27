from fastapi import APIRouter

from handlers.auth import AuthTokenResponse, UserPublic, auth_me, request_otp, verify_otp


router = APIRouter(prefix="/auth", tags=["auth"])
router.post("/request-otp")(request_otp)
router.post("/verify-otp", response_model=AuthTokenResponse)(verify_otp)
router.get("/me", response_model=UserPublic)(auth_me)