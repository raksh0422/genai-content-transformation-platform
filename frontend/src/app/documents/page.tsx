"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type DocumentMetadata } from "@/lib/api";
import { openUploadModal } from "@/lib/events";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function StatusBadge({ status }: { status: DocumentMetadata["status"] }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F3ED] text-[#2E6A4F]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#2E6A4F]" />
        <span>Ready</span>
      </span>
    );
  }
  if (status === "processing" || status === "uploaded") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FDF6E2] text-[#9A6B1F]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#9A6B1F] animate-pulse" />
        <span>Preparing…</span>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FBEBEB] text-[#A83232]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#A83232]" />
        <span>Needs attention</span>
      </span>
    );
  }
  return null;
}

export default function DocumentLibraryPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "name" | "size">("newest");
  const [deleteTarget, setDeleteTarget] = useState<DocumentMetadata | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    let active = true;
    api.listDocuments(100, 0)
      .then((res) => {
        if (active) {
          setDocuments(res.items);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredDocs = documents
    .filter((doc) => {
      const matchesSearch = doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase());
      const ext = doc.file_extension.toLowerCase();
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "pdf" && ext.includes("pdf")) ||
        (typeFilter === "docx" && ext.includes("doc")) ||
        (typeFilter === "txt" && ext.includes("txt"));
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "name") return a.original_filename.localeCompare(b.original_filename);
      if (sortBy === "size") return b.file_size_bytes - a.file_size_bytes;
      return 0;
    });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteDocument(deleteTarget.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      showToast("Document deleted successfully", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete document", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-12">
      <ToastContainer />

      {error && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-sm flex items-start gap-3 shadow-sm">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold text-xs text-amber-900">Service Notice</p>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E8E3]">
        <div>
          <h1 className="text-2xl font-bold text-[#202522] tracking-tight">My Documents</h1>
          <p className="text-xs text-[#69736C] mt-1">
            {documents.length} source file{documents.length !== 1 ? "s" : ""} in your workspace
          </p>
        </div>
        <button
          type="button"
          id="docs-upload-btn"
          onClick={openUploadModal}
          className="btn-primary text-xs font-semibold py-2.5 px-4 shadow-sm"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#929D95]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search documents by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 text-xs"
            id="doc-search-input"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by file format"
          className="input-field w-36 text-xs"
          id="doc-type-filter"
        >
          <option value="all">All Formats</option>
          <option value="pdf">PDF</option>
          <option value="docx">Word (DOCX)</option>
          <option value="txt">Text (TXT)</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          aria-label="Sort documents"
          className="input-field w-36 text-xs"
          id="doc-sort"
        >
          <option value="newest">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="size">Largest first</option>
        </select>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      ) : filteredDocs.length > 0 ? (
        <div className="surface-card divide-y divide-[#F0F2EF] overflow-hidden bg-white border border-[#E4E8E3] shadow-sm rounded-xl">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[auto_1fr_110px_100px_150px] gap-4 items-center px-5 py-2.5 bg-[#FAFAF9] text-[11px] font-semibold text-[#69736C] uppercase tracking-wider border-b border-[#E4E8E3]">
            <div className="w-12">Format</div>
            <div>Document Name</div>
            <div>File Size</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              id={`doc-row-${doc.id}`}
              className="flex sm:grid sm:grid-cols-[auto_1fr_110px_100px_150px] gap-3 sm:gap-4 items-center px-5 py-3.5 hover:bg-[#FAFAF9] transition-colors"
            >
              <div className="w-12 shrink-0">
                <FileTypeBadge ext={doc.file_extension} />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/documents/${doc.id}`}
                  className="text-sm font-semibold text-[#202522] hover:text-[#315B46] truncate block transition-colors"
                  title={doc.original_filename}
                >
                  {doc.original_filename}
                </Link>
                <p className="text-xs text-[#929D95] mt-0.5">
                  Added {formatDate(doc.created_at)}
                  {doc.page_count ? ` • ${doc.page_count} pages` : ""}
                </p>
              </div>
              <div className="hidden sm:block text-xs text-[#69736C] font-mono">
                {formatBytes(doc.file_size_bytes)}
              </div>
              <div className="hidden sm:block">
                <StatusBadge status={doc.status} />
              </div>
              <div className="flex items-center gap-2 justify-end shrink-0">
                <Link
                  href={`/documents/${doc.id}`}
                  id={`open-doc-${doc.id}`}
                  className="btn-secondary text-xs py-1 px-3 font-semibold"
                >
                  Open Workspace
                </Link>
                <button
                  type="button"
                  id={`delete-doc-${doc.id}`}
                  onClick={() => setDeleteTarget(doc)}
                  className="p-1.5 text-[#929D95] hover:text-[#A83232] hover:bg-[#FBEBEB] rounded-lg transition-colors"
                  aria-label={`Delete ${doc.original_filename}`}
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
        <div className="surface-card p-12 text-center bg-white border border-[#E4E8E3] rounded-xl">
          {searchQuery || typeFilter !== "all" ? (
            <>
              <p className="text-sm font-semibold text-[#202522] mb-1">No matching documents found</p>
              <p className="text-xs text-[#69736C] mb-4">Try clearing your search query or format filter.</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setTypeFilter("all"); }}
                className="btn-secondary text-xs"
              >
                Reset Filters
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-[#EBF1ED] text-[#315B46] rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[#202522] mb-1">Your document library is empty</h3>
              <p className="text-xs text-[#69736C] mb-5 max-w-sm mx-auto leading-relaxed">
                Upload your first document to begin generating executive summaries, quizzes, and briefings.
              </p>
              <button
                type="button"
                onClick={openUploadModal}
                className="btn-primary text-xs font-semibold py-2 px-4 shadow-sm"
              >
                Upload Document
              </button>
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title={`Delete "${deleteTarget.original_filename}"?`}
          description="This will permanently remove the document and all associated summaries and generated outputs. This action cannot be undone."
          confirmLabel="Delete Document"
          cancelLabel="Cancel"
          destructive
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
