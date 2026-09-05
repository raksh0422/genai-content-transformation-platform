"""Extractor dispatcher — routes to the correct parser based on file extension."""
import logging

from app.services.processing.models import ExtractionResult
from app.services.processing.parsers import parse_pdf, parse_docx, parse_pptx, parse_txt

logger = logging.getLogger(__name__)

_PARSER_MAP = {
    ".pdf": parse_pdf,
    ".docx": parse_docx,
    ".pptx": parse_pptx,
    ".txt": parse_txt,
}


def extract_text(content: bytes, extension: str) -> ExtractionResult:
    """
    Dispatch to the appropriate parser based on file extension.

    Args:
        content: Raw file bytes.
        extension: Lowercased file extension including the dot (e.g. '.pdf').

    Returns:
        ExtractionResult.

    Raises:
        ValueError: If the extension has no registered parser.
    """
    parser = _PARSER_MAP.get(extension.lower())
    if parser is None:
        raise ValueError(
            f"No parser registered for extension '{extension}'. "
            f"Supported: {sorted(_PARSER_MAP.keys())}"
        )
    logger.debug("Dispatching extraction to parser for '%s'", extension)
    return parser(content)
