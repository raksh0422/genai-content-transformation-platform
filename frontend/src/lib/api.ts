/**
 * Typed API client for the GenAI Platform backend (Phase 1, Phase 2, & Phase 3).
 */

export interface DocumentUploadResponse {
  id: string;
  filename: string;
  original_filename: string;
  file_extension: string;
  file_size_bytes: number;
  mime_type: string;
  status: string;
  created_at: string;
}

export interface DocumentMetadata {
  id: string;
  filename: string;
  original_filename: string;
  file_extension: string;
  file_size_bytes: number;
  mime_type: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  page_count: number | null;
  word_count: number | null;
  chunk_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  total: number;
  items: DocumentMetadata[];
}

export interface ChunkData {
  id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  token_count: number;
  page_number: number | null;
  slide_number: number | null;
  chunk_type: string;
  created_at: string;
}

export interface ChunkListResponse {
  document_id: string;
  total_chunks: number;
  chunks: ChunkData[];
}

// Phase 2 Types

export interface RetrievalSearchResultItem {
  chunk_id: string;
  chunk_index: number;
  page_number: number | null;
  slide_number: number | null;
  score: number;
  text: string;
  chunk_type: string;
}

export interface RetrievalSearchResponse {
  document_id: string;
  query: string;
  total_results: number;
  results: RetrievalSearchResultItem[];
}

export interface SourceChunkCitation {
  chunk_id: string;
  chunk_index: number;
  page_number: number | null;
  slide_number: number | null;
  similarity_score: number;
  snippet: string;
}

export interface TransformationResponse {
  id: string;
  document_id: string;
  transformation_type: string;
  tone: string;
  length: string;
  title: string;
  content: string;
  structured_output: Record<string, unknown> | null;
  source_chunks: SourceChunkCitation[] | null;
  created_at: string;
}

export interface TransformationListResponse {
  document_id: string;
  total: number;
  items: TransformationResponse[];
}

export interface TransformationCreatePayload {
  document_id: string;
  transformation_type: string;
  tone?: string;
  length?: string;
  query_hint?: string;
}

// Phase 3 Types

export interface VerifiedClaimData {
  id: string;
  claim_text: string;
  classification: "SUPPORTED" | "PARTIALLY_SUPPORTED" | "UNSUPPORTED";
  reasoning: string;
  evidence_snippet: string | null;
  source_chunk_id: string | null;
  page_number: number | null;
  slide_number: number | null;
  confidence_score: number;
}

export interface VerificationReportResponse {
  id: string;
  transformation_id: string;
  document_id: string;
  groundedness_score: number;
  citation_coverage: number;
  total_claims: number;
  supported_claims_count: number;
  partially_supported_claims_count: number;
  unsupported_claims_count: number;
  disclaimer: string;
  created_at: string;
  claims: VerifiedClaimData[];
}

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch (err: unknown) {
    const isBrowser = typeof window !== "undefined";
    const isNotLocal = isBrowser && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
    if (isNotLocal && API_BASE_URL.includes("localhost")) {
      throw new Error(
        `Unable to reach backend: The app is deployed at ${window.location.origin}, but NEXT_PUBLIC_API_URL is still pointing to "${API_BASE_URL}". Please set NEXT_PUBLIC_API_URL in your Vercel Project Settings to your deployed backend URL and redeploy.`
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Unable to fetch from API (${API_BASE_URL}): ${msg}. Ensure your backend server is deployed and running.`);
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) {
    return {} as T;
  }
  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}


export const api = {
  /** Upload a document file. */
  async uploadDocument(file: File): Promise<DocumentUploadResponse> {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<DocumentUploadResponse>("/documents/upload", {
      method: "POST",
      body: form,
    });
  },

  /** List all documents with pagination. */
  async listDocuments(limit = 20, offset = 0): Promise<DocumentListResponse> {
    return apiFetch<DocumentListResponse>(
      `/documents?limit=${limit}&offset=${offset}`
    );
  },

  /** Get metadata for a single document. */
  async getDocument(id: string): Promise<DocumentMetadata> {
    return apiFetch<DocumentMetadata>(`/documents/${id}`);
  },

  /** Get all chunks for a processed document. */
  async getDocumentChunks(id: string): Promise<ChunkListResponse> {
    return apiFetch<ChunkListResponse>(`/documents/${id}/chunks`);
  },

  // Phase 2 Endpoints

  /** Execute semantic retrieval search against a document's vector index. */
  async searchRetrieval(
    documentId: string,
    query: string,
    topK = 5
  ): Promise<RetrievalSearchResponse> {
    return apiFetch<RetrievalSearchResponse>("/retrieval/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId, query, top_k: topK }),
    });
  },

  /** Generate a source-grounded content transformation for a document. */
  async generateTransformation(
    payload: TransformationCreatePayload
  ): Promise<TransformationResponse> {
    return apiFetch<TransformationResponse>("/transformations/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  /** Retrieve details for a single generated transformation. */
  async getTransformation(id: string): Promise<TransformationResponse> {
    return apiFetch<TransformationResponse>(`/transformations/${id}`);
  },

  /** List all generated transformations for a document. */
  async listDocumentTransformations(
    documentId: string
  ): Promise<TransformationListResponse> {
    return apiFetch<TransformationListResponse>(
      `/documents/${documentId}/transformations`
    );
  },

  // Phase 3 Endpoints

  /** Trigger AI verification and factuality analysis for a transformation. */
  async verifyTransformation(
    transformationId: string
  ): Promise<VerificationReportResponse> {
    return apiFetch<VerificationReportResponse>("/verification/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transformation_id: transformationId }),
    });
  },

  /** Fetch an existing verification report for a transformation. */
  async getVerificationReport(
    transformationId: string
  ): Promise<VerificationReportResponse> {
    return apiFetch<VerificationReportResponse>(
      `/transformations/${transformationId}/verification`
    );
  },

  /** Permanently delete a document and all associated data. */
  async deleteDocument(id: string): Promise<void> {
    await apiFetch<void>(`/documents/${id}`, { method: "DELETE" });
  },

  /** Check text for plagiarism signals and AI-generation probability. */
  async checkPlagiarism(text: string): Promise<PlagiarismResponse> {
    return apiFetch<PlagiarismResponse>("/tools/plagiarism-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  },

  /** Humanize AI-generated text to sound more natural. */
  async humanizeText(
    text: string,
    style: string,
    intensity: string
  ): Promise<HumanizeResponse> {
    return apiFetch<HumanizeResponse>("/tools/humanize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, style, intensity }),
    });
  },
};

// ─── Tool Response Types ────────────────────────────────────────────────────

export interface PlagiarismMatch {
  phrase: string;
  similarity_score: number;
  signal: string;
}

export interface PlagiarismResponse {
  overall_score: number;
  ai_generated_probability: number;
  human_written_probability: number;
  originality_score: number;
  perplexity_score: number;
  burstiness_score: number;
  flagged_phrases: PlagiarismMatch[];
  verdict: string;
  detail: string;
}

export interface HumanizeResponse {
  original_text: string;
  humanized_text: string;
  changes_made: string[];
  ai_score_before: number;
  ai_score_after: number;
  word_count_original: number;
  word_count_humanized: number;
}

