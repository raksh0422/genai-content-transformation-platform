"""Token-aware text chunker with configurable size and overlap."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional

import tiktoken

from app.services.processing.models import ExtractedBlock

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    """A single text chunk ready for storage."""

    text: str
    token_count: int
    chunk_index: int
    page_number: Optional[int] = None
    slide_number: Optional[int] = None
    chunk_type: str = "paragraph"


def _get_encoder(encoding_name: str) -> tiktoken.Encoding:
    """Return a cached tiktoken encoder."""
    return tiktoken.get_encoding(encoding_name)


def _count_tokens(text: str, encoder: tiktoken.Encoding) -> int:
    """Count tokens in text."""
    return len(encoder.encode(text))


def _split_block_into_token_windows(
    text: str,
    encoder: tiktoken.Encoding,
    chunk_size: int,
    overlap: int,
) -> List[str]:
    """
    Split a single large text block into overlapping token windows.

    Args:
        text: Input text.
        encoder: tiktoken encoder instance.
        chunk_size: Max tokens per chunk.
        overlap: Number of overlap tokens between consecutive chunks.

    Returns:
        List of text windows.
    """
    token_ids = encoder.encode(text)
    if len(token_ids) <= chunk_size:
        return [text]

    stride = max(1, chunk_size - overlap)
    windows: List[str] = []
    start = 0
    while start < len(token_ids):
        end = min(start + chunk_size, len(token_ids))
        window_ids = token_ids[start:end]
        windows.append(encoder.decode(window_ids))
        if end == len(token_ids):
            break
        start += stride

    return windows


def chunk_blocks(
    blocks: List[ExtractedBlock],
    chunk_size: int,
    overlap: int,
    encoding_name: str = "cl100k_base",
) -> List[TextChunk]:
    """
    Chunk a list of ExtractedBlocks into token-aware TextChunks.

    Strategy:
      1. Accumulate blocks into a running buffer.
      2. When adding a block would exceed chunk_size, flush the buffer
         as a chunk (carrying overlap into the next chunk).
      3. If a single block is larger than chunk_size, split it with
         overlapping token windows.

    Args:
        blocks: Ordered list of extracted text blocks.
        chunk_size: Maximum tokens per chunk.
        overlap: Number of overlap tokens between consecutive chunks.
        encoding_name: tiktoken encoding to use.

    Returns:
        Ordered list of TextChunk objects.
    """
    encoder = _get_encoder(encoding_name)
    chunks: List[TextChunk] = []
    chunk_index = 0

    # Buffer accumulates blocks until chunk_size is reached
    buffer_texts: List[str] = []
    buffer_tokens: int = 0
    buffer_page: Optional[int] = None
    buffer_slide: Optional[int] = None
    buffer_type: str = "paragraph"

    def flush_buffer() -> None:
        nonlocal chunk_index, buffer_texts, buffer_tokens, buffer_page, buffer_slide, buffer_type
        if not buffer_texts:
            return
        joined = "\n\n".join(buffer_texts)
        actual_tokens = _count_tokens(joined, encoder)
        chunks.append(
            TextChunk(
                text=joined,
                token_count=actual_tokens,
                chunk_index=chunk_index,
                page_number=buffer_page,
                slide_number=buffer_slide,
                chunk_type=buffer_type,
            )
        )
        chunk_index += 1
        # Keep overlap: last `overlap` tokens worth of text
        if overlap > 0 and actual_tokens > overlap:
            overlap_ids = encoder.encode(joined)[-overlap:]
            overlap_text = encoder.decode(overlap_ids)
            buffer_texts = [overlap_text]
            buffer_tokens = overlap
        else:
            buffer_texts = []
            buffer_tokens = 0
        buffer_type = "paragraph"

    for block in blocks:
        block_tokens = _count_tokens(block.text, encoder)

        # If a single block exceeds chunk_size, split it independently
        if block_tokens > chunk_size:
            # Flush current buffer first
            flush_buffer()
            buffer_texts = []
            buffer_tokens = 0

            sub_windows = _split_block_into_token_windows(
                block.text, encoder, chunk_size, overlap
            )
            for window in sub_windows:
                window_tokens = _count_tokens(window, encoder)
                chunks.append(
                    TextChunk(
                        text=window,
                        token_count=window_tokens,
                        chunk_index=chunk_index,
                        page_number=block.page_number,
                        slide_number=block.slide_number,
                        chunk_type=block.block_type,
                    )
                )
                chunk_index += 1
            continue

        # Adding this block would overflow the buffer
        if buffer_tokens + block_tokens > chunk_size and buffer_texts:
            flush_buffer()

        # Accumulate
        if not buffer_texts:
            buffer_page = block.page_number
            buffer_slide = block.slide_number
        if block.block_type == "heading":
            buffer_type = "heading" if not buffer_texts else "mixed"
        buffer_texts.append(block.text)
        buffer_tokens += block_tokens

    # Flush remaining
    flush_buffer()

    logger.info(
        "Chunking complete: %d blocks → %d chunks (size=%d, overlap=%d)",
        len(blocks),
        len(chunks),
        chunk_size,
        overlap,
    )
    return chunks
