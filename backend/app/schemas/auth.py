"""Authentication request and response schemas."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=256, description="Full name of the user")
    email: str = Field(..., max_length=256, description="Email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password (at least 8 characters)")
    confirm_password: str = Field(..., min_length=8, max_length=128, description="Confirm password")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean_email = v.strip().lower()
        email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
        if not re.match(email_regex, clean_email):
            raise ValueError("Invalid email format.")
        return clean_email

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        password = info.data.get("password")
        if password and v != password:
            raise ValueError("Passwords do not match.")
        return v


class UserLoginRequest(BaseModel):
    email: str = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")
    remember_me: Optional[bool] = Field(False, description="Extend session duration")

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    last_active_at: Optional[datetime] = None
    document_count: Optional[int] = 0
    transformation_count: Optional[int] = 0


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        return v.strip().lower()


class UserStatusUpdateRequest(BaseModel):
    is_active: bool


class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=256, description="Full name of user")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Current account password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password (at least 8 characters)")
    confirm_new_password: str = Field(..., min_length=8, max_length=128, description="Confirm new password")

    @field_validator("confirm_new_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        new_password = info.data.get("new_password")
        if new_password and v != new_password:
            raise ValueError("New passwords do not match.")
        return v
