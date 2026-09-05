from __future__ import annotations
"""PDF parser using PyMuPDF (fitz)."""
import logging
from io import BytesIO

import fitz  # PyMuPDF

from app.services.processing.cleaner import clean_text
from app.services.processing.models import ExtractedBlock, ExtractionResult
from app.services.processing.structure import classify_block_type

logger = logging.getLogger(__name__)

# Heuristic: font size ratio compared to body text that suggests a heading
_HEADING_FONT_SIZE_RATIO = 1.15


def parse_pdf(content: bytes) -> ExtractionResult:
    """
    Extract text from a PDF byte stream, preserving page numbers.

    Uses PyMuPDF block-level extraction to detect approximate headings
    based on font size comparisons.

    Args:
        content: Raw PDF file bytes.

    Returns:
        ExtractionResult with per-page blocks.
    """
    result = ExtractionResult()

    try:
        doc = fitz.open(stream=BytesIO(content), filetype="pdf")
    except Exception as exc:
        logger.error("Failed to open PDF: %s", exc)
        raise ValueError(f"Cannot parse PDF: {exc}") from exc

    result.page_count = doc.page_count
    logger.debug("PDF has %d page(s)", doc.page_count)

    # First pass: collect all font sizes to determine the body font size
    all_font_sizes: list[float] = []
    for page in doc:
        blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
        for block in blocks:
            if block.get("type") != 0:  # type 0 = text block
                continue
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    size = span.get("size", 0.0)
                    if size > 0:
                        all_font_sizes.append(size)

    # Median as body font size reference
    if all_font_sizes:
        all_font_sizes.sort()
        mid = len(all_font_sizes) // 2
        body_font_size = all_font_sizes[mid]
    else:
        body_font_size = 12.0

    logger.debug("Estimated body font size: %.1f pt", body_font_size)

    # Second pass: extract blocks with heading detection
    for page_num, page in enumerate(doc, start=1):
        raw_blocks = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)["blocks"]
        for block in raw_blocks:
            if block.get("type") != 0:
                continue

            block_text_parts: list[str] = []
            max_font_size = 0.0
            is_bold = False

            for line in block.get("lines", []):
                line_parts: list[str] = []
                for span in line.get("spans", []):
                    span_text = span.get("text", "")
                    if span_text.strip():
                        line_parts.append(span_text)
                    size = span.get("size", 0.0)
                    if size > max_font_size:
                        max_font_size = size
                    # Bold flag in PyMuPDF font flags: bit 4
                    if span.get("flags", 0) & 16:
                        is_bold = True
                if line_parts:
                    block_text_parts.append("".join(line_parts))

            raw_text = "\n".join(block_text_parts)
            cleaned = clean_text(raw_text)
            if not cleaned:
                continue

            # Classify block type
            if max_font_size >= body_font_size * _HEADING_FONT_SIZE_RATIO or (
                is_bold and len(cleaned) < 120
            ):
                block_type = "heading"
            else:
                block_type = classify_block_type(cleaned)

            result.blocks.append(
                ExtractedBlock(
                    text=cleaned,
                    block_type=block_type,
                    page_number=page_num,
                )
            )

    doc.close()
    result.word_count = sum(len(b.text.split()) for b in result.blocks)
    logger.info(
        "PDF extraction complete: %d blocks, %d pages, %d words",
        len(result.blocks),
        result.page_count,
        result.word_count,
    )
    return result
