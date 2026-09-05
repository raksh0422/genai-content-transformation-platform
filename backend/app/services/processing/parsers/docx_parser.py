from __future__ import annotations
"""DOCX parser using python-docx."""
import logging
from io import BytesIO

from docx import Document as DocxDocument
from docx.oxml.ns import qn

from app.services.processing.cleaner import clean_text
from app.services.processing.models import ExtractedBlock, ExtractionResult
from app.services.processing.structure import classify_block_type

logger = logging.getLogger(__name__)

# Paragraph style names that indicate headings
_HEADING_STYLE_PREFIXES = ("heading", "title", "subtitle")


def _is_heading_style(style_name: str) -> bool:
    """Return True if the paragraph style name suggests a heading."""
    name_lower = style_name.lower()
    return any(name_lower.startswith(prefix) for prefix in _HEADING_STYLE_PREFIXES)


def parse_docx(content: bytes) -> ExtractionResult:
    """
    Extract text from a DOCX byte stream, classifying headings by style.

    Args:
        content: Raw DOCX file bytes.

    Returns:
        ExtractionResult with per-paragraph blocks.
    """
    result = ExtractionResult()

    try:
        doc = DocxDocument(BytesIO(content))
    except Exception as exc:
        logger.error("Failed to open DOCX: %s", exc)
        raise ValueError(f"Cannot parse DOCX: {exc}") from exc

    for para in doc.paragraphs:
        raw_text = para.text
        cleaned = clean_text(raw_text)
        if not cleaned:
            continue

        style_name = para.style.name if para.style else ""
        if _is_heading_style(style_name):
            block_type = "heading"
        else:
            block_type = classify_block_type(cleaned)

        result.blocks.append(
            ExtractedBlock(
                text=cleaned,
                block_type=block_type,
                # DOCX paragraphs don't have physical pages
                page_number=None,
            )
        )

    result.page_count = None  # DOCX doesn't expose page count without rendering
    result.word_count = sum(len(b.text.split()) for b in result.blocks)
    logger.info(
        "DOCX extraction complete: %d blocks, %d words",
        len(result.blocks),
        result.word_count,
    )
    return result
