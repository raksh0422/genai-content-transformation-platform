"""Script to generate realistic, professional multi-page sample PDFs and text reports
for ContentAI college expo demonstrations.
"""
from __future__ import annotations

import os
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and draw total page counts."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        if self._pageNumber == 1:
            return  # Suppress headers/footers on cover page
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#69736C"))

        # Header
        self.drawString(54, 750, "ContentAI Technical Demonstration — Confidential & Proprietary")
        self.setStrokeColor(colors.HexColor("#E4E8E3"))
        self.setLineWidth(0.5)
        self.line(54, 744, 558, 744)

        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 40, page_str)
        self.drawString(54, 40, "Automated Content Transformation Platform — Expo 2026")
        self.line(54, 50, 558, 50)
        self.restoreState()


def build_styles():
    base = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CoverTitle",
        parent=base["Title"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=32,
        textColor=colors.HexColor("#202522"),
        alignment=0,
        spaceAfter=12,
    )
    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#315B46"),
        alignment=0,
        spaceAfter=24,
    )
    meta_style = ParagraphStyle(
        "CoverMeta",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=14,
        textColor=colors.HexColor("#69736C"),
    )
    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=base["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#202522"),
        spaceBefore=16,
        spaceAfter=10,
        keepWithNext=True,
    )
    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=base["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#315B46"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )
    body_style = ParagraphStyle(
        "Body_Custom",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#2E3330"),
        spaceAfter=8,
    )
    bullet_style = ParagraphStyle(
        "Bullet_Custom",
        parent=body_style,
        leftIndent=16,
        firstLineIndent=-10,
        spaceAfter=5,
    )
    callout_style = ParagraphStyle(
        "Callout_Custom",
        parent=base["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#202522"),
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#202522"),
    )
    table_header = ParagraphStyle(
        "TableHeader",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )

    return {
        "title": title_style,
        "subtitle": subtitle_style,
        "meta": meta_style,
        "h1": h1_style,
        "h2": h2_style,
        "body": body_style,
        "bullet": bullet_style,
        "callout": callout_style,
        "table_cell": table_cell,
        "table_header": table_header,
    }


def generate_enterprise_genai_report(output_path: Path):
    """Generates an extensive 8-10 page Enterprise GenAI Strategic Governance Whitepaper."""
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )
    styles = build_styles()
    story = []

    # ── Cover Page ──
    story.append(Spacer(1, 40))
    badge = Table(
        [[Paragraph("<b>ENTERPRISE TECHNICAL ADVISORY</b>", styles["table_header"])]],
        colWidths=[220],
    )
    badge.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#315B46")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    story.append(badge)
    story.append(Spacer(1, 15))
    story.append(Paragraph("Enterprise GenAI Strategic Architecture & Governance Report 2026", styles["title"]))
    story.append(Paragraph("A Technical Framework for Grounded Document Transformation, Hallucination Elimination, and Vector-Indexed Operational Telemetry", styles["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#315B46"), spaceAfter=20))

    meta_text = """
    <b>Prepared For:</b> Executive Steering Committee & Technology Leadership<br/>
    <b>Author:</b> ContentAI Enterprise Architecture Guild<br/>
    <b>Release Version:</b> 3.4.0-Production (Expo Build)<br/>
    <b>Classification:</b> Proprietary & Confidential<br/>
    <b>Date:</b> October 2026
    """
    story.append(Paragraph(meta_text, styles["meta"]))
    story.append(Spacer(1, 35))

    # Executive Overview Callout Box
    callout_data = [[
        Paragraph(
            "<b>Key Takeaway:</b> Traditional generative models introduce critical operational risks when deployed "
            "without factual grounding. ContentAI addresses this via deterministic semantic chunking, dual-tier vector "
            "retrieval (FAISS & hybrid embeddings), and automated Natural Language Inference (NLI) claim verification, "
            "delivering a verified 99.4% citation accuracy rate while reducing manual document summarization latency by 82%.",
            styles["callout"],
        )
    ]]
    callout_table = Table(callout_data, colWidths=[500])
    callout_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8F9F7")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#C5D7CC")),
        ("LINELEFT", (0, 0), (-1, -1), 4, colors.HexColor("#315B46")),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
    ]))
    story.append(callout_table)
    story.append(PageBreak())

    # ── Section 1: Executive Summary ──
    story.append(Paragraph("1. Executive Summary & Market Imperative", styles["h1"]))
    story.append(Paragraph(
        "Modern knowledge-intensive enterprises spend an estimated 28% of aggregate knowledge worker hours navigating, "
        "synthesizing, and reformulating dense unstructured documentation—including technical specifications, quarterly earnings "
        "filings, compliance disclosures, and operational handbooks. The arrival of Generative Artificial Intelligence presents an "
        "unprecedented opportunity to compress this transformation cycle from hours to seconds.",
        styles["body"],
    ))
    story.append(Paragraph(
        "However, commercial deployment across regulated industries has been historically bottlenecked by three persistent vulnerabilities:",
        styles["body"],
    ))
    story.append(Paragraph("<b>1. Fabricated Hallucinations:</b> Unconstrained autoregressive language models reliably generate convincing, plausible inaccuracies without epistemic self-awareness.", styles["bullet"]))
    story.append(Paragraph("<b>2. Ungrounded Transformation:</b> Extractive summaries frequently omit crucial context, leading to divergent interpretations of contractual and engineering constraints.", styles["bullet"]))
    story.append(Paragraph("<b>3. Zero-Knowledge Compliance:</b> Public cloud LLM gateways risk exposing intellectual property and personally identifiable information (PII) to unvetted third parties.", styles["bullet"]))
    story.append(Spacer(1, 10))

    # Benchmark Table
    story.append(Paragraph("<b>Table 1.1: Document Processing Metrics: Traditional vs. ContentAI Platform</b>", styles["h2"]))
    table_data = [
        [
            Paragraph("Metric", styles["table_header"]),
            Paragraph("Manual Human Synthesis", styles["table_header"]),
            Paragraph("Standard LLM Prompting", styles["table_header"]),
            Paragraph("ContentAI Grounded RAG", styles["table_header"]),
        ],
        [
            Paragraph("Turnaround Time (50-page PDF)", styles["table_cell"]),
            Paragraph("4.5 - 6.0 Hours", styles["table_cell"]),
            Paragraph("45 Seconds", styles["table_cell"]),
            Paragraph("<b>4.2 Seconds</b>", styles["table_cell"]),
        ],
        [
            Paragraph("Factual Accuracy / Grounding", styles["table_cell"]),
            Paragraph("98.2%", styles["table_cell"]),
            Paragraph("81.4% (18.6% error rate)", styles["table_cell"]),
            Paragraph("<b>99.4% (Deterministic)</b>", styles["table_cell"]),
        ],
        [
            Paragraph("Verifiable Source Citations", styles["table_cell"]),
            Paragraph("High (Manual Footnotes)", styles["table_cell"]),
            Paragraph("None / Simulated", styles["table_cell"]),
            Paragraph("<b>Atomic Chunk Citations</b>", styles["table_cell"]),
        ],
        [
            Paragraph("Audit Trail & Logging", styles["table_cell"]),
            Paragraph("Ad-hoc Notes", styles["table_cell"]),
            Paragraph("Vendor Ephemeral Logs", styles["table_cell"]),
            Paragraph("<b>Immutable Activity DB</b>", styles["table_cell"]),
        ],
    ]
    t = Table(table_data, colWidths=[130, 120, 120, 130])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#202522")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E8E3")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8F9F7")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ── Section 2: Technical Architecture ──
    story.append(Paragraph("2. Technical Architecture & Ingestion Pipeline", styles["h1"]))
    story.append(Paragraph(
        "ContentAI's core transformation engine relies on an asynchronous multi-stage processing pipeline built with "
        "FastAPI, SQLAlchemy asynchronous engines, and FAISS vector indexing. Below is an exhaustive breakdown of the ingest flow.",
        styles["body"],
    ))
    story.append(Paragraph("2.1 Hybrid Document Ingestion Engine", styles["h2"]))
    story.append(Paragraph(
        "The system accepts a broad taxonomy of document formats: PDF (via PyMuPDF and pypdf fallback), Microsoft Word (.docx), "
        "PowerPoint (.pptx), Markdown (.md), and plain text (.txt). Ingestion occurs via streamed multipart uploads capped at 50MB per artifact.",
        styles["body"],
    ))
    story.append(Paragraph("2.2 Semantic Boundary-Aware Chunking", styles["h2"]))
    story.append(Paragraph(
        "Unlike naive fixed-character chunkers which disrupt syntactic continuity across paragraph breaks, ContentAI applies "
        "a structural chunking strategy. The parser tracks heading hierarchy, paragraph boundaries, and table boundaries. Chunks are sized "
        "dynamically between 400 and 800 tokens with an intentional 100-token sliding overlap window to preserve contextual coherence.",
        styles["body"],
    ))
    story.append(Paragraph("2.3 Vector Embeddings & Index Construction", styles["h2"]))
    story.append(Paragraph(
        "For each isolated text chunk, a 1536-dimensional embedding vector is generated. In cloud-connected deployments, the engine "
        "utilizes OpenAI's text-embedding-3-small model. In self-contained, air-gapped, or offline demo environments, the platform "
        "seamlessly activates its built-in LocalDeterministicEmbeddingService. Vectors are indexed into an isolated FAISS flat L2 "
        "or hierarchical HNSW graph partitioned on document UUID.",
        styles["body"],
    ))
    story.append(PageBreak())

    # ── Section 3: Grounded Transformation Types ──
    story.append(Paragraph("3. Multi-Format Transformation Taxonomy", styles["h1"]))
    story.append(Paragraph(
        "Once a document has completed semantic indexing, users can synthesize the underlying knowledge into nine distinct formats:",
        styles["body"],
    ))
    types_data = [
        ("Executive Briefing", "Synthesizes multi-page reports into a high-level overview, 3-5 critical findings, and actionable strategic implications for C-suite decision-makers."),
        ("Q&A / FAQ Engine", "Generates high-frequency inquiries paired with direct citations pointing back to source paragraph chunks."),
        ("Interactive Assessment Quiz", "Creates multiple-choice testing questions with explanations and option distractor analysis for onboarding and compliance verification."),
        ("Slide Deck Outline", "Extracts key thesis arguments and bullet hierarchies tailored for presentation slide decks."),
        ("Actionable Email Briefing", "Translates dense whitepapers into executive correspondence with highlighted operational deadlines and next steps."),
        ("Social & Public Highlights", "Produces optimized snippets for external announcements, LinkedIn thought-leadership, and industry press releases."),
        ("Study Guide / Syllabus", "Assembles exhaustive educational study plans, defining core terminology and review criteria."),
        ("Humanized Content Rewrite", "Re-synthesizes mechanical AI text to achieve natural sentence cadence, varied burstiness, and authentic voice."),
        ("Originality & Plagiarism Audit", "Performs mathematical perplexity auditing, burstiness variance tests, and copy-paste detection to ensure authenticity."),
    ]
    for name, desc in types_data:
        story.append(Paragraph(f"<b>• {name}:</b> {desc}", styles["bullet"]))

    story.append(Spacer(1, 10))
    story.append(Paragraph("3.1 Epistemic Grounding & Citation Injection", styles["h2"]))
    story.append(Paragraph(
        "Every generated transformation output maintains an immutable link to its source chunk references. "
        "The web interface displays clickable citation badges that highlight the exact page and chunk index "
        "from which each piece of evidence was synthesized.",
        styles["body"],
    ))
    story.append(PageBreak())

    # ── Section 4: Automated Verification ──
    story.append(Paragraph("4. Automated Verification & Hallucination Elimination", styles["h1"]))
    story.append(Paragraph(
        "A hallmark innovation of the ContentAI architecture is the two-stage Verification Pipeline. "
        "Immediately following transformation generation, the platform triggers an asynchronous verification run:",
        styles["body"],
    ))
    story.append(Paragraph("4.1 Atomic Claim Extraction", styles["h2"]))
    story.append(Paragraph(
        "The generated text is decomposed into a set of discrete, testable factual propositions (atomic claims). "
        "Compound sentences are split into singular relational triples (Subject, Predicate, Object).",
        styles["body"],
    ))
    story.append(Paragraph("4.2 Natural Language Inference (NLI) Scoring", styles["h2"]))
    story.append(Paragraph(
        "Each atomic claim is evaluated against retrieved chunks from the original source document using a cross-encoder NLI engine. "
        "Claims are categorized into three verifiable states:",
        styles["body"],
    ))
    story.append(Paragraph("<b>1. Supported (Entailment):</b> The claim is directly corroborated by source document evidence (weight: 1.0).", styles["bullet"]))
    story.append(Paragraph("<b>2. Partial Support (Neutral):</b> The claim is plausible but requires inference not explicitly documented (weight: 0.5).", styles["bullet"]))
    story.append(Paragraph("<b>3. Unsupported (Contradiction):</b> The claim contradicts or lacks textual evidence in the source document (weight: 0.0).", styles["bullet"]))
    story.append(Spacer(1, 10))

    verification_table_data = [
        [
            Paragraph("Verification Metric", styles["table_header"]),
            Paragraph("Target SLA", styles["table_header"]),
            Paragraph("Observed Benchmark", styles["table_header"]),
            Paragraph("Status", styles["table_header"]),
        ],
        [
            Paragraph("Grounded Faithfulness Score", styles["table_cell"]),
            Paragraph(">= 95.0%", styles["table_cell"]),
            Paragraph("<b>99.4%</b>", styles["table_cell"]),
            Paragraph("OPTIMAL", styles["table_cell"]),
        ],
        [
            Paragraph("Unsupported Claim Rate", styles["table_cell"]),
            Paragraph("<= 3.0%", styles["table_cell"]),
            Paragraph("<b>0.6%</b>", styles["table_cell"]),
            Paragraph("PASS", styles["table_cell"]),
        ],
        [
            Paragraph("Verification Latency", styles["table_cell"]),
            Paragraph("<= 2.50s", styles["table_cell"]),
            Paragraph("<b>0.82s</b>", styles["table_cell"]),
            Paragraph("PASS", styles["table_cell"]),
        ],
    ]
    vt = Table(verification_table_data, colWidths=[150, 110, 120, 120])
    vt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#202522")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E8E3")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8F9F7")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(vt)
    story.append(PageBreak())

    # ── Section 5: Security & Enterprise Telemetry ──
    story.append(Paragraph("5. Enterprise Security, RBAC & Telemetry", styles["h1"]))
    story.append(Paragraph(
        "ContentAI enforces zero-knowledge document privacy. Multi-tenant data segregation guarantees that users only ever access "
        "their own document embeddings and transformation outputs. The platform features dual administrative and user roles:",
        styles["body"],
    ))
    story.append(Paragraph("5.1 Role-Based Access Control (RBAC)", styles["h2"]))
    story.append(Paragraph(
        "Authentication uses standard RFC-7519 JWT bearer tokens signed with HMAC-SHA256. "
        "Administrators have dedicated operational access to system telemetry, aggregated throughput metrics, and audit logs, "
        "while strict zero-knowledge principles prevent inspection of user document raw text.",
        styles["body"],
    ))
    story.append(Paragraph("5.2 Comprehensive Audit Logging", styles["h2"]))
    story.append(Paragraph(
        "Every document upload, transformation generation, verification check, and authentication attempt produces an immutable "
        "ActivityLog record storing timestamps, status, duration, and client metadata.",
        styles["body"],
    ))
    story.append(PageBreak())

    # ── Section 6: Privacy & PII Redaction ──
    story.append(Paragraph("6. Data Privacy, PII Redaction & Compliance Governance", styles["h1"]))
    story.append(Paragraph(
        "For healthcare, financial, and legal sectors, compliance with GDPR, HIPAA, and SOC2 Type II is mandatory. "
        "ContentAI incorporates an automated client-side and streaming server-side PII sanitization pipeline prior to embedding:",
        styles["body"],
    ))
    story.append(Paragraph("<b>• Named Entity Recognition (NER) Scrubbing:</b> Replaces direct identifiers (SSNs, medical record numbers, credit cards) with cryptographic pseudo-tokens.", styles["bullet"]))
    story.append(Paragraph("<b>• Zero-Persistence Vector Memory:</b> Embedding vectors are decoupled from raw document names and stored with isolated tenant authorization tags.", styles["bullet"]))
    story.append(Paragraph("<b>• Ephemeral LLM Transmission:</b> Payloads transmitted to external LLM providers specify zero-data-retention flags, prohibiting training on customer inputs.", styles["bullet"]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("6.1 Compliance Certification Alignment", styles["h2"]))
    story.append(Paragraph(
        "The following matrix outlines ContentAI's architectural alignment against enterprise security frameworks:",
        styles["body"],
    ))
    compliance_table_data = [
        [Paragraph("Standard", styles["table_header"]), Paragraph("Requirement", styles["table_header"]), Paragraph("ContentAI Implementation", styles["table_header"])],
        [Paragraph("SOC 2 Type II", styles["table_cell"]), Paragraph("Auditability of data access", styles["table_cell"]), Paragraph("Append-only PostgreSQL/SQLite ActivityLog table", styles["table_cell"])],
        [Paragraph("HIPAA Security Rule", styles["table_cell"]), Paragraph("PHI transmission encryption", styles["table_cell"]), Paragraph("TLS 1.3 in-transit, AES-256 at-rest volume encryption", styles["table_cell"])],
        [Paragraph("GDPR Art. 17", styles["table_cell"]), Paragraph("Right to erasure (forgetting)", styles["table_cell"]), Paragraph("Atomic cascade delete: document, chunks, and FAISS vectors", styles["table_cell"])],
        [Paragraph("ISO 27001", styles["table_cell"]), Paragraph("Privilege separation", styles["table_cell"]), Paragraph("Strict RBAC: admin telemetry separated from user document stores", styles["table_cell"])],
    ]
    ct = Table(compliance_table_data, colWidths=[110, 150, 240])
    ct.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#202522")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E8E3")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8F9F7")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(ct)
    story.append(PageBreak())

    # ── Section 7: GPU Economics ──
    story.append(Paragraph("7. GPU Economics, Inference Latency & Cost Optimization", styles["h1"]))
    story.append(Paragraph(
        "Deploying generative capabilities at scale requires disciplined operational cost modeling. "
        "A typical corporate enterprise processing 10,000 monthly reports using naive 128k context windows encounters prohibitive token bills. "
        "ContentAI's targeted RAG architecture minimizes context window bloat by retrieving only the top-K relevant chunks (K=5), "
        "slashing token consumption by 87.5% per generation.",
        styles["body"],
    ))
    story.append(Paragraph("7.1 Cost & Latency Benchmark Comparison", styles["h2"]))
    cost_table_data = [
        [Paragraph("Deployment Strategy", styles["table_header"]), Paragraph("Avg Context Tokens", styles["table_header"]), Paragraph("Median Latency", styles["table_header"]), Paragraph("Cost per 1,000 Docs", styles["table_header"])],
        [Paragraph("Full-Context Ingestion (GPT-4o)", styles["table_cell"]), Paragraph("48,500 tokens", styles["table_cell"]), Paragraph("18.4s", styles["table_cell"]), Paragraph("$145.50", styles["table_cell"])],
        [Paragraph("Naive Vector RAG (Top-20 Chunks)", styles["table_cell"]), Paragraph("12,000 tokens", styles["table_cell"]), Paragraph("7.2s", styles["table_cell"]), Paragraph("$36.00", styles["table_cell"])],
        [Paragraph("<b>ContentAI Dual-Tier RAG (Top-5 Chunks)</b>", styles["table_cell"]), Paragraph("<b>3,200 tokens</b>", styles["table_cell"]), Paragraph("<b>3.4s</b>", styles["table_cell"]), Paragraph("<b>$9.60 (93% savings)</b>", styles["table_cell"])],
        [Paragraph("<b>ContentAI Local Keyless Mode</b>", styles["table_cell"]), Paragraph("<b>Local Synthesizer</b>", styles["table_cell"]), Paragraph("<b>0.08s</b>", styles["table_cell"]), Paragraph("<b>$0.00 (Offline Free)</b>", styles["table_cell"])],
    ]
    cst = Table(cost_table_data, colWidths=[150, 110, 100, 140])
    cst.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#202522")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E8E3")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8F9F7")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(cst)
    story.append(Spacer(1, 15))
    story.append(Paragraph(
        "This economic advantage allows organizations to deploy ContentAI across thousands of daily operational seats without budget overrun.",
        styles["body"],
    ))
    story.append(PageBreak())

    # ── Section 8: Human-in-the-Loop & Document Editor ──
    story.append(Paragraph("8. Human-in-the-Loop Editorial Workflows & TipTap Studio", styles["h1"]))
    story.append(Paragraph(
        "ContentAI treats artificial intelligence as an intellectual partner rather than an unguided black box. "
        "The web interface features an integrated TipTap rich text document editor, allowing immediate inline refining of all outputs.",
        styles["body"],
    ))
    story.append(Paragraph("8.1 Inline Formatting & Markdown Serialization", styles["h2"]))
    story.append(Paragraph(
        "The editor offers bold, italic, heading level 2, heading level 3, and bullet list commands. "
        "Changes persist seamlessly to the server and can be exported into four publication-grade formats:",
        styles["body"],
    ))
    story.append(Paragraph("<b>1. Plain Text (.txt):</b> Clean ANSI text stripped of markup for terminal workflows or legacy database ingestion.", styles["bullet"]))
    story.append(Paragraph("<b>2. Markdown (.md):</b> GitHub Flavored Markdown with clean headers and list hierarchies.", styles["bullet"]))
    story.append(Paragraph("<b>3. Microsoft Word (.docx):</b> Formatted document hierarchy with font styles and section spacing.", styles["bullet"]))
    story.append(Paragraph("<b>4. Adobe PDF (.pdf):</b> Printable styled document with running page counters and branded metadata.", styles["bullet"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph("8.2 Quick Tool Handoff: Plagiarism Scanner & AI Humanizer", styles["h2"]))
    story.append(Paragraph(
        "Generated transformations feature one-click handoff buttons: 'Scan Plagiarism' preloads content directly into the linguistic detector, "
        "while 'Humanize' passes the text into the Humanizer Studio for tone and cadence rewriting.",
        styles["body"],
    ))
    story.append(PageBreak())

    # ── Section 9: Risk Matrix & Failure Mode Analysis ──
    story.append(Paragraph("9. Risk Matrix & Failure Mode Effects Analysis (FMEA)", styles["h1"]))
    story.append(Paragraph(
        "Enterprise technology governance requires identifying potential failure modes and verifying mitigation countermeasures:",
        styles["body"],
    ))
    fmea_data = [
        [Paragraph("Failure Mode", styles["table_header"]), Paragraph("Root Cause", styles["table_header"]), Paragraph("Severity", styles["table_header"]), Paragraph("ContentAI Countermeasure", styles["table_header"])],
        [Paragraph("Hallucinated Metric", styles["table_cell"]), Paragraph("Unconstrained LLM extrapolation", styles["table_cell"]), Paragraph("HIGH", styles["table_cell"]), Paragraph("NLI claim verifier flags unsupported claims < 95%", styles["table_cell"])],
        [Paragraph("Third-Party API Outage", styles["table_cell"]), Paragraph("OpenAI 401 / 429 quota exhaustion", styles["table_cell"]), Paragraph("HIGH", styles["table_cell"]), Paragraph("Automatic graceful fallback to LocalDeterministic service", styles["table_cell"])],
        [Paragraph("Cold-Start Database", styles["table_cell"]), Paragraph("Unseeded production container", styles["table_cell"]), Paragraph("MEDIUM", styles["table_cell"]), Paragraph("Application lifespan auto-seed & on-the-fly login provisioning", styles["table_cell"])],
        [Paragraph("Malformed Document Input", styles["table_cell"]), Paragraph("Corrupted PDF stream or scan", styles["table_cell"]), Paragraph("LOW", styles["table_cell"]), Paragraph("Multi-parser fallback (PyMuPDF -> pypdf -> raw text decode)", styles["table_cell"])],
    ]
    fmt = Table(fmea_data, colWidths=[120, 130, 70, 180])
    fmt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#202522")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E8E3")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8F9F7")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(fmt)
    story.append(PageBreak())

    # ── Section 10: Multi-Year Roadmap & Conclusion ──
    story.append(Paragraph("10. Multi-Year Implementation Roadmap & Conclusion", styles["h1"]))
    story.append(Paragraph(
        "ContentAI has achieved Phase 5 maturity with full role-based access, automated verification, administrative telemetry, "
        "and editorial document workspace functionality. The forward-looking engineering roadmap targets the following milestones:",
        styles["body"],
    ))
    story.append(Paragraph("<b>• Phase 6 (Q4 2026):</b> Streaming Server-Sent Events (SSE) token generation with live claim verification badges.", styles["bullet"]))
    story.append(Paragraph("<b>• Phase 7 (Q1 2027):</b> Distributed multi-modal vision parsing for embedded schematic diagrams, charts, and blueprints.", styles["bullet"]))
    story.append(Paragraph("<b>• Phase 8 (Q2 2027):</b> Native Enterprise SSO (SAML 2.0 / Okta / Azure Active Directory) integration.", styles["bullet"]))
    story.append(Spacer(1, 15))

    # Concluding Recommendation Box
    rec_box = Table([[
        Paragraph(
            "<b>Final Executive Recommendation:</b> ContentAI demonstrates state-of-the-art accuracy, "
            "resilient self-healing architecture, and enterprise design aesthetics. The platform is ready for demonstration "
            "across college expos, hackathons, and corporate evaluations.",
            styles["callout"],
        )
    ]], colWidths=[500])
    rec_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EBF1ED")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#C5D7CC")),
        ("LINELEFT", (0, 0), (-1, -1), 4, colors.HexColor("#2E6A4F")),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
    ]))
    story.append(rec_box)

    doc.build(story, canvasmaker=NumberedCanvas)


def generate_cloud_architecture_report(output_path: Path):
    """Generates a 6-page Cloud Native Infrastructure and Microservices Audit Report."""
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )
    styles = build_styles()
    story = []

    story.append(Spacer(1, 30))
    story.append(Paragraph("Cloud-Native Infrastructure & Microservices Architecture Specification", styles["title"]))
    story.append(Paragraph("High-Availability Vector Search, Distributed Ingestion & Kubernetes Topology", styles["subtitle"]))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#315B46"), spaceAfter=15))

    meta_text = """
    <b>Document Reference:</b> ARCH-SPEC-2026-V4<br/>
    <b>Author:</b> Cloud Engineering & Reliability Operations Group<br/>
    <b>Target Environment:</b> Production Multi-Region Cluster<br/>
    <b>Date:</b> October 2026
    """
    story.append(Paragraph(meta_text, styles["meta"]))
    story.append(Spacer(1, 20))

    story.append(Paragraph("1. System Architecture Overview", styles["h1"]))
    story.append(Paragraph(
        "This specification establishes the architectural blueprints for the ContentAI distributed deployment. "
        "The application is structured into decoupled frontend, backend, vector storage, and relational persistence layers "
        "designed for sub-second query latency and 99.99% operational uptime.",
        styles["body"],
    ))

    # Architecture component table
    comp_data = [
        [Paragraph("Layer", styles["table_header"]), Paragraph("Technology Stack", styles["table_header"]), Paragraph("Key Functionality", styles["table_header"])],
        [Paragraph("Frontend UI", styles["table_cell"]), Paragraph("Next.js 16 (React 19), Tailwind CSS", styles["table_cell"]), Paragraph("Warm editorial design system, interactive Tippy markdown editor, SVG analytics", styles["table_cell"])],
        [Paragraph("API Gateway", styles["table_cell"]), Paragraph("FastAPI, Uvicorn, ASGI AsyncIO", styles["table_cell"]), Paragraph("REST endpoints, JWT authentication, rate limiting (200 req/min), CORS policy", styles["table_cell"])],
        [Paragraph("Vector Store", styles["table_cell"]), Paragraph("FAISS (Facebook AI Similarity Search)", styles["table_cell"]), Paragraph("In-memory L2 index with serialized disk persistence and dynamic reloads", styles["table_cell"])],
        [Paragraph("Relational DB", styles["table_cell"]), Paragraph("SQLite / PostgreSQL with SQLAlchemy", styles["table_cell"]), Paragraph("ACID transaction management, document metadata, audit logging", styles["table_cell"])],
        [Paragraph("NLI Verifier", styles["table_cell"]), Paragraph("Cross-Encoder Claim Extraction Engine", styles["table_cell"]), Paragraph("Dual-phase factual consistency verification and hallucination auditing", styles["table_cell"])],
    ]
    t = Table(comp_data, colWidths=[110, 160, 230])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#202522")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E8E3")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8F9F7")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(PageBreak())

    story.append(Paragraph("2. Reliability, Failover & Graceful Degradation", styles["h1"]))
    story.append(Paragraph(
        "A foundational design principle of ContentAI is resilient self-healing. When external third-party cloud services "
        "experience throttling, authentication failures, or network interruptions, the platform activates local fallbacks:",
        styles["body"],
    ))
    story.append(Paragraph("<b>• Embedding Fallback:</b> Automatically degrades to LocalDeterministicEmbeddingService with 1536-dimensional L2-normalized hash representations.", styles["bullet"]))
    story.append(Paragraph("<b>• LLM Fallback:</b> Activates MockGroundedLLMProvider, synthesizing grounded text extracted directly from retrieved document chunk context.", styles["bullet"]))
    story.append(Paragraph("<b>• Zero-Downtime Session Retention:</b> Client-side localStorage tokens ensure uninterrupted workspace access during transient network reconnects.", styles["bullet"]))
    story.append(PageBreak())

    story.append(Paragraph("3. Security & Compliance Controls", styles["h1"]))
    story.append(Paragraph(
        "All data at rest is isolated by user identifier. Multi-tenant queries include strict tenant isolation predicates "
        "in every SQLAlchemy query filter. File uploads are validated by magic byte detection to eliminate malicious executable injection.",
        styles["body"],
    ))

    doc.build(story, canvasmaker=NumberedCanvas)


def generate_plain_text_reports(base_dir: Path):
    """Creates accompanying plain text (.txt and .md) sample documents for quick testing."""
    sample_text = """================================================================================
EXECUTIVE ARTIFICIAL INTELLIGENCE STRATEGY & TRANSFORMATION REPORT (2026)
Prepared for: Board of Directors & Technology Operations Guild
Classification: Internal Business Confidential
================================================================================

1. EXECUTIVE SUMMARY
Enterprise organizations are undergoing an irreversible shift toward Generative AI-assisted
knowledge workflows. Recent industry benchmarks indicate that knowledge workers spend over
2.5 hours per day reviewing dense technical documentation, compliance audit records, and
cross-functional status memos. By integrating Grounded Retrieval-Augmented Generation (RAG)
with automated Natural Language Inference (NLI) claim verification, ContentAI reduces document
analysis cycle times by 82% while ensuring 99.4% factual faithfulness.

2. CORE CAPABILITIES OF THE CONTENTAI PLATFORM
ContentAI provides a unified, production-grade workspace supporting:
- Multi-format ingestion: PDF, Word (.docx), PowerPoint (.pptx), Markdown, and Plain Text.
- Semantic boundary-aware chunking with sliding overlap windows (400-800 tokens).
- Fast vector similarity search powered by FAISS index serialization.
- Multi-format transformations: Executive Briefings, FAQs, Quizzes, Slide Decks, and Emails.
- Automated Natural Language Inference (NLI) verification to identify and eliminate hallucinations.
- Integrated Plagiarism and AI Content Scanning with linguistic burstiness and perplexity metrics.
- AI Content Humanizer to adapt robotic phrasing into natural, publication-grade voice.

3. ARCHITECTURAL HIGHLIGHTS
- Backend: FastAPI (Python 3.9+) with SQLAlchemy asynchronous session pools and Pydantic validation.
- Frontend: Next.js 16 with React 19, TipTap rich text document editor, and warm editorial design system.
- Security: Role-based access control (RBAC), bcrypt-secured passwords, signed JWT tokens, and zero-knowledge privacy.
- Operational Telemetry: Real-time administrative dashboard tracking DAU/WAU trends, document throughput, and error categories.

4. CONCLUSION & RECOMMENDATIONS
The steering committee recommends immediate platform adoption across technical, legal,
and product documentation workflows. The platform satisfies enterprise security standards
and is ready for live operational demonstration.
"""
    txt_path = base_dir / "Enterprise_GenAI_Strategy_Sample.txt"
    txt_path.write_text(sample_text, encoding="utf-8")

    md_path = base_dir / "Quarterly_Operations_and_Architecture_Report.md"
    md_content = """# Quarterly Operations & Cloud Architecture Assessment Q3 2026

## 1. Executive Briefing
During the third quarter of 2026, the ContentAI infrastructure processed **14,250 document transformations** across 1,840 active workspace accounts. System availability remained at **99.98%**, with median generation latency recorded at **3.4 seconds per document**.

## 2. Key Operational Metrics
- **Total Ingested Artifacts:** 3,892 PDF, DOCX, and PPTX files
- **FAISS Vector Embedding Operations:** 42,100 chunk vectors indexed
- **Verification Faithfulness Score:** 99.4% supported claims
- **Zero-Knowledge Isolation Incidents:** 0 (Full tenant partition integrity verified)

## 3. Transformation Breakdown
1. **Executive Summaries:** 34% of aggregate platform usage
2. **Interactive Assessments & Quizzes:** 22% of total jobs
3. **FAQ & Knowledge Extraction:** 18% of total jobs
4. **Slide Deck Outlines & Briefings:** 15% of total jobs
5. **AI Humanizer & Originality Scans:** 11% of total jobs

## 4. Next Steps
- Deploy regional vector cache replicas to achieve sub-2-second generation times.
- Expand presentation export formats to native PowerPoint (.pptx) and PDF slide decks.
- Present live platform telemetry at the College Technology Expo.
"""
    md_path.write_text(md_content, encoding="utf-8")


def main():
    out_dir = Path(__file__).parent.parent / "sample_documents"
    out_dir.mkdir(parents=True, exist_ok=True)

    pdf1 = out_dir / "Enterprise_GenAI_Strategy_and_Governance_Report_2026.pdf"
    pdf2 = out_dir / "Cloud_Native_Infrastructure_and_Microservices_Audit.pdf"

    print(f"Generating sample report 1: {pdf1}...")
    generate_enterprise_genai_report(pdf1)

    print(f"Generating sample report 2: {pdf2}...")
    generate_cloud_architecture_report(pdf2)

    print("Generating sample text reports...")
    generate_plain_text_reports(out_dir)

    print(f"[✓] All sample demonstration documents successfully generated in: {out_dir}")
    for item in sorted(out_dir.iterdir()):
        size_kb = item.stat().st_size / 1024
        print(f"  - {item.name} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
