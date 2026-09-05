# ContentAI — Platform User Guide & Feature Testing Walkthrough

> **Enterprise AI Document Intelligence, Grounded RAG Transformations, & Factuality Audit SaaS**  
> **Backend**: FastAPI (`http://localhost:8000`)  
> **Frontend**: Next.js 15 App Router (`http://localhost:3000`)

---

## 📁 Sample Files Created for Testing

Four pre-generated sample files covering all supported formats are located in your workspace directory at:
`./samples/`

1. 📄 [Q3_2026_Executive_Financial_Report.txt](file:///Users/sachinshaileshwar/Documents/GenAI%20PLatform%20Project/samples/Q3_2026_Executive_Financial_Report.txt) — Plain text financial performance report.
2. 📘 [AI_Enterprise_Transformation_Strategy.docx](file:///Users/sachinshaileshwar/Documents/GenAI%20PLatform%20Project/samples/AI_Enterprise_Transformation_Strategy.docx) — Word document detailing enterprise RAG pipelines.
3. 📙 [ContentAI_Platform_Overview.pptx](file:///Users/sachinshaileshwar/Documents/GenAI%20PLatform%20Project/samples/ContentAI_Platform_Overview.pptx) — PowerPoint presentation deck with architecture slides.
4. 📕 [ContentAI_Technical_Whitepaper.pdf](file:///Users/sachinshaileshwar/Documents/GenAI%20PLatform%20Project/samples/ContentAI_Technical_Whitepaper.pdf) — PDF whitepaper covering precision/recall benchmarks.

---

## ⚡ How ContentAI Works Under the Hood

```
[1. Document Intake] ──► [2. Structure Parser & Chunker] ──► [3. FAISS Vector Search Index]
                                                                     │
[6. Export / Audit]  ◄── [5. Factuality Verification]    ◄── [4. RAG Transformation Engine]
```

1. **Document Intake & Processing**: Supports **PDF**, **DOCX**, **PPTX**, and **TXT** files up to 50 MB.
2. **Structure-Aware Chunker**: Uses `tiktoken` BPE (`cl100k_base`) to split text into 512-token chunks with 64-token overlaps while preserving page/slide numbers and headings.
3. **FAISS Vector Indexing**: Automatically computes dense embeddings (`text-embedding-3-small` / 1536 dim) and indexes vectors into a FAISS CPU index.
4. **Grounded RAG Transformation**: Retrieves top-$k$ relevant chunks for prompt context and generates 7 distinct output templates (`Executive Summary`, `Short Summary`, `FAQ`, `Quiz`, `Email`, `Social Post`, `Presentation Deck`).
5. **AI Factuality Verification Engine**: Extracts atomic factual statements, retrieves original document evidence, classifies claims (`SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`), and computes a **Groundedness Score %**.
6. **Export & Audit**: Exporters for Markdown (`.md`), Plain Text (`.txt`), JSON (`.json`), and PDF/Print.

---

## 🚀 Step-by-Step Walkthrough to Test All Features

### Step 1: Launch the Application
Make sure the backend and frontend dev servers are running:
```bash
# Terminal 1: Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```
Open your browser at: **`http://localhost:3000`**

---

### Step 2: Upload Sample Documents
1. Click the **`+ Upload Document`** button in the left sidebar or top header.
2. Drag and drop any of the files from the `./samples/` folder (e.g. `Q3_2026_Executive_Financial_Report.txt` or `ContentAI_Technical_Whitepaper.pdf`).
3. Click **Upload Document**. The file is uploaded, parsed, chunked, and vectorized in **FAISS**.

---

### Step 3: Explore the Dashboard (`/`)
1. View the **Overview Cards**: Watch `Documents Ingested`, `Transformations Created`, and `Text Chunks Vectorized` metrics update live.
2. Inspect the **Recent Documents Table**: See your uploaded file status (`Completed`), file size, and upload timestamp.
3. Use **Quick Actions** to navigate to workspace features.

---

### Step 4: Manage the Document Repository (`/documents`)
1. Click **My Documents** in the left sidebar.
2. Test the **Live Search**: Type the filename into the search box.
3. Test **Filters & Sort**: Filter by file format (PDF, DOCX, PPTX, TXT), processing status (`Completed`), or sort by file size.
4. Click **`Open Workspace →`** on any document row.

---

### Step 5: Test RAG Transformations & Verification in Document Workspace (`/documents/[id]`)
1. **View Document Top Pipeline Flow**: Notice the top flow bar:
   `📄 Document Ingested` $\rightarrow$ `⚡ AI Transformation` $\rightarrow$ `📝 Generated Content` $\rightarrow$ `📌 Grounded Sources` $\rightarrow$ `🛡️ Factuality Audit`
2. **Select Transformation Template**: Choose a template (e.g., `Executive Summary`, `FAQ Generator`, or `Quiz Key`).
3. **Configure Options**: Select Tone (`Professional`, `Executive`) and Length (`Short`, `Medium`, `Detailed`).
4. **Click `Generate Transformation`**:
   - Watch the calm progress state: `Analyzing document` ✓ $\rightarrow$ `Retrieving context` ✓ $\rightarrow$ `Generating response` ● $\rightarrow$ `Verifying sources` ○
5. **Inspect Formatted Content**: Read the generated document output.
6. **Test Export Toolbar**: Click `Markdown (.md)`, `Text (.txt)`, `JSON (.json)`, or `Print / PDF` to export.
7. **Inspect Sources Used**: Scroll down to see retrieved chunks with page/slide numbers and % similarity scores.
8. **Inspect Factuality Verification Report**:
   - View **Groundedness Score %** (e.g. `91.4%`).
   - Review **Supported vs Unsupported Claims**.
   - Check the **Atomic Claims Breakdown** explaining evidence status for every proposition.

---

### Step 6: Test Semantic Vector Search
1. In the Document Workspace, click the **`Semantic Vector Search`** tab.
2. Type a semantic query (e.g., *"What is the Annual Recurring Revenue ARR?"* or *"What are the recall benchmarks?"*).
3. Click **Search Vector Index**.
4. View the retrieved top-$k$ text chunks ranked by cosine similarity score.

---

### Step 7: View Transformations & System Analytics
1. Navigate to **Transformations** (`/transformations`) to view all generated outputs filtered by template type.
2. Navigate to **Analytics** (`/analytics`) to inspect data storage volume, file format breakdown %, and chunk density.
3. Navigate to **Evaluation** (`/evaluation`) to view system benchmarks (Precision@1, Recall@3, MRR, Prompt Injection 100% Defanged).
4. Navigate to **Settings** (`/settings`) to view LLM model config (`gpt-4o-mini`), vector store engine (`FAISS CPU`), and rate limiting policy (`200 req/min`).

---

## 🛠️ API & Command Reference

| Action | Command / Location |
|---|---|
| **Swagger API Documentation** | `http://localhost:8000/docs` |
| **Backend Test Suite** | `cd backend && python -m pytest tests/ -v` |
| **Frontend Production Build** | `cd frontend && npm run build` |
| **Sample Files Directory** | `./samples/` |
