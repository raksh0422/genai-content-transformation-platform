"""Shared data structures for extracted document content."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ExtractedBlock:
    """A single block of text with structural and location metadata."""

    text: str
    block_type: str = "paragraph"  # "heading" | "paragraph"
    page_number: Optional[int] = None   # 1-indexed for PDF pages
    slide_number: Optional[int] = None  # 1-indexed for PPTX slides


@dataclass
class ExtractionResult:
    """The full result of a document extraction pass."""

    blocks: List[ExtractedBlock] = field(default_factory=list)
    page_count: Optional[int] = None
    word_count: int = 0

    @property
    def full_text(self) -> str:
        """Join all block texts with newlines."""
        return "\n\n".join(b.text for b in self.blocks if b.text.strip())
