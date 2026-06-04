from datetime import datetime
from pydantic import BaseModel, EmailStr


class Role(BaseModel):
    name: str

    def __init__(self, **data):
        super().__init__(**data)
        if self.name not in {"user", "admin", "superadmin"}:
            raise ValueError("Invalid role name")


class UserPrivate(BaseModel):
    uuid: str
    email: str
    username: str | None = None
    name: str
    global_role: Role = Role(name="user")
    created_at: str | datetime | None = None
    last_login_at: str | datetime | None = None

    def __init__(self, **data):
        super().__init__(**data)
        if isinstance(self.created_at, str):
            self.created_at = datetime.fromisoformat(self.created_at)
        if isinstance(self.last_login_at, str):
            self.last_login_at = datetime.fromisoformat(self.last_login_at)


class UserPublic(BaseModel):
    uuid: str
    username: str | None = None
    name: str


class User(BaseModel):
    _id: str | None = None
    uuid: str
    email: EmailStr
    username: str | None = None
    name: str
    password: str | None = None
    global_role: Role = Role(name="user")
    created_at: str | datetime | None = None
    last_login_at: str | datetime | None = None

    def __init__(self, **data):
        super().__init__(**data)
        if isinstance(self.created_at, str):
            self.created_at = datetime.fromisoformat(self.created_at)
        if isinstance(self.last_login_at, str):
            self.last_login_at = datetime.fromisoformat(self.last_login_at)

    def to_public(self) -> UserPrivate:
        return UserPrivate(
            email=self.email,
            username=self.username,
            name=self.name,
            global_role=self.global_role,
            created_at=self.created_at,
            last_login_at=self.last_login_at,
        )
