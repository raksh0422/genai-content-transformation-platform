"""Production Structured Logging Configuration."""
from __future__ import annotations

import logging
import sys
from app.config import get_settings


class SafeProductionFormatter(logging.Formatter):
    """
    Sanitizes log messages to ensure sensitive tokens or API keys are never printed in plain text.
    """

    def format(self, record: logging.LogRecord) -> str:
        formatted = super().format(record)
        # Redact API keys if accidentally passed in log messages
        if "sk-" in formatted:
            import re
            formatted = re.sub(r"sk-[a-zA-Z0-9]{20,}", "[REDACTED_API_KEY]", formatted)
        return formatted


def setup_logging() -> None:
    """Initialize application logging configuration."""
    settings = get_settings()
    log_level = getattr(logging, settings.app_log_level.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        SafeProductionFormatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d - %(message)s"
        )
    )

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    # Remove existing handlers to avoid duplication
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
