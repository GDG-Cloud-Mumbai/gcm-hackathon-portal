from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.database import Database
from typing import Any
import jwt

from utils.env import ENV, require_env
from utils.db import get_db
from models.user import UserPrivate

JWT_SECRET = require_env("JWT_SECRET")
JWT_AUDIENCE = ENV.get("JWT_AUDIENCE", "gcm-hackathon-users").strip()
JWT_ISSUER = ENV.get("JWT_ISSUER", "gcm-hackathon-portal").strip()

authorization = HTTPBearer(auto_error=False)

def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(authorization),
    db: Database[Any] = Depends(get_db),
) -> UserPrivate:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication"
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=["HS256"],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
            options={"require": ["sub", "exp", "iat", "aud", "iss"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc

    email = payload.get("sub")
    if not isinstance(email, str) or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject"
        )

    user_doc = db.users.find_one(
        {"email": email},
        {
            "_id": 0,
            "email": 1,
            "name": 1,
            "created_at": 1,
            "last_login_at": 1,
            "username": 1,
        },
    )

    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User does not exist"
        )

    if not user_doc.get("name"):
        user_doc["name"] = email.split("@")[0]

    return UserPrivate(**user_doc)

def require_global_roles(
    role: str | list[str],
    current_user: UserPrivate = Depends(get_current_user),
) -> UserPrivate:
    if isinstance(role, str):
        role = [role]

    if current_user.global_role.name not in role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )

    return current_user
