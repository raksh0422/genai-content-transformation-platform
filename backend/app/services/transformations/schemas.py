"""Pydantic schemas for structured transformation outputs."""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# FAQ Schema
# ---------------------------------------------------------------------------

class FAQItem(BaseModel):
    question: str = Field(description="The question based on the source document")
    answer: str = Field(description="Direct, grounded answer derived strictly from source context")
    source_citation: str = Field(description="Citation referencing page/slide or chunk number")


class FAQResponse(BaseModel):
    title: str = Field(default="Frequently Asked Questions")
    items: List[FAQItem]


# ---------------------------------------------------------------------------
# Quiz Schema
# ---------------------------------------------------------------------------

class QuizItem(BaseModel):
    question_number: int
    question: str = Field(description="The multiple-choice question stem")
    options: List[str] = Field(description="List of 4 distinct choices (A, B, C, D)")
    correct_answer: str = Field(description="The correct option letter e.g. 'A', 'B', 'C', or 'D'")
    explanation: str = Field(description="Explanation of why this answer is correct based on the source text")


class QuizResponse(BaseModel):
    title: str = Field(default="Document Intelligence Quiz")
    questions: List[QuizItem]


# ---------------------------------------------------------------------------
# Presentation Outline Schema
# ---------------------------------------------------------------------------

class SlideOutline(BaseModel):
    slide_number: int
    title: str = Field(description="Slide title")
    bullet_points: List[str] = Field(description="3-5 key points for this slide")
    source_citation: Optional[str] = Field(default=None, description="Source page/chunk citation for slide data")


class PresentationResponse(BaseModel):
    title: str = Field(default="Executive Presentation Outline")
    slides: List[SlideOutline]


# ---------------------------------------------------------------------------
# Email Schema
# ---------------------------------------------------------------------------

class EmailResponse(BaseModel):
    subject: str = Field(description="Professional email subject line")
    salutation: str = Field(default="Team,")
    body: str = Field(description="Main body text of the summary email")
    action_items: List[str] = Field(default_factory=list, description="Key action items or next steps")
    signoff: str = Field(default="Best regards,")


# ---------------------------------------------------------------------------
# Executive Summary Schema
# ---------------------------------------------------------------------------

class ExecutiveSummaryResponse(BaseModel):
    title: str = Field(default="Executive Briefing")
    overview: str = Field(description="High-level synthesis of the document")
    key_findings: List[str] = Field(description="Bullet points of critical findings")
    strategic_implications: List[str] = Field(default_factory=list, description="Strategic takeaways")


# ---------------------------------------------------------------------------
# Social Post Schema
# ---------------------------------------------------------------------------

class SocialPostResponse(BaseModel):
    platform: str = Field(default="LinkedIn / Professional Network")
    headline: str = Field(description="Attention-grabbing headline")
    post_text: str = Field(description="Full text of the social post")
    hashtags: List[str] = Field(default_factory=list, description="Relevant professional hashtags")
