"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, type DocumentMetadata } from "@/lib/api";
import { TransformationHub } from "@/components/documents/TransformationHub";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeBadge({ ext }: { ext: string }) {
  const e = ext.toLowerCase().replace(".", "");
  const colors: Record<string, string> = {
    pdf: "badge-red",
    docx: "badge-blue",
    pptx: "badge-yellow",
    txt: "badge-gray",
  };
  return (
    <span className={`badge ${colors[e] ?? "badge-gray"} uppercase`}>
      {e}
    </span>
  );
}

export default function DocumentWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [doc, setDoc] = useState<DocumentMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast, ToastContainer } = useToast();

  // Fetch document
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await api.getDocument(id);
        if (!cancelled) { setDoc(data); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Document not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  // Poll while processing
  useEffect(() => {
    if (!doc) return;
    if (doc.status !== "uploaded" && doc.status !== "processing") return;

    const interval = setInterval(async () => {
      try {
        const updated = await api.getDocument(id);
        setDoc(updated);
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [doc, id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteDocument(id);
      router.push("/documents");
    } catch {
      showToast("Failed to delete document", "error");
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl space-y-4">
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-96 w-full" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-sm mx-auto pt-16 text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-900">{error ?? "Document not found"}</p>
        <Link href="/documents" className="btn-secondary text-sm inline-flex">
          ← Back to My Documents
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <ToastContainer />

      {/* Document Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back */}
          <Link
            href="/documents"
            id="back-to-docs"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileTypeBadge ext={doc.file_extension} />
              <h1 className="text-base font-bold text-gray-900 truncate">
                {doc.original_filename}
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {doc.page_count ? `${doc.page_count} pages · ` : ""}
              {formatBytes(doc.file_size_bytes)}
              {doc.word_count ? ` · ${doc.word_count.toLocaleString()} words` : ""}
            </p>
          </div>
        </div>

        {/* Delete action */}
        <button
          type="button"
          id="delete-document-btn"
          onClick={() => setShowDeleteDialog(true)}
          className="btn-ghost text-sm text-red-500 hover:bg-red-50 hover:text-red-600 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
          Delete
        </button>
      </div>

      {/* Processing state */}
      {(doc.status === "uploaded" || doc.status === "processing") && (
        <div className="surface-card p-8 flex flex-col items-center justify-center gap-4 text-center animate-fade-in">
          <div className="h-10 w-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Preparing your document…</p>
            <p className="text-xs text-gray-400 mt-1">This usually takes less than a minute</p>
          </div>
        </div>
      )}

      {/* Failed state */}
      {doc.status === "failed" && (
        <div className="surface-card p-8 text-center space-y-3 border-red-100">
          <p className="text-sm font-semibold text-red-600">Document processing failed</p>
          {doc.error_message && (
            <p className="text-xs text-gray-500">{doc.error_message}</p>
          )}
          <p className="text-xs text-gray-400">
            Please delete this document and try uploading it again.
          </p>
        </div>
      )}

      {/* Main workspace: TransformationHub */}
      {doc.status === "completed" && (
        <TransformationHub documentId={id} />
      )}

      {/* Delete confirmation */}
      {showDeleteDialog && (
        <ConfirmDialog
          title={`Delete "${doc.original_filename}"?`}
          description="This will permanently remove the document and all its generated content. This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          destructive
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}
