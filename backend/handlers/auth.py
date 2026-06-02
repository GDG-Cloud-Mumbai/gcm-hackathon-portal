import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from pymongo.database import Database
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

from middlewares.auth import get_current_user
from utils.env import ENV, get_int, require_env
from utils.email import send_otp_email
from utils.auth import (
    consume_otp_request_slot,
    delete_otp_challenge,
    fetch_otp_challenge,
    increment_otp_attempt_count,
    store_otp_challenge,
)
from utils.db import get_db

from models.user import UserPublic

JWT_SECRET = require_env("JWT_SECRET")
JWT_ISSUER = ENV.get("JWT_ISSUER", "gcm-hackathon-portal").strip()
JWT_AUDIENCE = ENV.get("JWT_AUDIENCE", "gcm-hackathon-users").strip()
JWT_EXP_MINUTES = get_int("JWT_EXP_MINUTES", 60)
OTP_TTL_MINUTES = get_int("OTP_TTL_MINUTES", 10)
OTP_LENGTH = get_int("OTP_LENGTH", 6)
OTP_MAX_ATTEMPTS = get_int("OTP_MAX_ATTEMPTS", 5)
OTP_HASH_ITERATIONS = get_int("OTP_HASH_ITERATIONS", 200000)
OTP_PEPPER = require_env("OTP_PEPPER")
OTP_REQUEST_LIMIT = get_int("OTP_REQUEST_LIMIT", 5)
OTP_REQUEST_WINDOW_MINUTES = get_int("OTP_REQUEST_WINDOW_MINUTES", 15)

if len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be at least 32 characters")
if len(OTP_PEPPER) < 16:
    raise RuntimeError("OTP_PEPPER must be at least 16 characters")
if OTP_LENGTH < 4:
    raise RuntimeError("OTP_LENGTH must be at least 4")


class OTPRequestBody(BaseModel):
    email: EmailStr


class OTPVerifyBody(BaseModel):
    email: EmailStr
    otp: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic

class ProfileUpdatePayload(BaseModel):
    name: str | None = None


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _otp_hash(otp: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        otp.encode("utf-8"),
        salt + OTP_PEPPER.encode("utf-8"),
        OTP_HASH_ITERATIONS,
    ).hex()


def _new_otp() -> str:
    upper_bound = 10**OTP_LENGTH
    otp_value = secrets.randbelow(upper_bound)
    return str(otp_value).zfill(OTP_LENGTH)


def _issue_access_token(email: str) -> str:
    now = _utcnow()
    exp = now + timedelta(minutes=JWT_EXP_MINUTES)
    payload = {
        "sub": email,
        "email": email,
        "type": "access",
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "jti": secrets.token_urlsafe(24),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _enforce_otp_request_rate_limit(email: str, client_ip: str) -> None:
    count = consume_otp_request_slot(email, client_ip, OTP_REQUEST_WINDOW_MINUTES * 60)
    if count > OTP_REQUEST_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests",
        )


def request_otp(
    payload: OTPRequestBody,
    request: Request,
) -> dict[str, str]:
    normalized_email = payload.email.strip().lower()
    _enforce_otp_request_rate_limit(normalized_email, _client_ip(request))

    otp = _new_otp()
    salt = secrets.token_bytes(16)
    otp_hash = _otp_hash(otp, salt)
    store_otp_challenge(
        normalized_email,
        otp_hash,
        salt.hex(),
        OTP_TTL_MINUTES * 60,
        OTP_MAX_ATTEMPTS,
    )

    try:
        send_otp_email(normalized_email, otp)
    except RuntimeError as exc:
        delete_otp_challenge(normalized_email)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Email provider is unavailable. Please try again.",
        ) from exc
    return {"detail": "If the email is valid, a verification code has been sent."}


def verify_otp(
    payload: OTPVerifyBody,
    db: Database[Any] = Depends(get_db),
) -> AuthTokenResponse:
    normalized_email = payload.email.strip().lower()
    if not payload.otp.isdigit() or len(payload.otp) != OTP_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired code"
        )

    challenge = fetch_otp_challenge(normalized_email)
    if challenge is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired code"
        )

    salt_hex = challenge.get("salt")
    stored_hash = challenge.get("otp_hash")
    if not isinstance(salt_hex, str) or not isinstance(stored_hash, str):
        delete_otp_challenge(normalized_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired code"
        )

    try:
        calculated_hash = _otp_hash(payload.otp, bytes.fromhex(salt_hex))
    except ValueError:
        delete_otp_challenge(normalized_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired code"
        )
    if not hmac.compare_digest(stored_hash, calculated_hash):
        attempts = increment_otp_attempt_count(normalized_email)
        if attempts is None or attempts >= OTP_MAX_ATTEMPTS:
            delete_otp_challenge(normalized_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired code"
        )

    db.users.update_one(
        {"email": normalized_email},
        {
            "$setOnInsert": {"email": normalized_email, "created_at": _utcnow()},
            "$set": {"last_login_at": _utcnow()},
        },
        upsert=True,
    )

    user_doc = db.users.find_one(
        {"email": normalized_email},
        {"_id": 0, "email": 1, "created_at": 1, "last_login_at": 1},
    )
    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load user",
        )

    access_token = _issue_access_token(normalized_email)
    delete_otp_challenge(normalized_email)
    return AuthTokenResponse(
        access_token=access_token,
        expires_in=JWT_EXP_MINUTES * 60,
        user=UserPublic(**user_doc),
    )


def auth_me(
    current_user: UserPublic = Depends(get_current_user),
) -> UserPublic:
    return current_user


def update_profile(
    payload: ProfileUpdatePayload,
    current_user: UserPublic = Depends(get_current_user),
    db: Database[Any] = Depends(get_db),
) -> UserPublic:
    update_fields = {}

    if payload.name and payload.name != current_user.name:
        update_fields["name"] = payload.name

    if not update_fields:
        return current_user

    db.users.update_one({"email": current_user.email}, {"$set": update_fields})
    updated_user_doc = db.users.find_one(
        {"email": current_user.email},
        {"_id": 0, "email": 1, "name": 1, "created_at": 1, "last_login_at": 1},
    )
    if updated_user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load user after update",
        )

    return UserPublic(**updated_user_doc)
