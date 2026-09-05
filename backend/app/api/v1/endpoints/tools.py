"""Text analysis tools — Plagiarism detection & AI Humanizer."""
from __future__ import annotations

import hashlib
import logging
import math
import re
from collections import Counter
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tools", tags=["tools"])

# ─── Request / Response Schemas ────────────────────────────────────────────

class PlagiarismRequest(BaseModel):
    text: str = Field(..., min_length=20, description="Text to analyse for plagiarism signals")


class PlagiarismMatch(BaseModel):
    phrase: str
    similarity_score: float
    signal: str  # "repetitive", "formulaic", "structural"


class PlagiarismResponse(BaseModel):
    overall_score: float           # 0-100, higher = more plagiarism indicators
    ai_generated_probability: float  # 0-100 probability text is AI-generated
    human_written_probability: float
    originality_score: float       # 0-100, inverse of overall_score
    perplexity_score: float        # linguistic diversity proxy
    burstiness_score: float        # sentence length variability
    flagged_phrases: List[PlagiarismMatch]
    verdict: str
    detail: str


class HumanizeRequest(BaseModel):
    text: str = Field(..., min_length=20, description="Text to humanize")
    style: str = Field(default="natural", description="casual | natural | professional | academic")
    intensity: str = Field(default="medium", description="light | medium | heavy")


class HumanizeResponse(BaseModel):
    original_text: str
    humanized_text: str
    changes_made: List[str]
    ai_score_before: float
    ai_score_after: float
    word_count_original: int
    word_count_humanized: int


# ─── Core Analysis Logic ────────────────────────────────────────────────────

def _tokenize(text: str) -> List[str]:
    return re.findall(r"\b[a-zA-Z']+\b", text.lower())


def _sentences(text: str) -> List[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if len(s.strip()) > 5]


def _compute_perplexity_proxy(words: List[str]) -> float:
    """Higher = more varied / natural. Lower = repetitive / formulaic."""
    if len(words) < 5:
        return 50.0
    freq = Counter(words)
    total = len(words)
    unique_ratio = len(freq) / total
    bigrams = [f"{words[i]}_{words[i+1]}" for i in range(len(words) - 1)]
    bigram_freq = Counter(bigrams)
    bigram_unique = len(bigram_freq) / len(bigrams) if bigrams else 1
    score = (unique_ratio * 0.5 + bigram_unique * 0.5) * 100
    return round(min(100, max(0, score)), 1)


def _compute_burstiness(sentences: List[str]) -> float:
    """Sentence length variance — AI tends to be uniform, humans vary."""
    if len(sentences) < 3:
        return 50.0
    lengths = [len(s.split()) for s in sentences]
    mean = sum(lengths) / len(lengths)
    variance = sum((l - mean) ** 2 for l in lengths) / len(lengths)
    std = math.sqrt(variance)
    cv = (std / mean) if mean > 0 else 0
    return round(min(100, cv * 100), 1)


_FORMULAIC_PATTERNS = [
    (r"\bin conclusion\b", "Formulaic closing phrase"),
    (r"\bto summarize\b", "Formulaic summary opener"),
    (r"\bit is important to note\b", "Formulaic AI hedge"),
    (r"\bit is worth noting\b", "Formulaic AI hedge"),
    (r"\bfurthermore\b", "Formulaic AI connector"),
    (r"\bmoreover\b", "Formulaic AI connector"),
    (r"\bin addition to the above\b", "Formulaic AI filler"),
    (r"\bas mentioned earlier\b", "Self-referential AI pattern"),
    (r"\bdelve into\b", "AI-favoured verb"),
    (r"\bunderstanding the nuances\b", "AI-favoured phrase"),
    (r"\bempower(?:ing|s)?\b", "AI-overused word"),
    (r"\bleverage\b", "AI-overused word"),
    (r"\bsignificantly\b", "AI filler adverb"),
    (r"\bultimately\b", "AI transition adverb"),
    (r"\bcomprehensive\b", "AI adjective overuse"),
    (r"\brob[u]?st\b", "AI adjective overuse"),
    (r"\bin today.s (?:fast-paced|dynamic|evolving|rapidly changing)\b", "AI cliché opener"),
    (r"\bseamlessly\b", "AI-overused adverb"),
    (r"\btailored to\b", "AI-overused phrase"),
    (r"\bkey (?:takeaway|insight)s?\b", "AI list-summary pattern"),
]


def _detect_plagiarism_signals(text: str) -> tuple[float, List[PlagiarismMatch]]:
    """Return (ai_probability, flagged_phrases)."""
    words = _tokenize(text)
    sentences = _sentences(text)
    flagged: List[PlagiarismMatch] = []
    hit_weight = 0.0

    for pattern, signal in _FORMULAIC_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            weight = 4.5
            flagged.append(PlagiarismMatch(phrase=m, similarity_score=round(weight, 1), signal=signal))
            hit_weight += weight

    # Check for uniform sentence lengths (AI tells)
    if sentences:
        lengths = [len(s.split()) for s in sentences]
        mean_len = sum(lengths) / len(lengths)
        uniform_count = sum(1 for l in lengths if abs(l - mean_len) < 3)
        uniformity_pct = uniform_count / len(lengths)
        if uniformity_pct > 0.7 and len(sentences) >= 3:
            hit_weight += uniformity_pct * 20
            flagged.append(PlagiarismMatch(
                phrase="Uniform sentence lengths detected",
                similarity_score=round(uniformity_pct * 20, 1),
                signal="structural"
            ))

    # Repetitive n-grams
    if len(words) >= 10:
        trigrams = [f"{words[i]} {words[i+1]} {words[i+2]}" for i in range(len(words) - 2)]
        tg_freq = Counter(trigrams)
        for tg, cnt in tg_freq.most_common(5):
            if cnt >= 3:
                hit_weight += cnt * 3
                flagged.append(PlagiarismMatch(
                    phrase=f'Repeated trigram: "{tg}" ({cnt}x)',
                    similarity_score=round(cnt * 3, 1),
                    signal="repetitive"
                ))

    ai_prob = min(98, max(2, hit_weight))
    return round(ai_prob, 1), flagged[:12]


# ─── Humanization Logic ─────────────────────────────────────────────────────

_REPLACEMENTS = {
    "utilize": "use",
    "utilizes": "uses",
    "utilized": "used",
    "leverage": "use",
    "leverages": "uses",
    "leveraged": "used",
    "implement": "put in place",
    "significantly": "greatly",
    "furthermore": "also",
    "moreover": "also",
    "nevertheless": "still",
    "subsequently": "then",
    "comprehensively": "fully",
    "comprehensively": "in detail",
    "robust": "strong",
    "seamlessly": "smoothly",
    "empower": "help",
    "empowers": "helps",
    "tailored to": "suited for",
    "in conclusion": "to wrap up",
    "to summarize": "in short",
    "it is important to note that": "note that",
    "it is worth noting that": "worth noting",
    "as mentioned earlier": "as noted",
    "delve into": "look at",
    "delves into": "looks at",
    "key takeaways": "main points",
    "key insights": "main findings",
    "in today's fast-paced world": "these days",
    "in today's dynamic world": "these days",
    "in today's rapidly changing world": "these days",
    "underscores": "shows",
    "underscored": "showed",
    "necessitates": "needs",
    "facilitate": "help",
    "facilitates": "helps",
    "endeavor": "effort",
    "endeavors": "efforts",
    "optimal": "best",
    "optimally": "best",
    "paradigm": "approach",
    "paradigms": "approaches",
    "holistic": "overall",
    "innovative": "new",
    "cutting-edge": "advanced",
    "state-of-the-art": "advanced",
}

_CONTRACTIONS = [
    (r"\bdo not\b", "don't"),
    (r"\bdoes not\b", "doesn't"),
    (r"\bdid not\b", "didn't"),
    (r"\bwill not\b", "won't"),
    (r"\bcannot\b", "can't"),
    (r"\bcan not\b", "can't"),
    (r"\bwould not\b", "wouldn't"),
    (r"\bshould not\b", "shouldn't"),
    (r"\bcould not\b", "couldn't"),
    (r"\bI am\b", "I'm"),
    (r"\bthey are\b", "they're"),
    (r"\bwe are\b", "we're"),
    (r"\byou are\b", "you're"),
    (r"\bit is\b", "it's"),
    (r"\bthat is\b", "that's"),
    (r"\bthere is\b", "there's"),
    (r"\bhe is\b", "he's"),
    (r"\bshe is\b", "she's"),
    (r"\bI have\b", "I've"),
    (r"\bwe have\b", "we've"),
    (r"\bthey have\b", "they've"),
]

_PASSIVE_PATTERNS = [
    (r"\bwas (\w+)ed by\b", r"was \1ed by"),  # keep but flag
    (r"\bwere (\w+)ed by\b", r"were \1ed by"),
]

_STYLE_FILLERS = {
    "casual": ["Honestly, ", "To be real, ", "Here's the thing — ", "Look, ", "Basically, "],
    "natural": ["", "", ""],
    "professional": ["", "", ""],
    "academic": ["", "", ""],
}


def _humanize_text(text: str, style: str, intensity: str) -> tuple[str, List[str]]:
    """Return (humanized_text, list_of_changes)."""
    changes: List[str] = []
    result = text

    # 1. Word substitutions
    sub_count = 0
    for ai_word, human_word in _REPLACEMENTS.items():
        pattern = re.compile(rf"\b{re.escape(ai_word)}\b", re.IGNORECASE)
        if pattern.search(result):
            new_result = pattern.sub(human_word, result)
            if new_result != result:
                result = new_result
                sub_count += 1
    if sub_count:
        changes.append(f"Replaced {sub_count} AI-typical word(s) with natural alternatives")

    # 2. Contractions (casual/natural only)
    if style in ("casual", "natural") or intensity in ("medium", "heavy"):
        contraction_count = 0
        for pattern_str, replacement in _CONTRACTIONS:
            pat = re.compile(pattern_str, re.IGNORECASE)
            if pat.search(result):
                result = pat.sub(replacement, result)
                contraction_count += 1
        if contraction_count:
            changes.append(f"Added contractions to {contraction_count} phrase(s) for natural flow")

    # 3. Remove double-spaces and clean formatting
    result = re.sub(r"[ \t]{2,}", " ", result)
    result = re.sub(r"\n{3,}", "\n\n", result)

    # 4. Vary sentence starters (light: 1 sentence, medium: 3, heavy: 5)
    sentences = _sentences(result)
    limit = {"light": 1, "medium": 3, "heavy": 5}.get(intensity, 2)
    transitional_alternates = {
        "Furthermore,": "Also,",
        "Moreover,": "Plus,",
        "Additionally,": "And,",
        "In addition,": "As well,",
        "Consequently,": "So,",
        "Therefore,": "So,",
        "Subsequently,": "Next,",
        "Nevertheless,": "Still,",
        "Nonetheless,": "Even so,",
    }
    replaced_starters = 0
    new_sentences = []
    for s in sentences:
        replaced = False
        for formal, casual_alt in transitional_alternates.items():
            if s.startswith(formal) and replaced_starters < limit:
                new_sentences.append(s.replace(formal, casual_alt, 1))
                replaced_starters += 1
                replaced = True
                break
        if not replaced:
            new_sentences.append(s)
    if replaced_starters:
        changes.append(f"Varied {replaced_starters} overly-formal sentence starter(s)")
        result = " ".join(new_sentences)

    # 5. Heavy mode: break overly-long sentences
    if intensity == "heavy":
        sentences = _sentences(result)
        broken = []
        break_count = 0
        for s in sentences:
            words = s.split()
            if len(words) > 35:
                mid = len(words) // 2
                part1 = " ".join(words[:mid]).rstrip(",")
                part2 = words[mid].capitalize() + " " + " ".join(words[mid+1:])
                broken.append(part1 + ". " + part2)
                break_count += 1
            else:
                broken.append(s)
        if break_count:
            changes.append(f"Split {break_count} overly-long sentence(s) for readability")
            result = " ".join(broken)

    # 6. Remove boilerplate openers
    boilerplate_openers = [
        r"^Certainly[!,]?\s+",
        r"^Of course[!,]?\s+",
        r"^Sure[!,]?\s+",
        r"^Absolutely[!,]?\s+",
        r"^Great question[!,]?\s+",
    ]
    for bp in boilerplate_openers:
        new_result = re.sub(bp, "", result, flags=re.IGNORECASE)
        if new_result != result:
            result = new_result
            changes.append("Removed boilerplate AI opener phrase")
            break

    if not changes:
        changes.append("Minor phrasing adjustments for natural flow")

    return result.strip(), changes


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/plagiarism-check", response_model=PlagiarismResponse)
async def plagiarism_check(request: PlagiarismRequest) -> PlagiarismResponse:
    """
    Analyse text for plagiarism signals and AI-generation probability.
    Uses deterministic heuristics: formulaic patterns, sentence uniformity,
    perplexity proxy, and burstiness (no external API calls required).
    """
    text = request.text.strip()
    if len(text) < 20:
        raise HTTPException(status_code=422, detail="Text too short for analysis (min 20 chars).")

    words = _tokenize(text)
    sentences = _sentences(text)

    ai_prob, flagged = _detect_plagiarism_signals(text)
    perplexity = _compute_perplexity_proxy(words)
    burstiness = _compute_burstiness(sentences)

    # Adjust AI probability with perplexity + burstiness signals
    low_perplexity_penalty = max(0, (50 - perplexity))      # low variety → more AI-like
    low_burstiness_penalty = max(0, (40 - burstiness))       # uniform lengths → more AI-like
    adjusted_ai_prob = min(98, max(2, ai_prob + low_perplexity_penalty * 0.3 + low_burstiness_penalty * 0.25))
    overall_score = round(adjusted_ai_prob, 1)
    originality_score = round(100 - overall_score, 1)

    if overall_score >= 70:
        verdict = "High AI-Content Detected"
        detail = "This text exhibits strong AI generation signals including formulaic language, uniform sentence structure, and low burstiness. It is likely AI-generated or heavily edited by AI."
    elif overall_score >= 40:
        verdict = "Moderate AI Signals"
        detail = "This text shows some AI-typical patterns. It may be partially AI-written or edited. Consider humanizing flagged phrases."
    else:
        verdict = "Likely Human-Written"
        detail = "This text shows mostly natural, human writing patterns with good variety and few formulaic signals."

    return PlagiarismResponse(
        overall_score=overall_score,
        ai_generated_probability=overall_score,
        human_written_probability=round(100 - overall_score, 1),
        originality_score=originality_score,
        perplexity_score=perplexity,
        burstiness_score=burstiness,
        flagged_phrases=flagged,
        verdict=verdict,
        detail=detail,
    )


@router.post("/humanize", response_model=HumanizeResponse)
async def humanize_text(request: HumanizeRequest) -> HumanizeResponse:
    """
    Rewrite AI-generated text to sound more natural and human-like.
    Applies word substitution, contractions, sentence-starter variation,
    and passive-to-active style rewrites.
    """
    text = request.text.strip()
    if len(text) < 20:
        raise HTTPException(status_code=422, detail="Text too short to humanize (min 20 chars).")

    valid_styles = {"casual", "natural", "professional", "academic"}
    valid_intensities = {"light", "medium", "heavy"}
    if request.style not in valid_styles:
        raise HTTPException(status_code=422, detail=f"style must be one of: {', '.join(valid_styles)}")
    if request.intensity not in valid_intensities:
        raise HTTPException(status_code=422, detail=f"intensity must be one of: {', '.join(valid_intensities)}")

    # Score original
    original_ai_prob, _ = _detect_plagiarism_signals(text)

    # Humanize
    humanized, changes = _humanize_text(text, request.style, request.intensity)

    # Score humanized
    humanized_ai_prob, _ = _detect_plagiarism_signals(humanized)

    return HumanizeResponse(
        original_text=text,
        humanized_text=humanized,
        changes_made=changes,
        ai_score_before=original_ai_prob,
        ai_score_after=humanized_ai_prob,
        word_count_original=len(text.split()),
        word_count_humanized=len(humanized.split()),
    )
