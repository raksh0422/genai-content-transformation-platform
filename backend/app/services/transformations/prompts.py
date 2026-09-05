"""Prompt definitions and configurations for all 7 transformation types."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional, Type
from pydantic import BaseModel

from app.services.transformations.schemas import (
    EmailResponse,
    ExecutiveSummaryResponse,
    FAQResponse,
    PresentationResponse,
    QuizResponse,
    SocialPostResponse,
)


@dataclass
class TransformationConfig:
    type_name: str
    display_title: str
    description: str
    system_prompt: str
    user_prompt_template: str
    schema_class: Optional[Type[BaseModel]] = None


from app.services.security import SECURITY_SYSTEM_DIRECTIVE

SYSTEM_BASE_INSTRUCTIONS = (
    SECURITY_SYSTEM_DIRECTIVE +
    "You are an expert AI Content Analyst. "
    "Your mandate is to generate content STRICTLY AND EXCLUSIVELY based on the provided source document context. "
    "CRITICAL GROUNDING RULES:\n"
    "1. Do NOT assume, extrapolate, or introduce external facts not present in the provided context.\n"
    "2. If the retrieved context does NOT contain sufficient information to fulfill the request, explicitly state: "
    "'The provided source document does not contain sufficient information to perform this transformation.'\n"
    "3. Where helpful, reference the specific page or slide number (e.g. 'Page 3', 'Slide 2'). "
    "Do NOT reference chunk IDs, chunk indexes, or internal processing identifiers.\n"
)

PROMPTS: Dict[str, TransformationConfig] = {
    "short_summary": TransformationConfig(
        type_name="short_summary",
        display_title="Document Summary & Briefing",
        description="A grounded summary scaled to your requested length (Short, Medium, Detailed, or Custom line count).",
        system_prompt=SYSTEM_BASE_INSTRUCTIONS + (
            "Format your output with clear markdown section headers (# Title, ## Section) and well-developed paragraphs. "
            "STRICT LENGTH GUIDELINES:\n"
            "- If Length is 'short': Write approx 15-20 lines (2 concise sections).\n"
            "- If Length is 'medium': Write approx 45-50 lines (4-5 structured sections/paragraphs).\n"
            "- If Length is 'detailed' or specifies custom line targets (e.g. 100 to 300 lines): Write a comprehensive, extensive 80-300+ line document with multiple detailed sections, in-depth paragraph analysis, bulleted findings, and thorough conclusions."
        ),
        user_prompt_template=(
            "Tone: {tone}\n"
            "Target Length Requirement: {length}\n\n"
            "Retrieved Document Context:\n{context}\n\n"
            "Task: Generate a grounded document summary matching the Target Length Requirement above. If Length specifies 'detailed' or a custom line count (e.g. up to 300 lines), provide an extensive multi-section report spanning multiple paragraphs and full line depth."
        ),
    ),
    "executive_summary": TransformationConfig(
        type_name="executive_summary",
        display_title="Executive Briefing",
        description="A structured executive summary with overview, key findings, and strategic takeaways.",
        system_prompt=SYSTEM_BASE_INSTRUCTIONS + "Return a structured JSON matching the ExecutiveSummary schema. Scale the number of key findings and strategic implications according to the requested Length (e.g., Detailed or 100 lines requires 8-10 thorough findings and strategic implications).",
        user_prompt_template=(
            "Tone: {tone}\nLength Requirement: {length}\n\n"
            "Retrieved Document Context:\n{context}\n\n"
            "Task: Generate an executive briefing with an overview, key findings, and strategic implications based strictly on the context. Expand depth to match the requested Length."
        ),
        schema_class=ExecutiveSummaryResponse,
    ),
    "faq": TransformationConfig(
        type_name="faq",
        display_title="Frequently Asked Questions (FAQ)",
        description="A structured Q&A set with answers grounded in the document context.",
        system_prompt=SYSTEM_BASE_INSTRUCTIONS + "Return a structured JSON with question, answer, and source_citation (using Page or Slide number only, not chunk IDs). Scale the number of Q&A pairs to match the requested Length (e.g., Detailed requires 8-10 comprehensive Q&A items).",
        user_prompt_template=(
            "Tone: {tone}\nLength Requirement: {length}\n\n"
            "Retrieved Document Context:\n{context}\n\n"
            "Task: Create Frequently Asked Questions (FAQ) with answers derived directly from the text above. Scale the Q&A set depth according to the requested Length."
        ),
        schema_class=FAQResponse,
    ),
    "quiz": TransformationConfig(
        type_name="quiz",
        display_title="Multiple-Choice Quiz",
        description="A 3-5 question quiz with multiple choice options and answer explanations.",
        system_prompt=SYSTEM_BASE_INSTRUCTIONS + "Return a structured JSON with questions, 4 options (A-D), correct_answer, and explanation. Scale the number of questions to match the requested Length (e.g. Detailed requires 8-10 questions). Do NOT include chunk IDs in explanations.",
        user_prompt_template=(
            "Tone: {tone}\nLength Requirement: {length}\n\n"
            "Retrieved Document Context:\n{context}\n\n"
            "Task: Create a multiple-choice quiz based strictly on the document text. Each question must have 4 options (A, B, C, D) and a plain-language explanation. Scale question count according to Length."
        ),
        schema_class=QuizResponse,
    ),
    "email": TransformationConfig(
        type_name="email",
        display_title="Executive Email Digest",
        description="A professional email draft summarizing key findings for stakeholders.",
        system_prompt=SYSTEM_BASE_INSTRUCTIONS + "Return a structured JSON with subject, salutation, body, action_items, and signoff. Scale the body depth and action items list according to Length.",
        user_prompt_template=(
            "Tone: {tone}\nLength Requirement: {length}\n\n"
            "Retrieved Document Context:\n{context}\n\n"
            "Task: Draft a professional summary email summarizing document highlights and action items for stakeholders. Match depth to requested Length."
        ),
        schema_class=EmailResponse,
    ),
    "social_post": TransformationConfig(
        type_name="social_post",
        display_title="Social Media Post",
        description="An engaging professional post highlight formatted for LinkedIn/Twitter.",
        system_prompt=SYSTEM_BASE_INSTRUCTIONS + "Return a structured JSON with platform, headline, post_text, and hashtags.",
        user_prompt_template=(
            "Tone: {tone}\nLength Requirement: {length}\n\n"
            "Retrieved Document Context:\n{context}\n\n"
            "Task: Draft a professional social post highlighting key insights from the document context."
        ),
        schema_class=SocialPostResponse,
    ),
    "presentation_outline": TransformationConfig(
        type_name="presentation_outline",
        display_title="Presentation Slide Deck",
        description="A structured slide deck outline with slide titles and bullet points.",
        system_prompt=SYSTEM_BASE_INSTRUCTIONS + "Return a structured JSON with title and slides (slide_number, title, bullet_points, source_citation). Scale slide count to match Length (e.g. Detailed requires 8-10 slides).",
        user_prompt_template=(
            "Tone: {tone}\nLength Requirement: {length}\n\n"
            "Retrieved Document Context:\n{context}\n\n"
            "Task: Create a presentation slide deck outline based on the document context matching the requested Length."
        ),
        schema_class=PresentationResponse,
    ),
}


def get_transformation_config(transformation_type: str) -> TransformationConfig:
    """Retrieve configuration for a specified transformation type."""
    if transformation_type not in PROMPTS:
        raise ValueError(f"Unknown transformation_type: '{transformation_type}'. Valid types: {list(PROMPTS.keys())}")
    return PROMPTS[transformation_type]
