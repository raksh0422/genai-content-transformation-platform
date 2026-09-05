"""Claim Extraction Service.

Deconstructs generated content into individual atomic factual statements
for evidence matching and audit analysis.
"""
from __future__ import annotations

import re
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ClaimExtractionService:
    """Extracts testable atomic factual statements from generated text and structured outputs."""

    @staticmethod
    def extract_claims(
        content: str,
        structured_output: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """
        Extract a clean list of atomic claims from transformation content or structured output.
        """
        claims: List[str] = []

        # 1. Extract from structured output if present
        if structured_output:
            if "items" in structured_output and isinstance(structured_output["items"], list):
                for item in structured_output["items"]:
                    if isinstance(item, dict) and "answer" in item:
                        claims.append(item["answer"])
            elif "questions" in structured_output and isinstance(structured_output["questions"], list):
                for q in structured_output["questions"]:
                    if isinstance(q, dict) and "explanation" in q:
                        claims.append(q["explanation"])
            elif "slides" in structured_output and isinstance(structured_output["slides"], list):
                for slide in structured_output["slides"]:
                    if isinstance(slide, dict) and "bullet_points" in slide:
                        claims.extend(slide["bullet_points"])

        # 2. Extract from raw content if no structured claims extracted
        if not claims and content:
            # Clean content lines
            lines = content.split("\n")
            for line in lines:
                cleaned = line.strip()
                if not cleaned or cleaned.startswith("#") or len(cleaned) < 15:
                    continue
                # Split into sentences using punctuation boundaries
                sentences = re.split(r"(?<=[.!?])\s+", cleaned)
                for sentence in sentences:
                    s_clean = sentence.strip()
                    # Filter out short or non-factual bullet points
                    if len(s_clean) >= 20 and not s_clean.startswith("[Source"):
                        claims.append(s_clean)

        # Deduplicate while preserving order
        seen = set()
        unique_claims = []
        for c in claims:
            if c not in seen:
                seen.add(c)
                unique_claims.append(c)

        logger.info("Extracted %d atomic claims from transformation output.", len(unique_claims))
        return unique_claims[:15]  # Cap at 15 claims for performance
