# ContentAI — GenAI Content Transformation & Verification Platform

> **Enterprise AI Document Intelligence, Grounded RAG Transformations, & Factuality Audit SaaS**  
> **Backend**: FastAPI + PostgreSQL + FAISS Vector Search + Pydantic + Tiktoken  
> **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Modern SaaS Design System

---

## 📋 Overview

**ContentAI** is a modern, enterprise-ready AI SaaS platform engineered to transform unstructured business documents (PDF, DOCX, PPTX, TXT) into source-grounded executive summaries, FAQs, quizzes, emails, social highlights, and presentation outlines. Every output is backed by an automated **AI Verification Engine** that extracts atomic claims, retrieves source evidence, and calculates an auditable **Groundedness Score**.

---

## 🏗️ Technical Architecture

```
                                  ┌───────────────────────────┐
                                  │    ContentAI SaaS App     │
                                  │ (Next.js 15 + TypeScript) │
                                  └─────────────┬─────────────┘
                                                │
                                       REST API / Bearer Auth
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │   FastAPI Gateway Layer   │
                                  │(Rate Limiter, CORS, Auth) │
                                  └─────────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
    ┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐
    │  Document Intelligence   │   │  Grounded RAG Engine     │   │   AI Verification Engine │
    │  (Parsers & Chunker)     │   │ (FAISS Vector Indexing)  │   │  (Claim Audit & Metrics) │
    └────────────┬─────────────┘   └────────────┬─────────────┘   └────────────┬─────────────┘
                 │                              │                              │
                 └──────────────────────────────┼──────────────────────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │  PostgreSQL (Supabase/Neon)│
                                  │  Documents, Chunks,       │
                                  │  Transformations, Reports │
                                  └───────────────────────────┘
```

---

## 💎 Frontend Application Structure (7 Dedicated Routes)

1. **Persistent App Shell (`AppShell`, `Sidebar`, `TopNav`)**:
   - Dark persistent sidebar with brand logo **ContentAI**, quick Upload Document action, navigation links, and User Profile badge.
   - Top navigation bar with breadcrumbs and API readiness status.
2. **Dashboard (`/`)**:
   - Welcome banner with action trigger.
   - Real statistics cards derived from backend APIs (Ingested Docs, Transformations, Vector Chunks, Word Count).
   - Recent Documents repository grid and RAG activity stream.
3. **My Documents Library (`/documents`)**:
   - Polished library cards showing file formats (PDF, DOCX, PPTX, TXT), size, status badge (`completed`, `processing`, `uploaded`, `failed`), page/slide count, and chunk count.
   - Live search input, format filter, status filter, and sorting controls.
4. **Document Workspace (`/documents/[id]`) — Primary Screen**:
   - 3-Column Responsive Workspace:
     - **LEFT PANEL**: Document metadata, detected sections overview, transformation history pills, and generator trigger.
     - **CENTER PANEL**: Title, tone & length badges, formatted content output, **Export Toolbar** (Markdown, Text, JSON, Print/PDF), AI processing progress bar, and **Sources Used** cards with similarity match scores.
     - **RIGHT PANEL**: **Verification Report** with visual Groundedness Score gauge, claims breakdown (Supported, Partially Supported, Unsupported), highlighted unsupported claims audit log, and RAG evaluation metrics summary.
5. **Transformations Hub (`/transformations`)**:
   - Library of all generated transformations filtered by template type (`short_summary`, `executive_summary`, `faq`, `quiz`, `email`, `social_post`, `presentation_outline`).
6. **Analytics Dashboard (`/analytics`)**:
   - Real-time data volume, file format breakdown %, ingestion status %, and chunk density charts.
7. **Evaluation Dashboard (`/evaluation`)**:
   - Quantitative evaluation benchmarks (Precision@1, Recall@3, MRR, Groundedness %, Prompt Injection 100% Defanged).
8. **Settings (`/settings`)**:
   - Centralized system parameters inspector (LLM `gpt-4o-mini`, Embeddings `text-embedding-3-small`, `FAISS`, Rate Limiting).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| **Backend Framework** | FastAPI (Python 3.9+) |
| **Parsers** | PyMuPDF (fitz), python-docx, python-pptx |
| **Chunking Engine** | tiktoken (`cl100k_base` BPE) |
| **Vector Engine** | FAISS CPU (`faiss-cpu`) |
| **Database** | PostgreSQL 15+ & SQLAlchemy Async ORM (SQLite local fallback) |
| **Testing** | pytest, pytest-asyncio, httpx |
| **Containerization** | Docker & Docker Compose |

---

## 🚀 Setup Instructions

### 1. Local Development Execution

#### Backend Server
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```
> **API Docs**: `http://localhost:8000/docs`

#### Frontend Application
```bash
cd frontend
npm install
npm run dev
```
> **SaaS Workspace**: `http://localhost:3000`

---

## 🧪 Testing & Evaluation Commands

### Run Backend Unit Tests (74 passing)
```bash
cd backend
source .venv/bin/activate
python3 -m pytest tests/ -v
```

### Run Factuality Verification & Security Benchmark
```bash
cd backend
source .venv/bin/activate
python3 scripts/evaluate_verification.py
```
