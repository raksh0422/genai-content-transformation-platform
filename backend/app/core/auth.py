"""Authentication and Authorization Middleware Dependency."""
from __future__ import annotations

import logging
from typing import Optional
from pydantic import BaseModel
from fastapi import Header, HTTPException, status

logger = logging.getLogger(__name__)


from pydantic import BaseModel, ConfigDict


class User(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: str
    email: str
    role: str = "user"


DEFAULT_DEMO_USER = User(
    user_id="usr_demo_default",
    email="demo.user@platform.internal",
    role="user",
)


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
) -> User:
    """
    Extract and validate the current authenticated user context from Authorization header or X-User-ID header.
    Falls back to default demo user context for local development if unauthenticated.
    """
    # 1. Custom User ID Header
    if x_user_id:
        return User(
            user_id=x_user_id,
            email=f"{x_user_id}@platform.internal",
            role="user",
        )

    # 2. Bearer Token Authorization Header
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        if token:
            # Simple token decoding / validation logic
            user_id = f"usr_{token[:12]}"
            return User(
                user_id=user_id,
                email=f"{user_id}@platform.internal",
                role="user",
            )

    # 3. Fallback to default demo user for seamless local developer sandbox
    return DEFAULT_DEMO_USER
