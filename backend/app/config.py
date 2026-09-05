"""Application configuration via pydantic-settings."""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_log_level: str = "INFO"

    # Database (defaults to SQLite; overridable via DATABASE_URL env var for PostgreSQL/Neon/Supabase)
    database_url: str = "sqlite+aiosqlite:///./uploads/genai_platform.db"

    # File Upload & Vector Index Storage
    upload_dir: Path = Path("./uploads")
    max_file_size_mb: int = 50

    # Text Processing
    chunk_size_tokens: int = 512
    chunk_overlap_tokens: int = 64
    tiktoken_encoding: str = "cl100k_base"

    # Phase 2: RAG & LLM Configuration (Centralized, non-hardcoded)
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    embedding_dimension: int = 1536
    vector_store_type: str = "faiss"
    default_top_k: int = 5

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def allowed_extensions(self) -> set[str]:
        return {".pdf", ".docx", ".pptx", ".txt"}

    @property
    def allowed_mime_types(self) -> set[str]:
        return {
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
        }

    @property
    def vector_index_dir(self) -> Path:
        """Directory for persisting FAISS vector index files."""
        path = self.upload_dir / "vector_indices"
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()


def configure_logging(settings: Settings) -> None:
    """Configure root logger from settings."""
    logging.basicConfig(
        level=getattr(logging, settings.app_log_level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
