"""Unit tests for document parsers."""
import pytest

from app.services.processing.parsers import parse_pdf, parse_docx, parse_pptx, parse_txt
from app.services.processing.models import ExtractionResult


class TestPdfParser:
    def test_basic_extraction(self, sample_pdf_bytes):
        result = parse_pdf(sample_pdf_bytes)
        assert isinstance(result, ExtractionResult)
        assert len(result.blocks) > 0
        assert result.page_count == 1
        assert result.word_count > 0

    def test_text_content_present(self, sample_pdf_bytes):
        result = parse_pdf(sample_pdf_bytes)
        full_text = result.full_text
        assert "Introduction" in full_text or "sample paragraph" in full_text

    def test_page_numbers_present(self, sample_pdf_bytes):
        result = parse_pdf(sample_pdf_bytes)
        for block in result.blocks:
            assert block.page_number is not None
            assert block.page_number >= 1

    def test_invalid_bytes_raises(self):
        with pytest.raises(ValueError, match="Cannot parse PDF"):
            parse_pdf(b"this is not a pdf")

    def test_empty_pdf_returns_empty(self):
        """A valid but empty PDF should parse without error."""
        import fitz
        doc = fitz.open()
        doc.new_page()
        empty_pdf = doc.tobytes()
        doc.close()
        result = parse_pdf(empty_pdf)
        assert result.page_count == 1
        assert result.word_count == 0


class TestDocxParser:
    def test_basic_extraction(self, sample_docx_bytes):
        result = parse_docx(sample_docx_bytes)
        assert len(result.blocks) > 0
        assert result.word_count > 0

    def test_heading_detection(self, sample_docx_bytes):
        result = parse_docx(sample_docx_bytes)
        block_types = {b.block_type for b in result.blocks}
        assert "heading" in block_types

    def test_content_present(self, sample_docx_bytes):
        result = parse_docx(sample_docx_bytes)
        texts = [b.text for b in result.blocks]
        combined = " ".join(texts)
        assert "Test Heading" in combined or "first paragraph" in combined

    def test_invalid_bytes_raises(self):
        with pytest.raises(ValueError, match="Cannot parse DOCX"):
            parse_docx(b"not a docx file")

    def test_page_count_is_none(self, sample_docx_bytes):
        """DOCX doesn't expose page count."""
        result = parse_docx(sample_docx_bytes)
        assert result.page_count is None


class TestPptxParser:
    def test_basic_extraction(self, sample_pptx_bytes):
        result = parse_pptx(sample_pptx_bytes)
        assert len(result.blocks) > 0
        assert result.page_count >= 1

    def test_slide_numbers_present(self, sample_pptx_bytes):
        result = parse_pptx(sample_pptx_bytes)
        for block in result.blocks:
            assert block.slide_number is not None
            assert block.slide_number >= 1

    def test_title_is_heading(self, sample_pptx_bytes):
        result = parse_pptx(sample_pptx_bytes)
        headings = [b for b in result.blocks if b.block_type == "heading"]
        assert len(headings) >= 1

    def test_invalid_bytes_raises(self):
        with pytest.raises(ValueError, match="Cannot parse PPTX"):
            parse_pptx(b"not a pptx")


class TestTxtParser:
    def test_basic_extraction(self, sample_txt_bytes):
        result = parse_txt(sample_txt_bytes)
        assert len(result.blocks) > 0
        assert result.word_count > 0

    def test_paragraph_split(self, sample_txt_bytes):
        result = parse_txt(sample_txt_bytes)
        # Blank-line splitting should yield several paragraphs
        assert len(result.blocks) >= 3

    def test_content_present(self, sample_txt_bytes):
        result = parse_txt(sample_txt_bytes)
        all_text = " ".join(b.text for b in result.blocks)
        assert "Introduction" in all_text

    def test_utf8_decode_error_tolerates(self):
        """Parser should survive non-UTF-8 bytes."""
        bad_bytes = b"Hello \xff\xfe world"
        result = parse_txt(bad_bytes)
        assert len(result.blocks) >= 1

    def test_empty_file(self):
        result = parse_txt(b"")
        assert result.blocks == []
        assert result.word_count == 0
