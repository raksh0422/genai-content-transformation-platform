/**
 * Typed API client for the GenAI Platform backend (Phases 1-5).
 * Authentication, RBAC, Admin Analytics, and Document Workspaces.
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

// ─── Phase 2 Types ──────────────────────────────────────────────────────────

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
  status?: string;
  duration_seconds?: number | null;
  error_category?: string | null;
  error_message?: string | null;
  user_id?: string;
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

// ─── Phase 3 Types ──────────────────────────────────────────────────────────

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

// ─── Phase 5: Auth & Admin Types ───────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "user" | "admin" | string;
  is_active: boolean;
  created_at: string;
  last_active_at: string | null;
  document_count: number;
  transformation_count: number;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface OverviewKPI {
  total_users: number;
  users_change_percent: number | null;
  active_users: number;
  active_users_change_percent: number | null;
  total_documents: number;
  documents_change_percent: number | null;
  total_transformations: number;
  transformations_change_percent: number | null;
  successful_transformations: number;
  successful_change_percent: number | null;
  failed_transformations: number;
  failed_change_percent: number | null;
  period_label: string;
}

export interface UserGrowthDataPoint {
  date: string;
  count: number;
  cumulative: number;
}

export interface DocumentUploadDataPoint {
  date: string;
  count: number;
}

export interface TransformationTypeBreakdown {
  type: string;
  label: string;
  count: number;
  percentage: number;
}

export interface GenerationStatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface UserEngagementDataPoint {
  date: string;
  active_users: number;
}

export interface PlatformUsageMetrics {
  top_transformation_type: string;
  average_duration_seconds: number;
  average_transformations_per_user: number;
  percentage_users_with_documents: number;
}

export interface ChartsResponse {
  user_growth: UserGrowthDataPoint[];
  document_uploads: DocumentUploadDataPoint[];
  transformation_activity: TransformationTypeBreakdown[];
  generation_status: GenerationStatusBreakdown[];
  user_engagement: UserEngagementDataPoint[];
  platform_usage: PlatformUsageMetrics;
}

export interface ActivityLogItem {
  id: string;
  user_id: string | null;
  user_email: string | null;
  event_type: string;
  resource_type: string | null;
  resource_id: string | null;
  description: string;
  status: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityLogListResponse {
  total: number;
  items: ActivityLogItem[];
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_active_at: string | null;
  document_count: number;
  transformation_count: number;
}

export interface AdminUserListResponse {
  total: number;
  items: AdminUserItem[];
}

export interface AdminUserDetailResponse {
  user: AdminUserItem;
  documents: DocumentMetadata[];
  recent_transformations: TransformationResponse[];
}

export interface AdminDocumentItem {
  id: string;
  filename: string;
  original_filename: string;
  file_extension: string;
  file_size_bytes: number;
  mime_type: string;
  status: string;
  user_id: string;
  owner_email: string | null;
  owner_name: string | null;
  created_at: string;
  chunk_count: number | null;
  word_count: number | null;
  transformation_count: number;
}

export interface AdminDocumentListResponse {
  total: number;
  items: AdminDocumentItem[];
}

export interface AdminTransformationItem {
  id: string;
  transformation_type: string;
  tone: string;
  length: string;
  title: string;
  status: string;
  duration_seconds: number | null;
  error_category: string | null;
  error_message: string | null;
  user_id: string;
  user_email: string | null;
  document_id: string;
  document_filename: string | null;
  created_at: string;
}

export interface AdminTransformationListResponse {
  total: number;
  items: AdminTransformationItem[];
}

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

// ─── Network Layer ──────────────────────────────────────────────────────────

function normalizeApiBaseUrl(inputUrl?: string): string {
  let url = (inputUrl ?? "http://localhost:8000/api/v1").trim().replace(/\/+$/, "");
  if (!url.endsWith("/api/v1")) {
    url = `${url}/api/v1`;
  }
  return url;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("contentai_auth_token");
  } catch {
    return null;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const mergedInit: RequestInit = {
    ...init,
    headers,
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, mergedInit);
  } catch (err: unknown) {
    const isBrowser = typeof window !== "undefined";
    const isNotLocal =
      isBrowser &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1";
    if (isNotLocal && API_BASE_URL.includes("localhost")) {
      throw new Error(
        `Unable to reach backend: The app is deployed at ${window.location.origin}, but NEXT_PUBLIC_API_URL is still pointing to "${API_BASE_URL}". Please set NEXT_PUBLIC_API_URL in your Vercel Project Settings to your deployed backend URL and redeploy.`
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Unable to fetch from API (${API_BASE_URL}): ${msg}. Ensure your backend server is deployed and running.`
    );
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    if (res.status === 401 && typeof window !== "undefined") {
      // Clear expired session if unauthorized
      localStorage.removeItem("contentai_auth_token");
      localStorage.removeItem("contentai_auth_user");
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

// ─── Exported API Service ───────────────────────────────────────────────────

export const api = {
  // ── Authentication ──
  async register(payload: {
    full_name: string;
    email: string;
    password: string;
    confirm_password: string;
  }): Promise<AuthTokenResponse> {
    return apiFetch<AuthTokenResponse>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async login(payload: {
    email: string;
    password: string;
    remember_me?: boolean;
  }): Promise<AuthTokenResponse> {
    return apiFetch<AuthTokenResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async getMe(): Promise<UserProfile> {
    return apiFetch<UserProfile>("/auth/me");
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<void>("/auth/logout", { method: "POST" });
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("contentai_auth_token");
        localStorage.removeItem("contentai_auth_user");
      }
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  },

  async updateProfile(fullName: string): Promise<UserProfile> {
    return apiFetch<UserProfile>("/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName }),
    });
  },

  async changePassword(currentPassword: string, newPassword: string, confirmNewPassword: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      }),
    });
  },

  // ── Documents ──
  async uploadDocument(file: File): Promise<DocumentUploadResponse> {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<DocumentUploadResponse>("/documents/upload", {
      method: "POST",
      body: form,
    });
  },

  async listDocuments(limit = 20, offset = 0): Promise<DocumentListResponse> {
    return apiFetch<DocumentListResponse>(
      `/documents?limit=${limit}&offset=${offset}`
    );
  },

  async getDocument(id: string): Promise<DocumentMetadata> {
    return apiFetch<DocumentMetadata>(`/documents/${id}`);
  },

  async getDocumentChunks(id: string): Promise<ChunkListResponse> {
    return apiFetch<ChunkListResponse>(`/documents/${id}/chunks`);
  },

  async deleteDocument(id: string): Promise<void> {
    await apiFetch<void>(`/documents/${id}`, { method: "DELETE" });
  },

  // ── Transformations ──
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

  async generateTransformation(
    payload: TransformationCreatePayload
  ): Promise<TransformationResponse> {
    return apiFetch<TransformationResponse>("/transformations/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async getTransformation(id: string): Promise<TransformationResponse> {
    return apiFetch<TransformationResponse>(`/transformations/${id}`);
  },

  async listDocumentTransformations(
    documentId: string
  ): Promise<TransformationListResponse> {
    return apiFetch<TransformationListResponse>(
      `/documents/${documentId}/transformations`
    );
  },

  async verifyTransformation(
    transformationId: string
  ): Promise<VerificationReportResponse> {
    return apiFetch<VerificationReportResponse>("/verification/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transformation_id: transformationId }),
    });
  },

  async getVerificationReport(
    transformationId: string
  ): Promise<VerificationReportResponse> {
    return apiFetch<VerificationReportResponse>(
      `/transformations/${transformationId}/verification`
    );
  },

  async checkPlagiarism(text: string): Promise<PlagiarismResponse> {
    return apiFetch<PlagiarismResponse>("/tools/plagiarism-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  },

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

  // ── Administrator API ──
  admin: {
    async getOverview(range = "30d"): Promise<OverviewKPI> {
      return apiFetch<OverviewKPI>(`/admin/analytics/overview?range=${range}`);
    },

    async getCharts(range = "30d"): Promise<ChartsResponse> {
      return apiFetch<ChartsResponse>(`/admin/analytics/charts?range=${range}`);
    },

    async getActivity(params?: {
      limit?: number;
      offset?: number;
      event_type?: string;
      status?: string;
    }): Promise<ActivityLogListResponse> {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.event_type) q.set("event_type", params.event_type);
      if (params?.status) q.set("status", params.status);
      return apiFetch<ActivityLogListResponse>(`/admin/analytics/activity?${q.toString()}`);
    },

    async getUsers(params?: {
      search?: string;
      role?: string;
      status?: string;
      sort_by?: string;
      sort_order?: string;
      limit?: number;
      offset?: number;
    }): Promise<AdminUserListResponse> {
      const q = new URLSearchParams();
      if (params?.search) q.set("search", params.search);
      if (params?.role) q.set("role", params.role);
      if (params?.status) q.set("status", params.status);
      if (params?.sort_by) q.set("sort_by", params.sort_by);
      if (params?.sort_order) q.set("sort_order", params.sort_order);
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      return apiFetch<AdminUserListResponse>(`/admin/users?${q.toString()}`);
    },

    async getUser(userId: string): Promise<AdminUserDetailResponse> {
      return apiFetch<AdminUserDetailResponse>(`/admin/users/${userId}`);
    },

    async updateUserStatus(userId: string, isActive: boolean): Promise<AdminUserItem> {
      return apiFetch<AdminUserItem>(`/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
    },

    async getDocuments(params?: {
      search?: string;
      file_type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }): Promise<AdminDocumentListResponse> {
      const q = new URLSearchParams();
      if (params?.search) q.set("search", params.search);
      if (params?.file_type) q.set("file_type", params.file_type);
      if (params?.status) q.set("status", params.status);
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      return apiFetch<AdminDocumentListResponse>(`/admin/documents?${q.toString()}`);
    },

    async deleteDocument(documentId: string): Promise<void> {
      await apiFetch<void>(`/admin/documents/${documentId}`, { method: "DELETE" });
    },

    async getTransformations(params?: {
      search?: string;
      transformation_type?: string;
      status?: string;
      user_id?: string;
      limit?: number;
      offset?: number;
    }): Promise<AdminTransformationListResponse> {
      const q = new URLSearchParams();
      if (params?.search) q.set("search", params.search);
      if (params?.transformation_type) q.set("transformation_type", params.transformation_type);
      if (params?.status) q.set("status", params.status);
      if (params?.user_id) q.set("user_id", params.user_id);
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      return apiFetch<AdminTransformationListResponse>(`/admin/transformations?${q.toString()}`);
    },
  },
};
