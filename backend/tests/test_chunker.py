"""Unit tests for token-aware chunker."""
import pytest

from app.services.processing.chunker import chunk_blocks, TextChunk
from app.services.processing.models import ExtractedBlock


def _make_blocks(texts: list[str], block_type: str = "paragraph") -> list[ExtractedBlock]:
    return [ExtractedBlock(text=t, block_type=block_type) for t in texts]


class TestChunkBlocks:
    def test_empty_input(self):
        chunks = chunk_blocks([], chunk_size=128, overlap=16)
        assert chunks == []

    def test_single_short_block(self):
        blocks = _make_blocks(["Hello world. This is a short paragraph."])
        chunks = chunk_blocks(blocks, chunk_size=128, overlap=16)
        assert len(chunks) == 1
        assert chunks[0].chunk_index == 0
        assert "Hello world" in chunks[0].text

    def test_indices_are_sequential(self):
        blocks = _make_blocks(["word " * 20] * 10)
        chunks = chunk_blocks(blocks, chunk_size=30, overlap=5)
        for i, chunk in enumerate(chunks):
            assert chunk.chunk_index == i

    def test_token_count_within_limit(self):
        """All chunks must be at or under chunk_size tokens."""
        import tiktoken
        encoder = tiktoken.get_encoding("cl100k_base")
        blocks = _make_blocks(["The quick brown fox jumps over the lazy dog. "] * 50)
        chunks = chunk_blocks(blocks, chunk_size=50, overlap=10)
        for chunk in chunks:
            actual = len(encoder.encode(chunk.text))
            assert actual <= 50, f"Chunk {chunk.chunk_index} has {actual} tokens (limit 50)"

    def test_large_single_block_is_split(self):
        """A block longer than chunk_size must be split into multiple chunks."""
        long_text = "token " * 200  # ~200 tokens
        blocks = _make_blocks([long_text])
        chunks = chunk_blocks(blocks, chunk_size=50, overlap=10)
        assert len(chunks) > 1

    def test_overlap_creates_shared_tokens(self):
        """With overlap, consecutive chunks should share tail/head tokens."""
        import tiktoken
        encoder = tiktoken.get_encoding("cl100k_base")
        # Enough content to produce multiple chunks
        blocks = _make_blocks(["word " * 100])
        chunks = chunk_blocks(blocks, chunk_size=30, overlap=10)
        assert len(chunks) >= 2
        # Verify overlap: last 10 tokens of chunk[0] should appear in chunk[1] start
        ids_0 = encoder.encode(chunks[0].text)
        ids_1 = encoder.encode(chunks[1].text)
        overlap_from_0 = ids_0[-10:]
        start_of_1 = ids_1[:10]
        # At least some overlap
        assert any(tok in start_of_1 for tok in overlap_from_0)

    def test_page_number_preserved(self):
        blocks = [
            ExtractedBlock(text="Page one content.", page_number=1),
            ExtractedBlock(text="Page two content.", page_number=2),
        ]
        chunks = chunk_blocks(blocks, chunk_size=128, overlap=0)
        # All chunks should have a page number
        for chunk in chunks:
            assert chunk.page_number is not None

    def test_slide_number_preserved(self):
        blocks = [
            ExtractedBlock(text="Slide content.", slide_number=3),
        ]
        chunks = chunk_blocks(blocks, chunk_size=128, overlap=0)
        assert chunks[0].slide_number == 3

    def test_chunk_type_heading(self):
        blocks = _make_blocks(["Short Heading"], block_type="heading")
        chunks = chunk_blocks(blocks, chunk_size=128, overlap=0)
        assert chunks[0].chunk_type == "heading"

    def test_configurable_chunk_size(self):
        """Smaller chunk_size produces more chunks than larger chunk_size."""
        blocks = _make_blocks(["word " * 50] * 5)
        chunks_small = chunk_blocks(blocks, chunk_size=20, overlap=0)
        chunks_large = chunk_blocks(blocks, chunk_size=200, overlap=0)
        assert len(chunks_small) > len(chunks_large)

    def test_zero_overlap(self):
        """Chunking with zero overlap should still produce valid chunks."""
        blocks = _make_blocks(["word " * 100])
        chunks = chunk_blocks(blocks, chunk_size=30, overlap=0)
        assert len(chunks) > 0
        for chunk in chunks:
            assert chunk.text.strip()
