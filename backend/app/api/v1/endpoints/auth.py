"""Authentication API endpoints."""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.core.auth import User, require_authenticated_user
from app.database import get_db
from app.schemas.auth import (
    AuthTokenResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ProfileUpdateRequest,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.activity_service import log_activity
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_auth_service(settings: Settings = Depends(get_settings)) -> AuthService:
    return AuthService(settings)


@router.post(
    "/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new regular user account",
)
async def register(
    body: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(_get_auth_service),
) -> AuthTokenResponse:
    """
    Register a regular user account. The role is always set to 'user'.
    Administrative accounts cannot be created via public registration.
    """
    try:
        user, token = await auth_service.register_user(db, body)
        stats = await auth_service.get_user_stats(db, user.id)
        user_res = UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_active_at=user.last_active_at,
            document_count=stats["document_count"],
            transformation_count=stats["transformation_count"],
        )
        return AuthTokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_res,
        )
    except ValueError as val_err:
        err_msg = str(val_err)
        if "already exists" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=err_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg,
        )


@router.post(
    "/login",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate user and obtain JWT token",
)
async def login(
    body: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(_get_auth_service),
) -> AuthTokenResponse:
    """
    Authenticate email & password, returning signed JWT token and user profile.
    """
    try:
        user, token = await auth_service.authenticate_user(db, body)
        stats = await auth_service.get_user_stats(db, user.id)
        user_res = UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            last_active_at=user.last_active_at,
            document_count=stats["document_count"],
            transformation_count=stats["transformation_count"],
        )
        return AuthTokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_res,
        )
    except ValueError as val_err:
        err_msg = str(val_err)
        if "deactivated" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=err_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=err_msg,
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(_get_auth_service),
) -> UserResponse:
    """
    Returns authenticated user's details, role, and usage metrics.
    """
    stats = await auth_service.get_user_stats(db, current_user.user_id)
    db_user = await auth_service.get_user_by_id(db, current_user.user_id)
    return UserResponse(
        id=current_user.user_id,
        email=current_user.email,
        full_name=db_user.full_name if db_user else current_user.full_name,
        role=current_user.role,
        is_active=db_user.is_active if db_user else True,
        created_at=db_user.created_at if db_user else None,
        last_active_at=db_user.last_active_at if db_user else None,
        document_count=stats["document_count"],
        transformation_count=stats["transformation_count"],
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Log out and record audit event",
)
async def logout(
    current_user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Log out the current user session and record audit event.
    """
    await log_activity(
        db=db,
        event_type="user_logout",
        description=f"User logged out: {current_user.email}",
        user_id=current_user.user_id,
        user_email=current_user.email,
        resource_type="user",
        resource_id=current_user.user_id,
        status="success",
    )
    return {"status": "logged_out", "message": "Successfully logged out."}


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Request password reset instructions",
)
async def forgot_password(
    body: ForgotPasswordRequest,
) -> dict:
    """
    Informational safe password reset path.
    """
    return {
        "status": "info",
        "message": "Automated email delivery is not yet configured for this installation. Please contact your ContentAI administrator to reset credentials.",
    }


@router.put(
    "/profile",
    response_model=UserResponse,
    summary="Update user profile display name",
)
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(_get_auth_service),
) -> UserResponse:
    """
    Update the authenticated user's profile information.
    """
    try:
        updated_user = await auth_service.update_profile(
            db=db,
            user_id=current_user.user_id,
            full_name=body.full_name,
        )
        stats = await auth_service.get_user_stats(db, current_user.user_id)
        return UserResponse(
            id=updated_user.id,
            email=updated_user.email,
            full_name=updated_user.full_name,
            role=updated_user.role,
            is_active=updated_user.is_active,
            created_at=updated_user.created_at,
            last_active_at=updated_user.last_active_at,
            document_count=stats["document_count"],
            transformation_count=stats["transformation_count"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change user password",
)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(require_authenticated_user),
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(_get_auth_service),
) -> dict:
    """
    Change user password after verifying existing password.
    """
    try:
        await auth_service.change_password(
            db=db,
            user_id=current_user.user_id,
            current_password=body.current_password,
            new_password=body.new_password,
        )
        return {"status": "success", "message": "Password changed successfully."}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
