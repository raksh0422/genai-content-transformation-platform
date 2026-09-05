"""LLM Provider Abstraction.

Provides a unified interface for language model generation.
Supports OpenAI API (with model names centralized via Settings) and a
grounded deterministic mock provider for testing and keyless local environments.
"""
from __future__ import annotations

import abc
import json
import logging
from typing import Any, Dict, Optional, Type

from pydantic import BaseModel

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


class LLMResponse(BaseModel):
    """Container for generated content and model metadata."""
    content: str
    model_name: str
    structured_data: Optional[Dict[str, Any]] = None
    finish_reason: str = "stop"


class BaseLLMProvider(abc.ABC):
    """Abstract interface for LLM inference providers."""

    @abc.abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        response_schema: Optional[Type[BaseModel]] = None,
    ) -> LLMResponse:
        """
        Generate completion for prompt and system_prompt.
        Optionally enforce/parse a Pydantic response_schema for structured output.
        """
        pass


class OpenAILLMProvider(BaseLLMProvider):
    """OpenAI implementation using AsyncOpenAI."""

    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini") -> None:
        from openai import AsyncOpenAI
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model_name
        logger.info("OpenAILLMProvider initialized with model=%s", model_name)

    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        response_schema: Optional[Type[BaseModel]] = None,
    ) -> LLMResponse:
        try:
            kwargs: Dict[str, Any] = {
                "model": self._model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
            }

            if response_schema is not None:
                kwargs["response_format"] = {"type": "json_object"}

            response = await self._client.chat.completions.create(**kwargs)
            choice = response.choices[0]
            raw_content = choice.message.content or ""

            structured = None
            if response_schema is not None and raw_content:
                try:
                    data_dict = json.loads(raw_content)
                    validated = response_schema.model_validate(data_dict)
                    structured = validated.model_dump()
                except Exception as parse_exc:
                    logger.warning("Failed to parse structured JSON response: %s", parse_exc)

            return LLMResponse(
                content=raw_content,
                model_name=self._model,
                structured_data=structured,
                finish_reason=choice.finish_reason or "stop",
            )
        except Exception as exc:
            logger.error("OpenAI LLM generation failed: %s", exc)
            raise RuntimeError(f"OpenAI LLM error: {exc}") from exc


class MockGroundedLLMProvider(BaseLLMProvider):
    """
    Synthesizer for local environments without an active API key.
    Extracts actual document text from prompt context and synthesizes
    rich, tone-aware, varied multi-paragraph transformations.
    """

    def __init__(self, model_name: str = "mock-grounded-v2") -> None:
        self._model = model_name
        logger.info("MockGroundedLLMProvider initialized")

    def _extract_document_text(self, prompt: str) -> list[str]:
        """Extract document text lines from context block."""
        lines = []
        in_context = False
        for line in prompt.split("\n"):
            stripped = line.strip()
            if "Retrieved Document Context:" in stripped:
                in_context = True
                continue
            if "Task:" in stripped or "Tone:" in stripped:
                in_context = False
                continue
            if in_context:
                if stripped.startswith("[Chunk #") or stripped.startswith("[Source") or stripped == "---":
                    continue
                if stripped:
                    lines.append(stripped)
        return lines

    def _cap_sentence(self, text: str) -> str:
        """Capitalise first character without lowercasing rest of string."""
        text = text.strip()
        if not text:
            return text
        return text[0].upper() + text[1:]

    def _ensure_period(self, text: str) -> str:
        """Ensure terminal punctuation."""
        text = text.strip()
        if text and text[-1] not in ".!?":
            text += "."
        return text

    def _fix_sentence(self, text: str) -> str:
        """Capitalise first letter and ensure terminal punctuation."""
        return self._ensure_period(self._cap_sentence(text))

    def _get_tone_meta(self, tone: str) -> dict:
        """Return framing, connectors, and titles per tone."""
        tone = (tone or "professional").lower()
        if "casual" in tone:
            return {
                "label": "casual",
                "opening": "Here is a breakdown of what the document covers",
                "findings_intro": "The document highlights a few key points worth noting",
                "implications_intro": "Looking ahead, there are some key takeaways to consider",
                "connectors": ["Additionally,", "On top of that,", "It is also worth noting that", "Furthermore,", "Along the same lines,"],
                "overview_prefix": "This document walks through",
                "section_titles": ["What This Is About", "Main Points", "What It Means", "Next Steps & Takeaways", "Final Thoughts"],
                "finding_verb": "shows that",
                "implication_verb": "suggests that",
            }
        elif "academic" in tone:
            return {
                "label": "academic",
                "opening": "This document presents a rigorous examination of the subject matter",
                "findings_intro": "The empirical evidence and documented analysis reveal critical findings",
                "implications_intro": "The theoretical and practical implications derived from this analysis are as follows",
                "connectors": ["Moreover,", "Correspondingly,", "In addition to the aforementioned,", "The data further indicates that", "Consistent with this,"],
                "overview_prefix": "This scholarly document systematically analyses",
                "section_titles": ["Abstract & Scope", "Methodology & Context", "Empirical Findings", "Analytical Implications", "Conclusions & Recommendations"],
                "finding_verb": "demonstrates that",
                "implication_verb": "indicates that",
            }
        elif "executive" in tone:
            return {
                "label": "executive",
                "opening": "This executive briefing delivers a high-level synthesis of critical intelligence",
                "findings_intro": "The following strategic findings have been identified as highest priority for leadership",
                "implications_intro": "The strategic implications for organizational decision-making are as follows",
                "connectors": ["Critically,", "Of strategic importance,", "It is imperative to note that", "From a leadership perspective,", "In terms of organizational impact,"],
                "overview_prefix": "This executive briefing synthesises the core strategic intelligence from",
                "section_titles": ["Executive Overview", "Critical Findings", "Strategic Implications", "Risk & Opportunity Assessment", "Recommended Actions"],
                "finding_verb": "confirms that",
                "implication_verb": "necessitates that",
            }
        else:  # professional
            return {
                "label": "professional",
                "opening": "This document provides a comprehensive professional assessment of the subject matter",
                "findings_intro": "A thorough review of the source material has surfaced key findings",
                "implications_intro": "Based on the analysis, strategic and operational implications are relevant",
                "connectors": ["Furthermore,", "In addition,", "It is also important to note that", "Notably,", "Beyond this,"],
                "overview_prefix": "This document comprehensively addresses",
                "section_titles": ["Overview & Scope", "Key Findings", "Strategic Implications", "Operational Considerations", "Conclusions"],
                "finding_verb": "indicates that",
                "implication_verb": "suggests that",
            }

    def _varied_sentences(self, sentences: list[str], rng: Any, count: int) -> list[str]:
        """Return 'count' sentences in shuffled non-deterministic order."""
        if not sentences:
            return []
        pool = sentences[:]
        rng.shuffle(pool)
        selected = []
        for s in pool:
            if len(selected) >= count:
                break
            cleaned = self._fix_sentence(s)
            if cleaned and len(cleaned) > 12:
                selected.append(cleaned)
        while len(selected) < count and sentences:
            fallback = self._fix_sentence(rng.choice(sentences))
            if fallback not in selected:
                selected.append(fallback)
        return selected[:count]

    def _build_exec_overview(self, tone_meta: dict, sentences: list[str], rng: Any, is_detailed: bool) -> str:
        """Construct multi-paragraph overview for executive summary."""
        opening = tone_meta["opening"]
        prefix = tone_meta["overview_prefix"]
        connectors = tone_meta["connectors"]

        n_para = 4 if is_detailed else 3
        pool = self._varied_sentences(sentences, rng, n_para * 3)

        def make_para(sents: list[str], connector: str = "") -> str:
            if not sents:
                return ""
            parts = [self._fix_sentence(s) for s in sents if s.strip()]
            joined = " ".join(parts)
            return f"{connector} {joined}" if connector else joined

        p1 = make_para(pool[:n_para])
        c2 = rng.choice(connectors)
        p2 = make_para(pool[n_para:n_para * 2], c2)

        intro = f"{self._cap_sentence(opening)}. {prefix} the full breadth of topics, data points, and operational details documented in the source material."

        if is_detailed and len(pool) > n_para * 2:
            c3 = rng.choice([c for c in connectors if c != c2])
            p3 = make_para(pool[n_para * 2:], c3)
            return f"{intro}\n\n{p1}\n\n{p2}\n\n{p3}"
        return f"{intro}\n\n{p1}\n\n{p2}" if p2 else f"{intro}\n\n{p1}"

    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        response_schema: Optional[Type[BaseModel]] = None,
    ) -> LLMResponse:
        import re
        import random
        import time

        rng = random.Random(int(time.time() * 1000) % (2**31))

        doc_lines = self._extract_document_text(prompt)
        full_text = " ".join(doc_lines) if doc_lines else ""

        raw_sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', full_text) if len(s.strip()) > 10]
        extra = [ln.strip() for ln in doc_lines if len(ln.strip()) > 80 and not any(ln.strip() in s for s in raw_sentences)]
        sentences = raw_sentences + extra

        tone_raw = "professional"
        for line in prompt.split("\n"):
            if line.strip().lower().startswith("tone:"):
                tone_raw = line.split(":", 1)[1].strip()
                break

        tone_meta = self._get_tone_meta(tone_raw)

        if not sentences and not doc_lines:
            content = "The provided source document does not contain sufficient text information to perform this transformation."
            structured = {"error": "Insufficient context"}
            return LLMResponse(
                content=content,
                model_name=self._model,
                structured_data=structured,
                finish_reason="stop",
            )

        target_length = "medium"
        custom_line_count = None
        for line in prompt.split("\n"):
            if "Length" in line and ":" in line:
                target_length = line.split(":", 1)[1].strip().lower()
                import re
                match = re.search(r'(\d+)\s*lines?', target_length)
                if match:
                    custom_line_count = min(300, max(10, int(match.group(1))))
                break

        if custom_line_count is not None:
            is_short = custom_line_count <= 35
            is_medium = 35 < custom_line_count <= 75
            is_detailed = custom_line_count > 75
            target_lines = custom_line_count
        else:
            is_short = "short" in target_length
            is_detailed = "detail" in target_length or "extensive" in target_length
            is_medium = not is_short and not is_detailed
            target_lines = 100 if is_detailed else (20 if is_short else 50)

        structured: Optional[Dict[str, Any]] = None

        if response_schema is not None:
            schema_name = response_schema.__name__.lower()

            if "executivesummary" in schema_name:
                count_target = min(25, max(3, target_lines // 12)) if is_detailed else (3 if is_short else 5)
                all_shuffled = sentences[:]
                rng.shuffle(all_shuffled)

                overview_text = self._build_exec_overview(tone_meta, all_shuffled, rng, is_detailed)

                findings_pool = self._varied_sentences(all_shuffled, rng, count_target)
                finding_verb = tone_meta["finding_verb"]
                connector_pool = tone_meta["connectors"]

                findings = []
                for i, s in enumerate(findings_pool):
                    sentence_clean = self._fix_sentence(s)
                    if rng.random() > 0.5:
                        findings.append(sentence_clean)
                    else:
                        connector = connector_pool[i % len(connector_pool)]
                        findings.append(f"{connector} The document {finding_verb}: {sentence_clean[0].lower() + sentence_clean[1:]}")

                rng.shuffle(all_shuffled)
                implications_pool = self._varied_sentences(all_shuffled, rng, count_target)
                implication_verb = tone_meta["implication_verb"]

                implications = []
                for i, s in enumerate(implications_pool):
                    sentence_clean = self._fix_sentence(s)
                    if rng.random() > 0.4:
                        implications.append(sentence_clean)
                    else:
                        connector = connector_pool[(i + 2) % len(connector_pool)]
                        implications.append(f"{connector} This {implication_verb}: {sentence_clean[0].lower() + sentence_clean[1:]}")

                tone_titles = {
                    "casual": "Document Briefing: Key Highlights & What They Mean",
                    "academic": "Scholarly Analysis: Findings, Evidence & Theoretical Implications",
                    "executive": "Executive Intelligence Briefing: Strategic Priorities & Decisions",
                    "professional": "Professional Briefing: Comprehensive Analysis & Strategic Insights",
                }
                title = tone_titles.get(tone_meta["label"], "Executive Briefing & Strategic Summary")

                structured = {
                    "title": title,
                    "overview": overview_text,
                    "key_findings": findings if findings else ["Key operational procedures are detailed in the document text."],
                    "strategic_implications": implications if implications else ["Review strategic benchmarks with key stakeholders."],
                }
                content = json.dumps(structured, indent=2)

            elif "faq" in schema_name:
                items = []
                count_target = min(25, max(4, target_lines // 12)) if is_detailed else (4 if is_short else 6)
                shuffled = sentences[:]
                rng.shuffle(shuffled)
                sample_pool = shuffled[:count_target] if len(shuffled) >= count_target else shuffled

                question_frames = [
                    "What key information is presented regarding {}?",
                    "How does the document describe {}?",
                    "What conclusions are drawn about {}?",
                    "What is the significance of {} as outlined in the source?",
                    "What does the document specify about {}?",
                ]
                topics = ["this topic", "the process", "the methodology", "the findings", "the outcomes", "the data", "the recommendations", "the objectives", "the strategy", "the results"]
                rng.shuffle(topics)

                for idx, stmt in enumerate(sample_pool):
                    clean_stmt = self._fix_sentence(stmt)
                    topic = topics[idx % len(topics)]
                    q_frame = question_frames[idx % len(question_frames)]
                    items.append({
                        "question": q_frame.format(topic),
                        "answer": f"According to the source document: {clean_stmt} This provides foundational context for understanding overall objectives.",
                        "source_citation": f"Page {min(idx + 1, 10)}",
                    })
                if not items:
                    items = [{"question": "What is the primary objective of this document?", "answer": "The document provides guidelines.", "source_citation": "Page 1"}]
                structured = {"title": "Frequently Asked Questions", "items": items}
                content = json.dumps(structured, indent=2)

            elif "quiz" in schema_name:
                questions = []
                count_target = min(20, max(4, target_lines // 15)) if is_detailed else (4 if is_short else 6)
                shuffled = sentences[:]
                rng.shuffle(shuffled)
                sample_pool = shuffled[:count_target] if len(shuffled) >= count_target else shuffled

                distractor_pairs = [
                    ("The document provides no operational details", "This topic is excluded from the report"),
                    ("No conclusions were drawn in this section", "The findings were inconclusive"),
                    ("The source text is silent on this matter", "This was not within scope"),
                    ("Data was unavailable at time of writing", "The analysis was deferred"),
                ]
                question_stems = [
                    "Based on the document, which statement is accurate?",
                    "According to the source material, which of the following is correct?",
                    "Which of the following best reflects the document's content?",
                    "What does the source document indicate about this topic?",
                    "Which finding is directly supported by the document?",
                ]

                for idx, stmt in enumerate(sample_pool):
                    clean_stmt = self._fix_sentence(stmt)
                    dist = distractor_pairs[idx % len(distractor_pairs)]
                    stem = question_stems[idx % len(question_stems)]
                    options_raw = [clean_stmt, dist[0], dist[1], "None of the above statements are correct"]
                    shuffle_opts = options_raw[1:]
                    rng.shuffle(shuffle_opts)
                    correct_pos = rng.randint(0, 3)
                    opts_final = shuffle_opts[:correct_pos] + [clean_stmt] + shuffle_opts[correct_pos:]
                    labels = ["A", "B", "C", "D"]
                    questions.append({
                        "question_number": idx + 1,
                        "question": stem,
                        "options": [f"{labels[i]}) {opts_final[i]}" for i in range(4)],
                        "correct_answer": labels[correct_pos],
                        "explanation": f"The document explicitly states: '{clean_stmt}'",
                    })
                if not questions:
                    questions = [{"question_number": 1, "question": "What is the primary topic?", "options": ["A) Core findings", "B) Unrelated topics", "C) Invalid specification", "D) None of the above"], "correct_answer": "A", "explanation": "The source document details core findings."}]
                structured = {"title": "Document Intelligence Quiz", "questions": questions}
                content = json.dumps(structured, indent=2)

            elif "email" in schema_name:
                shuffled = sentences[:]
                rng.shuffle(shuffled)
                body_count = min(12, max(4, target_lines // 20)) if is_detailed else (2 if is_short else 4)
                salutation_options = ["Team,", "Dear Stakeholders,", "Dear Colleagues,", "Hi Team,", "To All Relevant Parties,"]
                signoff_options = ["Best regards,\nExecutive Content Briefing Team", "Kind regards,\nDocument Intelligence Team", "Warm regards,\nStrategic Intelligence Office", "Regards,\nExecutive Briefing Unit"]
                subject_options = [
                    "Executive Briefing: Document Summary & Key Takeaways",
                    "Stakeholder Digest: Critical Findings & Action Items",
                    "Intelligence Report: Strategic Insights from Document Review",
                    "Priority Update: Key Findings & Recommended Next Steps",
                ]
                tone_label = tone_meta["label"]
                subject = rng.choice(subject_options)
                salutation = "Hi Team," if tone_label == "casual" else ("To All Relevant Parties," if tone_label == "academic" else rng.choice(salutation_options[:3]))
                signoff = signoff_options[{"casual": 1, "academic": 2, "executive": 3}.get(tone_label, 0)]

                body_sents = [self._fix_sentence(s) for s in shuffled[:body_count] if s.strip()]
                body_paras = []
                for i in range(0, len(body_sents), 2):
                    body_paras.append(" ".join(body_sents[i:i+2]))
                body = "\n\n".join(body_paras) if body_paras else full_text[:600]

                actions_pool = self._varied_sentences(shuffled, rng, 6 if is_detailed else 3)
                actions = [f"Review and act on: {s[:80]}{'...' if len(s) > 80 else ''}" for s in actions_pool]

                structured = {"subject": subject, "salutation": salutation, "body": body, "action_items": actions if actions else ["Review document findings with stakeholders"], "signoff": signoff}
                
                # Format content as a ready-to-send real email draft
                action_bullets = "\n".join([f"• {item}" for item in (actions if actions else ["Review document findings with stakeholders"])])
                content = f"Subject: {subject}\n\n{salutation}\n\n{body}\n\nAction Items:\n{action_bullets}\n\n{signoff}"

            elif "social" in schema_name:
                shuffled = sentences[:]
                rng.shuffle(shuffled)
                headline_options = [
                    "Key Insights & Strategic Highlights",
                    "Breaking Down the Key Findings",
                    "What This Document Reveals: A Strategic Overview",
                    "Must-Know Takeaways from Our Latest Analysis",
                    "Intelligence Brief: Critical Findings Worth Sharing",
                ]
                platform_options = ["LinkedIn / Professional Network", "LinkedIn", "Twitter / X", "Professional Network"]
                hashtag_pools = [
                    ["#ExecutiveBriefing", "#DocumentIntelligence", "#Leadership", "#Strategy"],
                    ["#KeyFindings", "#BusinessIntelligence", "#Innovation", "#DataDriven"],
                    ["#StrategicInsights", "#Analytics", "#ExecutiveLeadership", "#Growth"],
                    ["#ProfessionalDevelopment", "#ResearchFindings", "#Insights", "#TeamWork"],
                ]
                post_sents = [self._fix_sentence(s) for s in shuffled[:3] if s.strip()]
                post_text = " ".join(post_sents[:2]) + "\n\n🔑 Key Takeaway: " + (post_sents[2] if len(post_sents) > 2 else "Operational alignment drives results.")
                structured = {"platform": rng.choice(platform_options), "headline": rng.choice(headline_options), "post_text": post_text, "hashtags": rng.choice(hashtag_pools)}
                content = json.dumps(structured, indent=2)

            elif "presentation" in schema_name:
                count_target = min(20, max(4, target_lines // 15)) if is_detailed else (4 if is_short else 6)
                shuffled = sentences[:]
                rng.shuffle(shuffled)
                sample_pool = shuffled[:count_target] if len(shuffled) >= count_target else shuffled
                slide_title_templates = [
                    "Section {n}: Core Analysis",
                    "Key Milestone {n}: Strategic Review",
                    "Insight {n}: Findings & Implications",
                    "Chapter {n}: Evidence & Outcomes",
                    "Module {n}: Operational Overview",
                ]
                slides = []
                for idx, stmt in enumerate(sample_pool):
                    clean_stmt = self._fix_sentence(stmt)
                    title_tmpl = slide_title_templates[idx % len(slide_title_templates)]
                    extra_bullets_pool = [
                        "Strategic impact and operational implications assessed.",
                        "Target benchmarks verified against source document data.",
                        "Stakeholder alignment recommended for implementation.",
                        "Risk factors identified and mitigation strategies proposed.",
                        "Performance metrics tracked for ongoing compliance.",
                    ]
                    rng.shuffle(extra_bullets_pool)
                    slides.append({
                        "slide_number": idx + 1,
                        "title": title_tmpl.format(n=idx + 1),
                        "bullet_points": [clean_stmt] + extra_bullets_pool[:2],
                        "source_citation": f"Page {min(idx + 1, 10)}",
                    })
                if not slides:
                    slides = [{"slide_number": 1, "title": "Executive Overview", "bullet_points": ["Key document findings detailed herein."], "source_citation": "Page 1"}]
                structured = {"title": "Executive Presentation Deck", "slides": slides}
                content = json.dumps(structured, indent=2)

            else:
                shuffled = sentences[:]
                rng.shuffle(shuffled)
                structured = {"summary": " ".join([self._fix_sentence(s) for s in shuffled[:5]]), "source": "Source Document"}
                content = json.dumps(structured, indent=2)

        else:
            shuffled = sentences[:]
            rng.shuffle(shuffled)
            connectors = tone_meta["connectors"]

            def build_paragraph(pool: list, n: int, connector: str = "") -> str:
                sents = [self._fix_sentence(s) for s in pool[:n] if s.strip() and len(s.strip()) > 10]
                joined = " ".join(sents)
                return f"{connector} {joined}" if connector and joined else joined

            if is_detailed:
                section_pool = shuffled[:]
                sub_titles = tone_meta["section_titles"] + [
                    "Detailed Operational Analysis",
                    "Key Performance Indicators & Metrics",
                    "Risk Assessment & Mitigation Strategies",
                    "Implementation Roadmap",
                    "Resource Allocation & Planning",
                    "Quality Assurance & Standards",
                    "Stakeholder Communication Plan",
                    "Governance & Regulatory Compliance",
                    "Technology & Infrastructure Highlights",
                    "Financial Impact & Budget Considerations",
                    "Change Management & Training",
                    "Conclusions & Final Recommendations",
                ]
                sections = [f"# {tone_meta['section_titles'][0]}: Comprehensive Briefing Document\n"]
                intro_para = build_paragraph(section_pool[:4], 4)
                sections.append(f"## 1. {sub_titles[0]}\n\n{tone_meta['opening']}. {tone_meta['overview_prefix']} the full scope of operational, strategic, and contextual details embedded within the source material.\n\n{intro_para}")

                # Scale sections count based on target_lines (up to 300 lines)
                target_sections = min(len(sub_titles), max(8, target_lines // 18))
                for idx in range(1, target_sections):
                    rng.shuffle(section_pool)
                    para1 = build_paragraph(section_pool[:3], 3)
                    connector = connectors[idx % len(connectors)]
                    para2 = build_paragraph(section_pool[3:6], 3, connector)
                    bullets_pool = [self._fix_sentence(s) for s in section_pool[:4] if s.strip()]
                    bullets = "\n".join([f"- **Observation {i+1}:** {b}" for i, b in enumerate(bullets_pool)])
                    sections.append(f"## {idx + 1}. {sub_titles[idx % len(sub_titles)]}\n\n{para1}\n\n{para2}\n\n{bullets}")

                content = "\n\n".join(sections)

            elif is_short:
                p1 = build_paragraph(shuffled[:3], 3)
                p2 = build_paragraph(shuffled[3:6], 3)
                sections = [
                    f"# {tone_meta['section_titles'][0]}\n",
                    f"## Overview\n\n{p1}",
                    f"## Key Takeaways\n\n{p2}",
                ]
                content = "\n\n".join(sections)
            else:
                p1 = build_paragraph(shuffled[:3], 3)
                p2 = build_paragraph(shuffled[3:6], 3)
                p3 = build_paragraph(shuffled[6:9], 3)
                bullets = "\n".join([f"- **Finding {i+1}:** {self._fix_sentence(s)}" for i, s in enumerate(shuffled[:5]) if s.strip()])
                sections = [
                    f"# {tone_meta['section_titles'][0]}\n",
                    f"## {tone_meta['section_titles'][1] if len(tone_meta['section_titles']) > 1 else 'Overview & Scope'}\n\n{p1}",
                    f"## {tone_meta['section_titles'][2] if len(tone_meta['section_titles']) > 2 else 'Key Analysis'}\n\n{p2}",
                    f"## Core Findings\n\n{bullets}",
                    f"## {tone_meta['section_titles'][4] if len(tone_meta['section_titles']) > 4 else 'Conclusions'}\n\n{p3}",
                ]
                content = "\n\n".join(sections)

        return LLMResponse(
            content=content,
            model_name=self._model,
            structured_data=structured,
            finish_reason="stop",
        )



def get_llm_provider(settings: Settings | None = None) -> BaseLLMProvider:
    """Factory helper returning the configured LLM provider."""
    if settings is None:
        settings = get_settings()

    if settings.openai_api_key and settings.openai_api_key.strip():
        return OpenAILLMProvider(
            api_key=settings.openai_api_key.strip(),
            model_name=settings.openai_model,
        )

    logger.warning("No OPENAI_API_KEY set. Falling back to MockGroundedLLMProvider.")
    return MockGroundedLLMProvider()
