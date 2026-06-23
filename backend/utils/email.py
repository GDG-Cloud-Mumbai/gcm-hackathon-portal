import httpx

from utils.env import get_int, require_env, ENV

RESEND_API_KEY = require_env("RESEND_API_KEY")
RESEND_FROM_EMAIL = require_env("RESEND_FROM_EMAIL")
OTP_TTL_MINUTES = get_int("OTP_TTL_MINUTES", 10)


def send_otp_email(email: str, otp: str) -> None:
    if ENV.get("ENVIRONMENT", "PRODUCTION") == "DEVELOPMENT" and ENV.get("DEFAULT_OTP"):
        return

    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [email],
        "subject": "Your verification code",
        "text": f"Your verification code is {otp}. It expires in {OTP_TTL_MINUTES} minutes.",
        "html": (
            "<p>Your verification code is "
            f"<strong>{otp}</strong>."
            "It expires in {OTP_TTL_MINUTES} minutes.</p>"
        ),
    }
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            json=payload,
            headers=headers,
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RuntimeError(
            "Email provider is unavailable. Please try again.") from exc
