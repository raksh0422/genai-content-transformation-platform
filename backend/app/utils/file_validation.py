from __future__ import annotations
"""File validation utilities."""
import logging
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import Settings

logger = logging.getLogger(__name__)


class FileValidationError(Exception):
    """Raised when a file fails validation."""


def validate_file_extension(filename: str, allowed_extensions: set[str]) -> str:
    """
    Return the lowercased file extension if allowed, else raise FileValidationError.
    """
    suffix = Path(filename).suffix.lower()
    if suffix not in allowed_extensions:
        raise FileValidationError(
            f"File extension '{suffix}' is not allowed. "
            f"Allowed extensions: {sorted(allowed_extensions)}"
        )
    return suffix


def validate_file_size(size_bytes: int, max_bytes: int) -> None:
    """Raise FileValidationError if the file exceeds the max size."""
    if size_bytes > max_bytes:
        max_mb = max_bytes / (1024 * 1024)
        actual_mb = size_bytes / (1024 * 1024)
        raise FileValidationError(
            f"File size {actual_mb:.2f} MB exceeds the maximum allowed "
            f"size of {max_mb:.0f} MB."
        )


async def read_and_validate_upload(
    upload: UploadFile,
    settings: Settings,
) -> tuple[bytes, str]:
    """
    Read the uploaded file content, validate extension and size.

    Returns:
        (file_content_bytes, lowercased_extension)

    Raises:
        HTTPException 400 on validation failure.
    """
    if not upload.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file has no filename.",
        )

    try:
        extension = validate_file_extension(
            upload.filename, settings.allowed_extensions
        )
    except FileValidationError as exc:
        logger.warning("File extension validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    content = await upload.read()

    try:
        validate_file_size(len(content), settings.max_file_size_bytes)
    except FileValidationError as exc:
        logger.warning("File size validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    logger.debug(
        "File '%s' passed validation: ext=%s size=%d bytes",
        upload.filename,
        extension,
        len(content),
    )
    return content, extension
