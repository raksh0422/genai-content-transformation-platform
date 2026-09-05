"""Unit tests for file validation utilities."""
import pytest

from app.config import Settings
from app.utils.file_validation import (
    FileValidationError,
    validate_file_extension,
    validate_file_size,
)


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt"}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


class TestValidateFileExtension:
    def test_valid_pdf(self):
        ext = validate_file_extension("report.pdf", ALLOWED_EXTENSIONS)
        assert ext == ".pdf"

    def test_valid_docx(self):
        ext = validate_file_extension("doc.DOCX", ALLOWED_EXTENSIONS)
        assert ext == ".docx"

    def test_valid_pptx(self):
        ext = validate_file_extension("slides.pptx", ALLOWED_EXTENSIONS)
        assert ext == ".pptx"

    def test_valid_txt(self):
        ext = validate_file_extension("notes.txt", ALLOWED_EXTENSIONS)
        assert ext == ".txt"

    def test_invalid_extension_raises(self):
        with pytest.raises(FileValidationError, match=".exe"):
            validate_file_extension("malware.exe", ALLOWED_EXTENSIONS)

    def test_no_extension_raises(self):
        with pytest.raises(FileValidationError):
            validate_file_extension("no_extension", ALLOWED_EXTENSIONS)

    def test_mp3_raises(self):
        with pytest.raises(FileValidationError):
            validate_file_extension("audio.mp3", ALLOWED_EXTENSIONS)

    def test_case_insensitive(self):
        ext = validate_file_extension("FILE.PDF", ALLOWED_EXTENSIONS)
        assert ext == ".pdf"


class TestValidateFileSize:
    def test_within_limit_passes(self):
        validate_file_size(1024, MAX_BYTES)  # Should not raise

    def test_exactly_at_limit_passes(self):
        validate_file_size(MAX_BYTES, MAX_BYTES)

    def test_exceeds_limit_raises(self):
        with pytest.raises(FileValidationError, match="exceeds"):
            validate_file_size(MAX_BYTES + 1, MAX_BYTES)

    def test_empty_file_passes(self):
        validate_file_size(0, MAX_BYTES)

    def test_large_file_raises(self):
        with pytest.raises(FileValidationError):
            validate_file_size(100 * 1024 * 1024, MAX_BYTES)  # 100 MB
