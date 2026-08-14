"""Authentication schemas."""

import uuid
from pydantic import BaseModel, EmailStr, field_validator


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    display_name: str | None = None


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: str | None
    role: str
    is_active: bool

    model_config = {"from_attributes": True}

    @field_validator('id', mode='before')
    @classmethod
    def coerce_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v
