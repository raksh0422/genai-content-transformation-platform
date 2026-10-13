"use client";

import { useEffect, useState, useCallback } from "react";
import {
  api,
  type AdminDocumentItem,
} from "@/lib/api";

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<AdminDocumentItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [limit] = useState<number>(10);
  const [offset, setOffset] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inspection modal state
  const [inspectDoc, setInspectDoc] = useState<AdminDocumentItem | null>(null);

  // Deletion modal state
  const [deleteDoc, setDeleteDoc] = useState<AdminDocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.admin.getDocuments({
        search: search.trim() || undefined,
        file_type: fileTypeFilter || undefined,
        status: statusFilter || undefined,
        limit,
        offset,
      });
      setDocuments(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      console.error("Failed to load documents:", err);
      setError(err instanceof Error ? err.message : "Failed to load platform documents");
    } finally {
      setIsLoading(false);
    }
  }, [search, fileTypeFilter, statusFilter, limit, offset]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const confirmDelete = async () => {
    if (!deleteDoc) return;
    setIsDeleting(true);
    try {
      await api.admin.deleteDocument(deleteDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDoc.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeleteDoc(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4E8E3]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] flex items-center gap-3">
            <span>Documents Management</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20">
              {total} indexed files
            </span>
          </h1>
          <p className="text-xs text-[#69736C] mt-1">
            Global ingestion registry, parsing statuses, chunk topologies, and storage metadata
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchDocuments()}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-[#F8F9F7] text-[#69736C] hover:text-[#202522] rounded-lg border border-[#E4E8E3] text-xs font-medium shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors self-start sm:self-auto"
        >
          <svg className={`w-3.5 h-3.5 text-[#315B46] ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative sm:col-span-2">
          <input
            type="text"
            placeholder="Search by filename or owner email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            id="admin-docs-search"
            className="w-full bg-white border border-[#E4E8E3] rounded-lg pl-9 pr-3 py-2 text-xs text-[#202522] placeholder-[#8C958E] focus:outline-none focus:border-[#315B46] focus:ring-1 focus:ring-[#315B46] transition-colors"
          />
          <svg
            className="w-4 h-4 text-[#8C958E] absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>

        {/* File Type Filter */}
        <div>
          <select
            value={fileTypeFilter}
            onChange={(e) => {
              setFileTypeFilter(e.target.value);
              setOffset(0);
            }}
            id="admin-docs-type-filter"
            aria-label="Filter by file type"
            className="w-full bg-white border border-[#E4E8E3] rounded-lg px-3 py-2 text-xs text-[#202522] focus:outline-none focus:border-[#315B46] focus:ring-1 focus:ring-[#315B46] transition-colors"
          >
            <option value="">All File Types</option>
            <option value="pdf">PDF Document (.pdf)</option>
            <option value="docx">Word Document (.docx)</option>
            <option value="txt">Text File (.txt)</option>
            <option value="md">Markdown (.md)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            id="admin-docs-status-filter"
            aria-label="Filter by indexing status"
            className="w-full bg-white border border-[#E4E8E3] rounded-lg px-3 py-2 text-xs text-[#202522] focus:outline-none focus:border-[#315B46] focus:ring-1 focus:ring-[#315B46] transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#A83232]/20 text-[#A83232] text-xs">
          {error}
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-white border border-[#E4E8E3] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4E8E3] bg-[#F8F9F7] text-[10px] uppercase text-[#69736C] font-semibold tracking-wider">
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Size</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Chunks</th>
                <th className="py-3 px-3 text-center">Transforms</th>
                <th className="py-3 px-3">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8E3]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="py-4 px-4">
                      <div className="h-4 bg-[#E4E8E3] rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#8C958E] text-xs">
                    No documents found matching filters.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#F8F9F7]/70 transition-colors">
                    {/* Filename */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 max-w-[200px] lg:max-w-xs">
                        <svg className="w-4 h-4 text-[#315B46] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        <span className="font-semibold text-[#202522] truncate" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-3">
                      <div>
                        <p className="text-[#202522] font-medium truncate">{doc.owner_name}</p>
                        <p className="text-[10px] text-[#69736C] truncate">{doc.owner_email}</p>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#F8F9F7] text-[#69736C] border border-[#E4E8E3]">
                        {doc.file_extension}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="py-3.5 px-3 text-[#69736C] text-[11px] whitespace-nowrap font-mono">
                      {formatFileSize(doc.file_size_bytes)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          doc.status === "completed" || doc.status === "processed"
                            ? "bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20"
                            : doc.status === "processing"
                            ? "bg-[#FEF7EC] text-[#9A6B1F] border border-[#9A6B1F]/20"
                            : "bg-[#FDF2F2] text-[#A83232] border border-[#A83232]/20"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            doc.status === "completed" || doc.status === "processed"
                              ? "bg-[#2E6A4F]"
                              : doc.status === "processing"
                              ? "bg-[#9A6B1F] animate-pulse"
                              : "bg-[#A83232]"
                          }`}
                        />
                        <span>{doc.status}</span>
                      </span>
                    </td>

                    {/* Chunks */}
                    <td className="py-3.5 px-3 text-center text-[#202522] font-semibold font-mono">
                      {doc.chunk_count}
                    </td>

                    {/* Transforms */}
                    <td className="py-3.5 px-3 text-center text-[#202522] font-semibold font-mono">
                      {doc.transformation_count}
                    </td>

                    {/* Uploaded */}
                    <td className="py-3.5 px-3 text-[#8C958E] text-[11px] whitespace-nowrap">
                      {new Date(doc.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setInspectDoc(doc)}
                          className="px-2 py-1 text-[11px] bg-white hover:bg-[#F8F9F7] text-[#202522] rounded border border-[#E4E8E3] transition-colors font-medium shadow-2xs"
                        >
                          Metadata
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteDoc(doc)}
                          className="px-2 py-1 text-[11px] bg-[#FDF2F2] hover:bg-[#FDF2F2]/80 text-[#A83232] rounded border border-[#A83232]/20 transition-colors font-medium"
                        >
                          Purge
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-[#E4E8E3] bg-[#F8F9F7] flex items-center justify-between text-xs">
          <p className="text-[#69736C]">
            Showing {Math.min(total, offset + 1)} - {Math.min(total, offset + documents.length)} of {total} documents
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={offset === 0 || isLoading}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="px-3 py-1 bg-white hover:bg-[#F8F9F7] disabled:opacity-40 rounded border border-[#E4E8E3] text-[#202522] transition-colors font-medium"
            >
              &larr; Previous
            </button>
            <button
              type="button"
              disabled={offset + limit >= total || isLoading}
              onClick={() => setOffset(offset + limit)}
              className="px-3 py-1 bg-white hover:bg-[#F8F9F7] disabled:opacity-40 rounded border border-[#E4E8E3] text-[#202522] transition-colors font-medium"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── Metadata Inspection Modal ─────────────────────────────────────── */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-[#E4E8E3] rounded-xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E8E3]">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#315B46]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-base font-bold text-[#202522]">Document Metadata Record</h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                className="text-[#69736C] hover:text-[#202522]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3] space-y-1">
                <p className="text-[#69736C] text-[10px] uppercase font-bold tracking-wider">Filename</p>
                <p className="font-semibold text-[#202522] break-all">{inspectDoc.filename}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                  <p className="text-[#69736C] text-[10px] uppercase font-bold tracking-wider">Document ID</p>
                  <p className="text-[#69736C] text-[10px] font-mono break-all mt-0.5">{inspectDoc.id}</p>
                </div>
                <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                  <p className="text-[#69736C] text-[10px] uppercase font-bold tracking-wider">Owner</p>
                  <p className="text-[#202522] font-semibold mt-0.5">{inspectDoc.owner_name}</p>
                  <p className="text-[#69736C] text-[10px]">{inspectDoc.owner_email}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                  <p className="text-[#69736C] text-[10px] uppercase font-bold tracking-wider">File Size</p>
                  <p className="text-[#202522] font-bold font-mono mt-0.5">{formatFileSize(inspectDoc.file_size_bytes)}</p>
                </div>
                <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                  <p className="text-[#69736C] text-[10px] uppercase font-bold tracking-wider">Chunks</p>
                  <p className="text-[#202522] font-bold font-mono mt-0.5">{inspectDoc.chunk_count} passages</p>
                </div>
                <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                  <p className="text-[#69736C] text-[10px] uppercase font-bold tracking-wider">Transforms</p>
                  <p className="text-[#202522] font-bold font-mono mt-0.5">{inspectDoc.transformation_count}</p>
                </div>
              </div>

              {/* Strict Zero-Knowledge Privacy Notice */}
              <div className="p-3 bg-[#FEF7EC] border border-[#9A6B1F]/20 rounded-lg text-[#9A6B1F] text-[11px] leading-relaxed">
                <span className="font-bold">Zero-Knowledge Admin Policy:</span> Raw document text and embedding vectors are strictly isolated to the document owner. ContentAI prevents administrative inspection of private document contents.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectDoc(null)}
                className="px-4 py-2 bg-white hover:bg-[#F8F9F7] text-[#202522] text-xs font-medium rounded-lg border border-[#E4E8E3] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cascade Delete Confirmation Modal ─────────────────────────────── */}
      {deleteDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-[#E4E8E3] rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#A83232]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h2 className="text-base font-bold text-[#202522]">Permanently Purge Document?</h2>
            </div>

            <p className="text-xs text-[#69736C] leading-relaxed">
              This action will permanently delete <strong className="text-[#202522]">{deleteDoc.filename}</strong>, along with its stored file, <strong className="text-[#202522]">{deleteDoc.chunk_count} chunk passages</strong>, and all associated vector embeddings.
            </p>

            <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3] text-[11px] text-[#69736C] space-y-1">
              <p>Owner: <span className="text-[#202522] font-semibold">{deleteDoc.owner_email}</span></p>
              <p>Transformations attached: <span className="text-[#9A6B1F] font-semibold">{deleteDoc.transformation_count}</span></p>
              <p>Audit Event: <span className="text-[#A83232] font-semibold">Admin Purge will be logged</span></p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDoc(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-white hover:bg-[#F8F9F7] text-[#202522] text-xs font-medium rounded-lg border border-[#E4E8E3] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-[#A83232] hover:bg-[#8F2B2B] text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {isDeleting ? "Purging..." : "Confirm Purge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
