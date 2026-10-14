"""Tests for plagiarism check and AI humanizer endpoints."""
import pytest
from httpx import AsyncClient

SAMPLE_AI_TEXT = (
    "Artificial intelligence is transforming modern industries rapidly. "
    "Organizations are investing heavily in automated workflows to enhance productivity. "
    "Leaders believe that continuous innovation is crucial for long-term growth and competitiveness."
)

SAMPLE_PARAGRAPHS = (
    "In today's fast-paced world, businesses must utilize cutting-edge solutions to remain competitive. "
    "Furthermore, leaders must optimize their operations and implement seamless workflows.\n\n"
    "To summarize, embracing change is paramount to achieve optimal performance and long-term viability."
)

SAMPLE_MINIMAL = "The solar panel converts sunlight into electricity for the home."


@pytest.mark.asyncio
async def test_humanize_transforms_input_text(client: AsyncClient):
    """Verify that humanizer genuinely rewrites input text rather than returning it unchanged."""
    payload = {
        "text": SAMPLE_AI_TEXT,
        "style": "natural",
        "intensity": "medium",
    }
    response = await client.post("/api/v1/tools/humanize", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["original_text"] == SAMPLE_AI_TEXT
    assert data["humanized_text"] != SAMPLE_AI_TEXT
    assert len(data["humanized_text"]) > 20
    assert len(data["changes_made"]) > 0
    assert data["ai_score_after"] <= data["ai_score_before"]


@pytest.mark.asyncio
async def test_humanize_styles(client: AsyncClient):
    """Verify all supported styles (casual, natural, professional, academic)."""
    for style in ["casual", "natural", "professional", "academic"]:
        payload = {
            "text": SAMPLE_PARAGRAPHS,
            "style": style,
            "intensity": "heavy",
        }
        response = await client.post("/api/v1/tools/humanize", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["humanized_text"] != SAMPLE_PARAGRAPHS
        assert len(data["changes_made"]) > 0


@pytest.mark.asyncio
async def test_humanize_minimal_text_guarantee(client: AsyncClient):
    """Verify that even plain text without buzzwords is guaranteed to be transformed."""
    payload = {
        "text": SAMPLE_MINIMAL,
        "style": "casual",
        "intensity": "medium",
    }
    response = await client.post("/api/v1/tools/humanize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["humanized_text"] != SAMPLE_MINIMAL


@pytest.mark.asyncio
async def test_humanize_short_text_validation(client: AsyncClient):
    """Verify minimum character length validation (min 20 chars)."""
    response = await client.post(
        "/api/v1/tools/humanize",
        json={"text": "Too short", "style": "natural", "intensity": "medium"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_plagiarism_check_endpoint(client: AsyncClient):
    """Verify plagiarism and AI detection endpoint."""
    response = await client.post(
        "/api/v1/tools/plagiarism-check",
        json={"text": SAMPLE_PARAGRAPHS},
    )
    assert response.status_code == 200
    data = response.json()
    assert "overall_score" in data
    assert "ai_generated_probability" in data
    assert "originality_score" in data
    assert "flagged_phrases" in data
    assert len(data["flagged_phrases"]) > 0


@pytest.mark.asyncio
async def test_humanize_ai_score_drops_significantly(client: AsyncClient):
    """Verify that ai_score_before and ai_score_after are NEVER equal and show a substantial drop."""
    test_cases = [
        SAMPLE_AI_TEXT,
        SAMPLE_PARAGRAPHS,
        SAMPLE_MINIMAL,
        "Machine learning models require large amounts of training data. High quality datasets ensure that the predictions are accurate and reliable.",
    ]
    for text in test_cases:
        response = await client.post(
            "/api/v1/tools/humanize",
            json={"text": text, "style": "natural", "intensity": "medium"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["ai_score_before"] > data["ai_score_after"], f"Expected score drop for: {text[:30]}"
        assert data["ai_score_before"] != data["ai_score_after"]
        assert (data["ai_score_before"] - data["ai_score_after"]) >= 15.0
