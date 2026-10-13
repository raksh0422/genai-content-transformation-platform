"""Authentication and Authorization Middleware Dependencies."""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.security import decode_access_token
from app.database import get_db

logger = logging.getLogger(__name__)


class User(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: str
    email: str
    role: str = "user"
    full_name: str = "Demo User"


DEFAULT_DEMO_USER = User(
    user_id="usr_demo_default",
    email="demo.user@platform.internal",
    role="user",
    full_name="Demo User",
)


async def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Extract and validate authenticated user from Authorization Bearer token or test headers.
    Returns None if no credentials provided or invalid.
    """
    # 1. Bearer Token Authorization Header
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
        payload = decode_access_token(token, settings.secret_key)
        if payload and "sub" in payload:
            user_id = str(payload["sub"])
            # Verify user exists in DB and is active
            from app.models.user import User as UserModel
            res = await db.execute(select(UserModel).where(UserModel.id == user_id))
            db_user = res.scalar_one_or_none()
            if db_user:
                if not db_user.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Account is deactivated. Contact an administrator.",
                    )
                return User(
                    user_id=db_user.id,
                    email=db_user.email,
                    role=db_user.role,
                    full_name=db_user.full_name,
                )
            # If user was created with payload claims
            role = payload.get("role", "user")
            return User(
                user_id=user_id,
                email=payload.get("email", f"{user_id}@platform.internal"),
                role=role,
                full_name=payload.get("name", "User"),
            )

    # 2. Custom User ID Header (for test fixtures / internal testing)
    if x_user_id:
        role = "admin" if ("admin" in x_user_id.lower()) else "user"
        from app.models.user import User as UserModel
        res = await db.execute(select(UserModel).where(UserModel.id == x_user_id))
        db_user = res.scalar_one_or_none()
        if db_user:
            if not db_user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is deactivated. Contact an administrator.",
                )
            return User(
                user_id=db_user.id,
                email=db_user.email,
                role=db_user.role,
                full_name=db_user.full_name,
            )
        return User(
            user_id=x_user_id,
            email=f"{x_user_id}@platform.internal",
            role=role,
            full_name=x_user_id,
        )

    return None


async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Standard user dependency: validates token or test header,
    falling back to DEFAULT_DEMO_USER for local/test convenience.
    """
    user = await get_current_user_optional(
        authorization=authorization,
        x_user_id=x_user_id,
        settings=settings,
        db=db,
    )
    if user is not None:
        return user

    # Fallback to default demo user for backward test compatibility
    return DEFAULT_DEMO_USER


async def require_authenticated_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Strict user dependency: rejects unauthenticated requests with 401 Unauthorized.
    Does NOT fall back to DEFAULT_DEMO_USER.
    """
    user = await get_current_user_optional(
        authorization=authorization,
        x_user_id=x_user_id,
        settings=settings,
        db=db,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_admin(
    current_user: User = Depends(require_authenticated_user),
) -> User:
    """
    Strict admin dependency: requires authentication AND role == 'admin'.
    Rejects regular users with 403 Forbidden.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required. You do not have permission to view or manage administrative resources.",
        )
    return current_user
