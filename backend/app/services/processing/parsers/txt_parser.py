from __future__ import annotations
"""Plain text parser."""
import logging

from app.services.processing.cleaner import clean_text
from app.services.processing.models import ExtractedBlock, ExtractionResult
from app.services.processing.structure import classify_block_type

logger = logging.getLogger(__name__)


def parse_txt(content: bytes) -> ExtractionResult:
    """
    Parse a plain text file into blocks split by blank lines.

    Args:
        content: Raw text file bytes.

    Returns:
        ExtractionResult with paragraph blocks.
    """
    result = ExtractionResult()

    try:
        raw = content.decode("utf-8", errors="replace")
    except Exception as exc:
        logger.error("Failed to decode TXT: %s", exc)
        raise ValueError(f"Cannot parse TXT: {exc}") from exc

    # Split on one or more blank lines to get logical paragraphs
    raw_paragraphs = [p.strip() for p in raw.split("\n\n") if p.strip()]

    for para in raw_paragraphs:
        cleaned = clean_text(para)
        if not cleaned:
            continue
        block_type = classify_block_type(cleaned)
        result.blocks.append(
            ExtractedBlock(text=cleaned, block_type=block_type)
        )

    result.page_count = None
    result.word_count = sum(len(b.text.split()) for b in result.blocks)
    logger.info(
        "TXT extraction complete: %d blocks, %d words",
        len(result.blocks),
        result.word_count,
    )
    return result
