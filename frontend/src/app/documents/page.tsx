"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type DocumentMetadata } from "@/lib/api";
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

function FileIcon({ ext }: { ext: string }) {
  const e = ext.toLowerCase().replace(".", "");
  const colors: Record<string, string> = {
    pdf: "text-red-500 bg-red-50",
    docx: "text-blue-500 bg-blue-50",
    pptx: "text-orange-500 bg-orange-50",
    txt: "text-gray-500 bg-gray-100",
  };
  const cls = colors[e] ?? "text-gray-500 bg-gray-100";
  return (
    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${cls}`}>
      {e.toUpperCase()}
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentMetadata["status"] }) {
  if (status === "completed") return null; // completed is normal — don't show a badge
  if (status === "processing") return <span className="badge badge-blue">Preparing…</span>;
  if (status === "uploaded") return <span className="badge badge-yellow">Queued</span>;
  if (status === "failed") return <span className="badge badge-red">Failed</span>;
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
      const matchesType = typeFilter === "all" || doc.file_extension.toLowerCase().includes(typeFilter);
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
      showToast("Document deleted", "success");
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete document", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <ToastContainer />

      {error && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-sm flex items-start gap-3 shadow-sm">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">Backend Connection Notice</p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          id="docs-upload-btn"
          onClick={() => {
            // Trigger the sidebar upload modal via a custom event
            document.getElementById("sidebar-upload-btn")?.click();
          }}
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search documents…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
            id="doc-search-input"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field w-36"
          id="doc-type-filter"
        >
          <option value="all">All types</option>
          <option value="pdf">PDF</option>
          <option value="docx">Word</option>
          <option value="pptx">PowerPoint</option>
          <option value="txt">Text</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="input-field w-36"
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
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      ) : filteredDocs.length > 0 ? (
        <div className="surface-card divide-y divide-gray-100 overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[auto_1fr_120px_100px_160px] gap-4 items-center px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="w-8" />
            <div>Name</div>
            <div>Type</div>
            <div>Size</div>
            <div className="text-right">Actions</div>
          </div>
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              id={`doc-row-${doc.id}`}
              className="flex sm:grid sm:grid-cols-[auto_1fr_120px_100px_160px] gap-3 sm:gap-4 items-center px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <FileIcon ext={doc.file_extension} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.original_filename}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <p className="text-xs text-gray-400">
                    {doc.page_count ? `${doc.page_count} pages • ` : ""}
                    {formatDate(doc.created_at)}
                  </p>
                  <StatusBadge status={doc.status} />
                  {doc.error_message && (
                    <span className="text-xs text-red-500">{doc.error_message.slice(0, 60)}</span>
                  )}
                </div>
              </div>
              <div className="hidden sm:block text-sm text-gray-500">
                {doc.file_extension.replace(".", "").toUpperCase()}
              </div>
              <div className="hidden sm:block text-sm text-gray-500">
                {formatBytes(doc.file_size_bytes)}
              </div>
              <div className="flex items-center gap-2 justify-end shrink-0">
                <Link
                  href={`/documents/${doc.id}`}
                  id={`open-doc-${doc.id}`}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Open
                </Link>
                <button
                  type="button"
                  id={`delete-doc-${doc.id}`}
                  onClick={() => setDeleteTarget(doc)}
                  className="btn-ghost text-xs py-1.5 px-2 text-red-500 hover:bg-red-50 hover:text-red-600"
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
        <div className="surface-card p-12 text-center">
          {searchQuery || typeFilter !== "all" ? (
            <>
              <p className="text-sm font-semibold text-gray-900 mb-1">No documents found</p>
              <p className="text-sm text-gray-500 mb-4">Try adjusting your search or filters.</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setTypeFilter("all"); }}
                className="btn-secondary text-sm"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">No documents yet</p>
              <p className="text-sm text-gray-500 mb-5">
                Upload a document to start transforming your content.
              </p>
              <button
                type="button"
                onClick={() => document.getElementById("sidebar-upload-btn")?.click()}
                className="btn-primary text-sm"
              >
                Upload a document
              </button>
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title={`Delete "${deleteTarget.original_filename}"?`}
          description="This will permanently remove the document and all its generated content. This action cannot be undone."
          confirmLabel="Delete"
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
