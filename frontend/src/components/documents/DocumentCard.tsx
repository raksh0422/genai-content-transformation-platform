"use client";

import Link from "next/link";
import type { DocumentMetadata } from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  DocumentMetadata["status"],
  { label: string; color: string; dotColor: string }
> = {
  uploaded: {
    label: "Uploaded",
    color: "text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/30",
    dotColor: "bg-[#D4AF37]",
  },
  processing: {
    label: "Processing",
    color: "text-[#52B788] bg-[#2D6A4F]/20 border-[#52B788]/40 animate-pulse",
    dotColor: "bg-[#52B788]",
  },
  completed: {
    label: "Completed",
    color: "text-[#52B788] bg-[#2D6A4F]/20 border-[#52B788]/40",
    dotColor: "bg-[#52B788]",
  },
  failed: {
    label: "Failed",
    color: "text-[#E63946] bg-[#E63946]/15 border-[#E63946]/35",
    dotColor: "bg-[#E63946]",
  },
};

const EXT_BADGES: Record<string, { label: string; style: string }> = {
  ".pdf": { label: "PDF", style: "bg-[#E63946]/15 text-[#FF6B6B] border-[#E63946]/30" },
  ".docx": { label: "DOCX", style: "bg-[#2563EB]/15 text-[#60A5FA] border-[#2563EB]/30" },
  ".pptx": { label: "PPTX", style: "bg-[#D4AF37]/15 text-[#FBBF24] border-[#D4AF37]/30" },
  ".txt": { label: "TXT", style: "bg-[#2D6A4F]/20 text-[#52B788] border-[#52B788]/30" },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DocumentCardProps {
  document: DocumentMetadata;
}

export function DocumentCard({ document: doc }: DocumentCardProps) {
  const status = STATUS_CONFIG[doc.status];
  const extInfo = EXT_BADGES[doc.file_extension] ?? {
    label: doc.file_extension.replace(".", "").toUpperCase(),
    style: "bg-white/10 text-white border-white/20",
  };

  return (
    <Link
      href={`/documents/${doc.id}`}
      id={`doc-card-${doc.id}`}
      className="block rounded-xl pro-glass-interactive p-5 group relative overflow-hidden"
    >
      <div className="flex items-start gap-4">
        {/* Extension Format Emblem */}
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border font-bold text-xs tracking-wider font-sans shadow-inner",
            extInfo.style
          )}
        >
          {extInfo.label}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-sm font-bold text-white truncate group-hover:text-[#D4AF37] transition-colors leading-snug">
              {doc.original_filename}
            </h4>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase shrink-0",
                status.color
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", status.dotColor)} />
              {status.label}
            </span>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-2.5 text-xs text-[#94A89C] flex-wrap">
            <span className="font-medium text-[#E0EADD]">{formatBytes(doc.file_size_bytes)}</span>
            {doc.page_count != null && (
              <>
                <span className="text-white/20">•</span>
                <span>{doc.page_count} pages</span>
              </>
            )}
            {doc.word_count != null && (
              <>
                <span className="text-white/20">•</span>
                <span>{doc.word_count.toLocaleString()} words</span>
              </>
            )}
            {doc.chunk_count != null && (
              <>
                <span className="text-white/20">•</span>
                <span className="text-[#D4AF37] font-semibold">{doc.chunk_count} chunks</span>
              </>
            )}
          </div>

          <p className="text-[11px] text-[#94A89C]/70">
            Uploaded {formatDate(doc.created_at)}
          </p>

          {doc.error_message && (
            <p className="text-[11px] text-[#E63946] bg-[#E63946]/10 border border-[#E63946]/20 rounded-lg p-2 mt-1">
              ⚠ {doc.error_message}
            </p>
          )}
        </div>

        {/* Action Arrow */}
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[#94A89C] group-hover:text-white group-hover:bg-[#2D6A4F] group-hover:border-[#2D6A4F] transition-all duration-200 group-hover:translate-x-0.5 mt-0.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
