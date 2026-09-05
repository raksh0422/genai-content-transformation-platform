"""Heuristic document structure classification."""
import re

# Heading indicators (short lines, title-cased or all-caps, no terminal period)
_HEADING_MAX_WORDS = 15
_ALL_CAPS_RE = re.compile(r"^[A-Z0-9\s\-\:\.\,]+$")
_ENDS_WITH_PERIOD_RE = re.compile(r"\.\s*$")
_NUMBERED_HEADING_RE = re.compile(
    r"^(\d+\.)+\s+\w"  # e.g. "1. Introduction" or "2.3 Background"
)


def classify_block_type(text: str) -> str:
    """
    Heuristically classify a cleaned text block as 'heading' or 'paragraph'.

    A block is considered a heading if it:
      - Has ≤ HEADING_MAX_WORDS words, AND one of:
        - Is fully uppercase
        - Matches a numbered section pattern (1. or 1.2 prefix)
        - Does not end with a period and is title-cased

    Args:
        text: Cleaned text block.

    Returns:
        'heading' or 'paragraph'.
    """
    if not text:
        return "paragraph"

    words = text.split()
    if len(words) > _HEADING_MAX_WORDS:
        return "paragraph"

    stripped = text.strip()

    # Fully uppercase short lines
    if _ALL_CAPS_RE.match(stripped) and len(words) >= 1:
        return "heading"

    # Numbered section headings
    if _NUMBERED_HEADING_RE.match(stripped):
        return "heading"

    # Title-case, no trailing period
    if not _ENDS_WITH_PERIOD_RE.search(stripped) and stripped.istitle():
        return "heading"

    return "paragraph"
