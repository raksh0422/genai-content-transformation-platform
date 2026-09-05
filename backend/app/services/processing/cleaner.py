"""Text cleaning utilities."""
import re
import unicodedata


# Regex to collapse runs of whitespace (preserving single newlines for structure)
_WHITESPACE_RE = re.compile(r"[ \t\r\f\v]+")
_MULTI_NEWLINE_RE = re.compile(r"\n{3,}")
_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def normalize_unicode(text: str) -> str:
    """Normalize Unicode to NFC form and replace smart quotes with ASCII."""
    text = unicodedata.normalize("NFC", text)
    # Smart quotes → standard
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    # Em/en dashes → hyphen
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    # Ellipsis
    text = text.replace("\u2026", "...")
    return text


def remove_control_characters(text: str) -> str:
    """Remove non-printable control characters (except newlines and tabs)."""
    return _CONTROL_CHAR_RE.sub("", text)


def collapse_whitespace(text: str) -> str:
    """Collapse horizontal whitespace runs to a single space."""
    text = _WHITESPACE_RE.sub(" ", text)
    text = _MULTI_NEWLINE_RE.sub("\n\n", text)
    return text


def clean_text(text: str) -> str:
    """
    Apply the full cleaning pipeline to a text string.

    Steps:
      1. Strip leading/trailing whitespace
      2. Normalize unicode
      3. Remove control characters
      4. Collapse whitespace
      5. Final strip

    Args:
        text: Raw text string.

    Returns:
        Cleaned text string, or empty string if input is empty/whitespace.
    """
    if not text or not text.strip():
        return ""
    text = text.strip()
    text = normalize_unicode(text)
    text = remove_control_characters(text)
    text = collapse_whitespace(text)
    return text.strip()
