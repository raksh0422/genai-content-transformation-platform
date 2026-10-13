"use client";

import { useEffect, useState, useCallback } from "react";
import {
  api,
  type AdminTransformationItem,
} from "@/lib/api";

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "summary", label: "Executive Summary" },
  { value: "faq", label: "FAQ & Answers" },
  { value: "quiz", label: "Interactive Quiz" },
  { value: "email", label: "Email Campaign" },
  { value: "social", label: "Social Media Posts" },
  { value: "outline", label: "Presentation Outline" },
];

export default function AdminTransformationsPage() {
  const [transformations, setTransformations] = useState<AdminTransformationItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [limit] = useState<number>(10);
  const [offset, setOffset] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Diagnostic drawer
  const [selectedJob, setSelectedJob] = useState<AdminTransformationItem | null>(null);

  const fetchTransformations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.admin.getTransformations({
        search: search.trim() || undefined,
        transformation_type: typeFilter || undefined,
        status: statusFilter || undefined,
        limit,
        offset,
      });
      setTransformations(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      console.error("Failed to load transformations:", err);
      setError(err instanceof Error ? err.message : "Failed to load transformations");
    } finally {
      setIsLoading(false);
    }
  }, [search, typeFilter, statusFilter, limit, offset]);

  useEffect(() => {
    fetchTransformations();
  }, [fetchTransformations]);

  const formatTypeName = (type: string) => {
    const found = TYPE_OPTIONS.find((t) => t.value === type);
    if (found && found.label) return found.label;
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4E8E3]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] flex items-center gap-3">
            <span>Transformations Management</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20">
              {total} total jobs
            </span>
          </h1>
          <p className="text-xs text-[#69736C] mt-1">
            Global inference queue, synthesis pipeline telemetry, error diagnosis, and latency metrics
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchTransformations()}
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
        {/* Search */}
        <div className="relative sm:col-span-2">
          <input
            type="text"
            placeholder="Search by title, document, or user email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            id="admin-transform-search"
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

        {/* Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setOffset(0);
            }}
            id="admin-transform-type-filter"
            aria-label="Filter by transformation type"
            className="w-full bg-white border border-[#E4E8E3] rounded-lg px-3 py-2 text-xs text-[#202522] focus:outline-none focus:border-[#315B46] focus:ring-1 focus:ring-[#315B46] transition-colors"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
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
            id="admin-transform-status-filter"
            aria-label="Filter by execution status"
            className="w-full bg-white border border-[#E4E8E3] rounded-lg px-3 py-2 text-xs text-[#202522] focus:outline-none focus:border-[#315B46] focus:ring-1 focus:ring-[#315B46] transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#A83232]/20 text-[#A83232] text-xs">
          {error}
        </div>
      )}

      {/* Transformations Table */}
      <div className="bg-white border border-[#E4E8E3] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4E8E3] bg-[#F8F9F7] text-[10px] uppercase text-[#69736C] font-semibold tracking-wider">
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-3">Title / Task</th>
                <th className="py-3 px-3">User</th>
                <th className="py-3 px-3">Associated Document</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Executed</th>
                <th className="py-3 px-4 text-right">Diagnosis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8E3]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-4 bg-[#E4E8E3] rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : transformations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8C958E] text-xs">
                    No transformation jobs matching filters found.
                  </td>
                </tr>
              ) : (
                transformations.map((job) => (
                  <tr key={job.id} className="hover:bg-[#F8F9F7]/70 transition-colors">
                    {/* Type Badge */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#EBF1ED] text-[#315B46] border border-[#315B46]/20 whitespace-nowrap">
                        {formatTypeName(job.transformation_type)}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="py-3.5 px-3 max-w-[180px] lg:max-w-xs">
                      <p className="font-semibold text-[#202522] truncate" title={job.title}>
                        {job.title || formatTypeName(job.transformation_type)}
                      </p>
                      <p className="text-[10px] text-[#69736C] truncate font-mono">ID: {job.id}</p>
                    </td>

                    {/* User */}
                    <td className="py-3.5 px-3 max-w-[150px]">
                      <div>
                        <p className="text-[#202522] font-medium truncate">{job.user_email || "User"}</p>
                        <p className="text-[10px] text-[#69736C] truncate font-mono">ID: {job.user_id}</p>
                      </div>
                    </td>

                    {/* Associated Document */}
                    <td className="py-3.5 px-3 max-w-[160px] lg:max-w-[200px]">
                      <p className="text-[#202522] font-medium truncate" title={job.document_filename || "Document"}>
                        {job.document_filename || "Untitled Document"}
                      </p>
                      <p className="text-[10px] text-[#69736C] truncate font-mono">Doc ID: {job.document_id}</p>
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-3 text-[#202522] whitespace-nowrap font-mono">
                      {job.duration_seconds !== null ? (
                        <span>{job.duration_seconds}s</span>
                      ) : (
                        <span className="text-[#8C958E]">instant</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          job.status === "completed"
                            ? "bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20"
                            : job.status === "failed"
                            ? "bg-[#FDF2F2] text-[#A83232] border border-[#A83232]/20"
                            : "bg-[#FEF7EC] text-[#9A6B1F] border border-[#9A6B1F]/20"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            job.status === "completed"
                              ? "bg-[#2E6A4F]"
                              : job.status === "failed"
                              ? "bg-[#A83232]"
                              : "bg-[#9A6B1F] animate-pulse"
                          }`}
                        />
                        <span>{job.status}</span>
                      </span>
                    </td>

                    {/* Executed */}
                    <td className="py-3.5 px-3 text-[#8C958E] text-[11px] whitespace-nowrap">
                      {new Date(job.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Diagnosis Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedJob(job)}
                        className={`px-2.5 py-1 text-[11px] rounded border transition-colors font-medium shadow-2xs ${
                          job.status === "failed"
                            ? "bg-[#FDF2F2] hover:bg-[#FDF2F2]/80 text-[#A83232] border-[#A83232]/20 font-semibold"
                            : "bg-white hover:bg-[#F8F9F7] text-[#202522] border-[#E4E8E3]"
                        }`}
                      >
                        {job.status === "failed" ? "Inspect Error" : "Details"}
                      </button>
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
            Showing {Math.min(total, offset + 1)} - {Math.min(total, offset + transformations.length)} of {total} jobs
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

      {/* ── Diagnosis Drawer / Modal ─────────────────────────────────────── */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-end animate-fade-in">
          <div className="w-full max-w-lg h-full bg-white border-l border-[#E4E8E3] p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E4E8E3]">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        selectedJob.status === "completed"
                          ? "bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20"
                          : selectedJob.status === "failed"
                          ? "bg-[#FDF2F2] text-[#A83232] border border-[#A83232]/20"
                          : "bg-[#FEF7EC] text-[#9A6B1F] border border-[#9A6B1F]/20"
                      }`}
                    >
                      {selectedJob.status}
                    </span>
                    <span className="text-xs text-[#69736C] uppercase font-semibold">
                      {formatTypeName(selectedJob.transformation_type)}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-[#202522] mt-2 break-words">
                    {selectedJob.title || "Transformation Job"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="p-1 rounded-lg text-[#69736C] hover:text-[#202522] hover:bg-[#F8F9F7] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Execution Details */}
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                    <p className="text-[#69736C] text-[10px] uppercase font-bold tracking-wider">Duration</p>
                    <p className="text-[#202522] font-bold font-mono mt-1">
                      {selectedJob.duration_seconds !== null ? `${selectedJob.duration_seconds} seconds` : "N/A"}
                    </p>
                  </div>
                  <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                    <p className="text-[#69736C] text-[10px] uppercase font-bold tracking-wider">Triggered At</p>
                    <p className="text-[#202522] mt-1">
                      {new Date(selectedJob.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3] space-y-1">
                  <p className="text-[#69736C] text-[10px] uppercase font-bold tracking-wider">Requesting User</p>
                  <p className="text-[#202522] font-semibold">{selectedJob.user_email || "User"}</p>
                  <p className="text-[#69736C] text-[11px] font-mono">User ID: {selectedJob.user_id}</p>
                </div>

                <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3] space-y-1">
                  <p className="text-[#69736C] text-[10px] uppercase font-bold tracking-wider">Associated Document</p>
                  <p className="text-[#202522] font-semibold">{selectedJob.document_filename || "Untitled Document"}</p>
                  <p className="text-[#69736C] text-[10px] font-mono break-all">Doc ID: {selectedJob.document_id}</p>
                </div>

                {/* Failure Diagnosis Section */}
                {selectedJob.status === "failed" ? (
                  <div className="p-4 bg-[#FDF2F2] border border-[#A83232]/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-[#A83232] font-bold">
                      <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z" clipRule="evenodd" />
                      </svg>
                      <span>Failure Diagnosis</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-[#A83232] font-bold tracking-wider">Category</span>
                      <p className="text-[#A83232] font-bold text-xs mt-0.5">
                        {selectedJob.error_category || "TRANSFORMATION_ERROR"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-[#A83232] font-bold tracking-wider">Sanitized Error Detail</span>
                      <pre className="mt-1 p-2.5 bg-white rounded border border-[#A83232]/20 text-[11px] text-[#A83232] font-mono whitespace-pre-wrap break-all">
                        {selectedJob.error_message || "Generation halted due to model timeout or unparseable output."}
                      </pre>
                    </div>

                    <p className="text-[10px] text-[#69736C] italic">
                      Diagnostic note: System prompts and raw API credentials are withheld to uphold security and privacy boundaries.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-[#EBF1ED] border border-[#2E6A4F]/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-[#2E6A4F] font-bold">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Pipeline Completed Successfully</span>
                    </div>
                    <p className="text-[#202522] text-[11px] leading-relaxed">
                      Generated content is accessible to the document owner inside their document workspace.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-[#E4E8E3] mt-6">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="w-full py-2 bg-white hover:bg-[#F8F9F7] text-[#202522] font-medium text-xs rounded-lg border border-[#E4E8E3] transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
