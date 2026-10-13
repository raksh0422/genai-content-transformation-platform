"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type DocumentMetadata, type TransformationResponse } from "@/lib/api";
import { openUploadModal } from "@/lib/events";
import { useAuth } from "@/lib/auth-context";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function FileTypeBadge({ ext }: { ext: string }) {
  const e = ext.toLowerCase().replace(".", "");
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    pdf: { bg: "bg-red-50 border-red-200/60", text: "text-red-700", label: "PDF" },
    docx: { bg: "bg-blue-50 border-blue-200/60", text: "text-blue-700", label: "DOCX" },
    txt: { bg: "bg-stone-100 border-stone-200", text: "text-stone-700", label: "TXT" },
  };
  const config = styles[e] || { bg: "bg-gray-100 border-gray-200", text: "text-gray-700", label: e.toUpperCase() };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider border ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function transformationLabel(type: string) {
  const labels: Record<string, string> = {
    executive_summary: "Executive Summary",
    short_summary: "Short Summary",
    faq: "Frequently Asked Questions",
    quiz: "Interactive Quiz",
    email: "Professional Email",
    social_post: "Social Media Post",
    presentation_outline: "Presentation Outline",
  };
  return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [recentTransformations, setRecentTransformations] = useState<TransformationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");

  // Deletion modal state
  const [docToDelete, setDocToDelete] = useState<DocumentMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast, ToastContainer } = useToast();

  // Route protection
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const loadDashboardData = async () => {
    try {
      const docsRes = await api.listDocuments(100, 0);
      setDocuments(docsRes.items);
      setError(null);

      const completedDocs = docsRes.items.filter((d) => d.status === "completed");
      const tfPromises = completedDocs.slice(0, 10).map((d) =>
        api.listDocumentTransformations(d.id).catch(() => ({ items: [] }))
      );
      const tfResults = await Promise.allSettled(tfPromises);

      const allTfs: TransformationResponse[] = [];
      tfResults.forEach((res) => {
        if (res.status === "fulfilled" && Array.isArray(res.value?.items)) {
          allTfs.push(...res.value.items);
        }
      });
      allTfs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentTransformations(allTfs.slice(0, 6));
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError(err instanceof Error ? err.message : "Unable to reach server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, authLoading]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase());
      const ext = doc.file_extension.toLowerCase();
      const matchesFormat =
        formatFilter === "all" ||
        (formatFilter === "pdf" && ext.includes("pdf")) ||
        (formatFilter === "docx" && ext.includes("doc")) ||
        (formatFilter === "txt" && ext.includes("txt"));
      return matchesSearch && matchesFormat;
    });
  }, [documents, searchQuery, formatFilter]);

  const confirmDeleteDocument = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteDocument(docToDelete.id);
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setRecentTransformations((prev) => prev.filter((t) => t.document_id !== docToDelete.id));
      showToast("Document removed successfully", "success");
      setDocToDelete(null);
    } catch (err) {
      showToast("Failed to delete document", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-[#69736C] text-xs">
          <svg className="animate-spin h-4 w-4 text-[#315B46]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl animate-fade-in pb-12">
      <ToastContainer />

      {/* Connection notice if any */}
      {error && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-sm flex items-start justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold text-xs text-amber-900">Service Notice</p>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="text-xs font-semibold text-amber-900 hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4E8E3]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202522] tracking-tight">
            {getGreeting()}, {user?.full_name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-sm text-[#69736C] mt-1">
            Turn your documents into clear, useful summaries, FAQs, quizzes, and briefs.
          </p>
        </div>

        <button
          type="button"
          id="dashboard-upload-btn"
          onClick={openUploadModal}
          className="btn-primary text-xs font-semibold py-2.5 px-4 self-start sm:self-auto shadow-sm"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Upload Document</span>
        </button>
      </div>

      {/* ── A. Primary Upload Area ───────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#69736C]">
            Add a New Document
          </h2>
          <span className="text-xs text-[#69736C]">PDF, Word (.docx), or Text (.txt) up to 50 MB</span>
        </div>

        <div className="surface-card p-6 sm:p-8 bg-white border border-[#E4E8E3] shadow-sm">
          <DocumentUpload
            onUploadSuccess={(newDoc) => {
              showToast("Document uploaded successfully", "success");
              router.push(`/documents/${newDoc.id}`);
            }}
          />
        </div>
      </section>

      {/* ── B. Originality & Text Analysis Tools ─────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#69736C]">
            Text Analysis & AI Originality Tools
          </h2>
          <span className="text-xs text-[#69736C]">Instant standalone text analysis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plagiarism Tool Card */}
          <Link
            href="/tools?tab=plagiarism"
            id="dashboard-tool-plagiarism"
            className="surface-card p-5 bg-white border border-[#E4E8E3] hover:border-[#315B46]/40 transition-all group flex flex-col justify-between shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-[#EBF1ED] border border-[#315B46]/20 text-[#315B46]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20">
                  Originality Check
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#202522] mt-3 group-hover:text-[#315B46] transition-colors">
                Plagiarism & AI Content Scanner
              </h3>
              <p className="text-xs text-[#69736C] mt-1.5 leading-relaxed">
                Scan essays, reports, or articles for linguistic perplexity, burstiness variation, and formulaic AI signals.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F0F2EF] flex items-center justify-between text-xs font-semibold text-[#315B46]">
              <span>Scan text for plagiarism</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </div>
          </Link>

          {/* Humanizer Tool Card */}
          <Link
            href="/tools?tab=humanize"
            id="dashboard-tool-humanizer"
            className="surface-card p-5 bg-white border border-[#E4E8E3] hover:border-[#315B46]/40 transition-all group flex flex-col justify-between shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-[#FEF7EC] border border-[#9A6B1F]/20 text-[#9A6B1F]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#FEF7EC] text-[#9A6B1F] border border-[#9A6B1F]/30">
                  AI Rewriter
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#202522] mt-3 group-hover:text-[#315B46] transition-colors">
                AI Content Humanizer
              </h3>
              <p className="text-xs text-[#69736C] mt-1.5 leading-relaxed">
                Transform robotic, repetitive drafts into natural, engaging, and authentic human prose with tone controls.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F0F2EF] flex items-center justify-between text-xs font-semibold text-[#315B46]">
              <span>Open AI Humanizer</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── C. Recent Documents ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#69736C]">
              Your Documents
            </h2>
            <span className="text-xs text-[#929D95]">({documents.length})</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E4E8E3] rounded-lg focus:outline-none focus:border-[#315B46] text-[#202522] placeholder-[#929D95] w-40 sm:w-52"
              />
              <svg className="w-3.5 h-3.5 text-[#929D95] absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>

            {/* Format Filter */}
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              aria-label="Filter documents by format"
              className="py-1.5 px-2.5 text-xs bg-white border border-[#E4E8E3] rounded-lg text-[#202522] focus:outline-none focus:border-[#315B46]"
            >
              <option value="all">All Formats</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word (DOCX)</option>
              <option value="txt">Text (TXT)</option>
            </select>

            <Link
              href="/documents"
              className="text-xs text-[#315B46] font-semibold hover:underline ml-1 shrink-0"
            >
              View all →
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-16 w-full" />
            ))}
          </div>
        ) : filteredDocs.length > 0 ? (
          <div className="surface-card divide-y divide-[#F0F2EF] overflow-hidden bg-white border border-[#E4E8E3] shadow-sm">
            {filteredDocs.slice(0, 6).map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 hover:bg-[#FAFAF9] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <FileTypeBadge ext={doc.file_extension} />
                  <div className="min-w-0">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="text-sm font-semibold text-[#202522] hover:text-[#315B46] truncate block transition-colors"
                      title={doc.original_filename}
                    >
                      {doc.original_filename}
                    </Link>
                    <p className="text-xs text-[#69736C] mt-0.5 flex items-center gap-2">
                      <span>{formatBytes(doc.file_size_bytes)}</span>
                      <span>•</span>
                      <span>Added {formatRelativeDate(doc.created_at)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Status Indicator */}
                  {doc.status === "completed" ? (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F3ED] text-[#2E6A4F]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2E6A4F]" />
                      <span>Ready</span>
                    </span>
                  ) : doc.status === "failed" ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FBEBEB] text-[#A83232]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#A83232]" />
                      <span>Needs attention</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FDF6E2] text-[#9A6B1F]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#9A6B1F] animate-pulse" />
                      <span>Preparing…</span>
                    </span>
                  )}

                  {/* Actions */}
                  <Link
                    href={`/documents/${doc.id}`}
                    className="btn-secondary text-xs py-1.5 px-3 font-semibold"
                  >
                    Open Workspace
                  </Link>

                  <button
                    type="button"
                    onClick={() => setDocToDelete(doc)}
                    title="Remove document"
                    className="p-1.5 rounded-lg text-[#929D95] hover:text-[#A83232] hover:bg-[#FBEBEB] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="surface-card p-10 text-center bg-white border border-[#E4E8E3] rounded-xl">
            <div className="w-12 h-12 bg-[#EBF1ED] rounded-xl flex items-center justify-center mx-auto mb-3 text-[#315B46]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-[#202522]">No documents uploaded yet</h3>
            <p className="text-xs text-[#69736C] max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
              Upload a document above to generate executive summaries, interactive quizzes, FAQs, and drafts.
            </p>
            <button
              type="button"
              onClick={openUploadModal}
              className="btn-primary text-xs font-semibold py-2 px-4"
            >
              Upload Your First Document
            </button>
          </div>
        )}
      </section>

      {/* ── C. Recent Transformations ────────────────────────────────────── */}
      {recentTransformations.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#69736C]">
              Recent Content Outputs
            </h2>
            <span className="text-xs text-[#929D95]">Latest {recentTransformations.length} items</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentTransformations.map((tf) => (
              <Link
                key={tf.id}
                href={`/documents/${tf.document_id}`}
                className="surface-card-interactive p-4 border border-[#E4E8E3] bg-white rounded-xl flex flex-col justify-between group hover:border-[#315B46]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EBF1ED] text-[#315B46]">
                      {transformationLabel(tf.transformation_type)}
                    </span>
                    <span className="text-[11px] text-[#929D95]">
                      {formatRelativeDate(tf.created_at)}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#202522] group-hover:text-[#315B46] transition-colors line-clamp-1">
                    {tf.title || transformationLabel(tf.transformation_type)}
                  </h3>
                  <p className="text-[11px] text-[#69736C] mt-1 line-clamp-2 leading-relaxed">
                    {tf.content.slice(0, 140).replace(/^[#*-]\s*/gm, "")}...
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-[#F0F2EF] flex items-center justify-between text-xs text-[#315B46] font-semibold">
                  <span>Open & Export</span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Delete Confirmation Dialog */}
      {docToDelete && (
        <ConfirmDialog
          title={`Delete "${docToDelete.original_filename}"?`}
          description="This will permanently remove the document and all associated summaries and generated outputs. This action cannot be undone."
          confirmLabel="Delete Document"
          cancelLabel="Keep Document"
          destructive
          loading={isDeleting}
          onConfirm={confirmDeleteDocument}
          onCancel={() => setDocToDelete(null)}
        />
      )}
    </div>
  );
}
