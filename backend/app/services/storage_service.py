"""File storage abstraction (local disk implementation)."""
import logging
from pathlib import Path

import aiofiles

from app.config import Settings

logger = logging.getLogger(__name__)


class StorageService:
    """
    Abstraction layer for file persistence.

    Currently writes to local disk. To migrate to S3 or GCS, replace
    this class while keeping the same public interface.
    """

    def __init__(self, settings: Settings) -> None:
        self._upload_dir = settings.upload_dir
        self._upload_dir.mkdir(parents=True, exist_ok=True)
        logger.info("StorageService initialised. Upload dir: %s", self._upload_dir)

    def get_file_path(self, filename: str) -> Path:
        """Return the absolute path where a file would be stored."""
        return self._upload_dir / filename

    async def save(self, filename: str, content: bytes) -> Path:
        """
        Persist file bytes to storage.

        Args:
            filename: Storage filename (not the original user filename).
            content: File bytes.

        Returns:
            Absolute Path of the saved file.
        """
        path = self.get_file_path(filename)
        async with aiofiles.open(path, "wb") as f:
            await f.write(content)
        logger.debug("Saved file: %s (%d bytes)", path, len(content))
        return path

    async def read(self, filename: str) -> bytes:
        """Read and return raw file bytes from storage."""
        path = self.get_file_path(filename)
        async with aiofiles.open(path, "rb") as f:
            return await f.read()

    async def delete(self, filename: str) -> None:
        """Delete a file from storage (best-effort)."""
        path = self.get_file_path(filename)
        try:
            path.unlink(missing_ok=True)
            logger.debug("Deleted file: %s", path)
        except OSError as exc:
            logger.warning("Could not delete file %s: %s", path, exc)

    def exists(self, filename: str) -> bool:
        """Return True if the file exists in storage."""
        return self.get_file_path(filename).exists()
