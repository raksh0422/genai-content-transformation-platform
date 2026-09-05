"""Parsers sub-package."""
from app.services.processing.parsers.pdf_parser import parse_pdf
from app.services.processing.parsers.docx_parser import parse_docx
from app.services.processing.parsers.pptx_parser import parse_pptx
from app.services.processing.parsers.txt_parser import parse_txt

__all__ = ["parse_pdf", "parse_docx", "parse_pptx", "parse_txt"]
