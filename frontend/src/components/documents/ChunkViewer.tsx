"use client";

import type { ChunkData } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ChunkViewerProps {
  chunks: ChunkData[];
}

export function ChunkViewer({ chunks }: ChunkViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? chunks.filter((c) =>
        c.text.toLowerCase().includes(search.toLowerCase())
      )
    : chunks;

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A89C]"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          id="chunk-search"
          type="text"
          placeholder="Search document chunks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-black/20 pl-10 pr-20 py-2.5 text-sm text-white placeholder:text-[#94A89C] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] shadow-inner transition-all"
        />
        {search && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#D4AF37] pro-badge px-2 py-0.5 bg-[#D4AF37]/10 border-[#D4AF37]/30">
            {filtered.length} / {chunks.length}
          </span>
        )}
      </div>

      {/* Chunk Stream List */}
      <div className="space-y-3 stagger-children">
        {filtered.map((chunk) => {
          const isExpanded = expandedId === chunk.id;
          const isHeading = chunk.chunk_type === "heading";

          return (
            <div
              key={chunk.id}
              id={`chunk-${chunk.chunk_index}`}
              className={cn(
                "rounded-xl transition-all duration-200 overflow-hidden border",
                isHeading
                  ? "bg-[#2D6A4F]/20 border-[#52B788]/40"
                  : "pro-glass-interactive border-white/10"
              )}
            >
              {/* Header */}
              <button
                className="w-full flex items-start gap-3.5 p-4 text-left"
                onClick={() => setExpandedId(isExpanded ? null : chunk.id)}
                aria-expanded={isExpanded}
              >
                {/* Index Badge */}
                <span className="shrink-0 flex h-6 w-9 items-center justify-center rounded-md bg-[#1B2E23] text-xs font-mono font-bold text-[#D4AF37] border border-[#D4AF37]/30">
                  #{chunk.chunk_index}
                </span>

                {/* Text Body */}
                <div className="flex-1 min-w-0">
                  {isHeading && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#52B788] mb-0.5">
                      Section Heading
                    </span>
                  )}
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      isExpanded ? "text-white font-normal" : "text-[#E0EADD] line-clamp-2"
                    )}
                  >
                    {chunk.text}
                  </p>
                </div>

                {/* Chevron */}
                <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-white/5 border border-white/10 text-[#94A89C] transition-transform duration-200">
                  <svg
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isExpanded && "rotate-180 text-white"
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>

              {/* Expanded Metadata Footer */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-white/10 flex flex-wrap gap-2">
                  <MetaBadge label="Tokens" value={String(chunk.token_count)} />
                  <MetaBadge label="Type" value={chunk.chunk_type} />
                  {chunk.page_number != null && (
                    <MetaBadge label="Page" value={String(chunk.page_number)} />
                  )}
                  {chunk.slide_number != null && (
                    <MetaBadge label="Slide" value={String(chunk.slide_number)} />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-10 text-center pro-glass rounded-xl border-white/10">
            <p className="text-sm text-[#94A89C]">No chunks match your search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="pro-badge px-2.5 py-0.5 text-xs flex items-center gap-1.5 bg-[#1B2E23] border-white/15">
      <span className="text-[#94A89C] font-medium">{label}:</span>
      <span className="font-bold text-white">{value}</span>
    </span>
  );
}
