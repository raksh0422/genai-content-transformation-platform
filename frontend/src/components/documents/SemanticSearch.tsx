"use client";

import { useState } from "react";
import { api, type RetrievalSearchResultItem } from "@/lib/api";

interface SemanticSearchProps {
  documentId: string;
}

export function SemanticSearch({ documentId }: SemanticSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RetrievalSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.searchRetrieval(documentId, query, 5);
      setResults(res.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Type a natural language question or topic to search vector index..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/30 pl-4 pr-10 py-3 text-sm text-white placeholder:text-[#94A89C] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] shadow-inner"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="pro-badge px-6 py-3 text-xs font-bold text-white bg-[#2D6A4F] border-[#2D6A4F] hover:bg-[#52B788] disabled:opacity-50 transition-all shrink-0 flex items-center gap-2"
        >
          {loading ? (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          )}
          Search Index
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-[#E63946]/30 bg-[#E63946]/10 p-4">
          <p className="text-xs text-[#E63946] font-semibold">{error}</p>
        </div>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <div className="space-y-3 stagger-children">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A89C] px-1">
            Top {results.length} Vector Similarity Matches
          </h4>

          {results.map((res, i) => (
            <div key={res.chunk_id || i} className="pro-glass rounded-xl p-5 border-white/10 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="pro-badge px-2.5 py-0.5 text-xs font-mono font-bold text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/30">
                    Rank #{i + 1}
                  </span>
                  <span className="text-xs font-semibold text-[#94A89C]">
                    Chunk #{res.chunk_index}
                    {res.page_number != null && ` • Page ${res.page_number}`}
                    {res.slide_number != null && ` • Slide ${res.slide_number}`}
                  </span>
                </div>
                <span className="pro-badge px-2.5 py-0.5 text-xs font-bold text-[#52B788] bg-[#2D6A4F]/20 border-[#52B788]/30">
                  {(res.score * 100).toFixed(1)}% Match
                </span>
              </div>
              <p className="text-sm text-white leading-relaxed font-normal bg-black/20 p-3.5 rounded-lg border border-white/5">
                {res.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
