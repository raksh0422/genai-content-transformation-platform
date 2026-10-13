"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  api,
  type PlagiarismResponse,
  type PlagiarismMatch,
  type HumanizeResponse,
} from "@/lib/api";

// ─── Score Dial Component ───────────────────────────────────────────────────

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const r = (size / 2) * 0.78;
  const circumference = 2 * Math.PI * r;
  const progress = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#A83232" : score >= 40 ? "#9A6B1F" : "#2E6A4F";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E4E8E3" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="text-center" style={{ marginTop: -size * 0.02 }}>
        <p className="text-lg font-bold text-[#202522] font-mono leading-none">{score}%</p>
        <p className="text-[10px] uppercase font-semibold text-[#69736C] mt-1">{label}</p>
      </div>
    </div>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  const map: Record<string, string> = {
    repetitive: "bg-[#FDF2F2] text-[#A83232] border-[#A83232]/30",
    formulaic: "bg-[#FEF7EC] text-[#9A6B1F] border-[#9A6B1F]/30",
    structural: "bg-[#F8F9F7] text-[#69736C] border-[#E4E8E3]",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${map[signal] ?? "bg-[#F8F9F7] text-[#69736C] border-[#E4E8E3]"}`}>
      {signal.toUpperCase()}
    </span>
  );
}

function StatBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-[#69736C] font-medium">{label}</span>
        <span className="text-[#202522] font-bold font-mono">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 w-full bg-[#F0F2EF] rounded-full overflow-hidden border border-[#E4E8E3]">
        <div
          className="h-full bg-[#315B46] rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Content Wrapper ───────────────────────────────────────────────────

type ActiveTool = "plagiarism" | "humanize";

function ToolsContent() {
  const searchParams = useSearchParams();
  const [activeTool, setActiveTool] = useState<ActiveTool>("plagiarism");

  // Plagiarism state
  const [plagText, setPlagText] = useState("");
  const [plagLoading, setPlagLoading] = useState(false);
  const [plagResult, setPlagResult] = useState<PlagiarismResponse | null>(null);
  const [plagError, setPlagError] = useState<string | null>(null);

  // Humanize state
  const [humanText, setHumanText] = useState("");
  const [humanStyle, setHumanStyle] = useState("natural");
  const [humanIntensity, setHumanIntensity] = useState("medium");
  const [humanLoading, setHumanLoading] = useState(false);
  const [humanResult, setHumanResult] = useState<HumanizeResponse | null>(null);
  const [humanError, setHumanError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const humanizedRef = useRef<HTMLTextAreaElement>(null);

  // Check URL query parameters and sessionStorage for preloaded text
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "humanize" || tabParam === "plagiarism") {
      setActiveTool(tabParam);
    }

    const prefill = sessionStorage.getItem("contentai_tool_prefill");
    if (prefill) {
      if (tabParam === "humanize") {
        setHumanText(prefill);
      } else {
        setPlagText(prefill);
      }
      sessionStorage.removeItem("contentai_tool_prefill");
    }
  }, [searchParams]);

  // ── Plagiarism Handler ──────────────────────────────────────────────────
  async function handlePlagiarismCheck() {
    if (!plagText.trim() || plagText.trim().length < 20) {
      setPlagError("Please paste at least 20 characters of text to scan.");
      return;
    }
    setPlagLoading(true);
    setPlagResult(null);
    setPlagError(null);
    try {
      const res = await api.checkPlagiarism(plagText);
      setPlagResult(res);
    } catch (e: unknown) {
      setPlagError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
    } finally {
      setPlagLoading(false);
    }
  }

  // ── Humanize Handler ───────────────────────────────────────────────────
  async function handleHumanize() {
    if (!humanText.trim() || humanText.trim().length < 20) {
      setHumanError("Please paste at least 20 characters of text to humanize.");
      return;
    }
    setHumanLoading(true);
    setHumanResult(null);
    setHumanError(null);
    try {
      const res = await api.humanizeText(humanText, humanStyle, humanIntensity);
      setHumanResult(res);
    } catch (e: unknown) {
      setHumanError(e instanceof Error ? e.message : "Humanization failed. Please try again.");
    } finally {
      setHumanLoading(false);
    }
  }

  async function handleCopyHumanized() {
    if (!humanResult) return;
    await navigator.clipboard.writeText(humanResult.humanized_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const verdictColor =
    plagResult && plagResult.overall_score >= 70
      ? "text-[#A83232]"
      : plagResult && plagResult.overall_score >= 40
      ? "text-[#9A6B1F]"
      : "text-[#2E6A4F]";

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-12 font-sans">
      {/* Page Header */}
      <div className="p-6 bg-white border border-[#E4E8E3] rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#EBF1ED] border border-[#2E6A4F]/20 text-[11px] font-semibold text-[#2E6A4F] mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2E6A4F] animate-pulse" />
            Originality & Rewrite Suite
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202522]">
            Plagiarism & AI Content Tools
          </h1>
          <p className="text-xs text-[#69736C] mt-1 max-w-xl leading-relaxed">
            Verify authenticity, detect formulaic AI phrasing, and transform robotic drafts into natural human prose.
          </p>
        </div>
      </div>

      {/* Tool Selector Tabs */}
      <div className="flex gap-2 p-1 bg-white border border-[#E4E8E3] rounded-lg shadow-xs w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTool("plagiarism")}
          id="tab-plagiarism"
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all duration-150 ${
            activeTool === "plagiarism"
              ? "bg-[#315B46] text-white shadow-xs"
              : "text-[#69736C] hover:text-[#202522]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
          <span>Plagiarism & AI Detector</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTool("humanize")}
          id="tab-humanize"
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all duration-150 ${
            activeTool === "humanize"
              ? "bg-[#315B46] text-white shadow-xs"
              : "text-[#69736C] hover:text-[#202522]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
          <span>AI Content Humanizer</span>
        </button>
      </div>

      {/* ── PLAGIARISM CHECKER ─────────────────────────────────────────── */}
      {activeTool === "plagiarism" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Input Panel */}
          <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#69736C]">Input Text</p>
              <span className="text-[11px] font-mono text-[#8C958E]">{plagText.length} characters</span>
            </div>
            <textarea
              id="plagiarism-input"
              value={plagText}
              onChange={(e) => { setPlagText(e.target.value); setPlagError(null); }}
              rows={12}
              placeholder="Paste any text here — essay, article, AI output, or report — to check for plagiarism signals, formulaic phrasing, and originality probability…"
              className="w-full resize-none text-xs text-[#202522] placeholder-[#8C958E] bg-[#F8F9F7] border border-[#E4E8E3] rounded-lg p-3.5 focus:outline-none focus:border-[#315B46] focus:ring-1 focus:ring-[#315B46] leading-relaxed transition-colors"
            />
            {plagError && (
              <p className="text-xs text-[#A83232] bg-[#FDF2F2] border border-[#A83232]/20 rounded-lg px-3 py-2">{plagError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePlagiarismCheck}
                disabled={plagLoading || plagText.trim().length < 20}
                id="plagiarism-check-btn"
                className="flex-1 btn-primary py-2.5 justify-center disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-xs"
              >
                {plagLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Analyzing Signals…</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <span>Check Plagiarism & AI Score</span>
                  </span>
                )}
              </button>
              {plagText && (
                <button
                  type="button"
                  onClick={() => { setPlagText(""); setPlagResult(null); setPlagError(null); }}
                  className="px-3.5 py-2 bg-white hover:bg-[#F8F9F7] text-[#202522] rounded-lg border border-[#E4E8E3] text-xs font-medium transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Right: Results Panel */}
          <div className="space-y-4">
            {!plagResult && !plagLoading && (
              <div className="bg-white border border-[#E4E8E3] rounded-xl p-10 flex flex-col items-center justify-center text-center min-h-[340px] gap-3 shadow-xs">
                <div className="h-12 w-12 rounded-full bg-[#EBF1ED] border border-[#315B46]/20 flex items-center justify-center text-[#315B46]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-[#202522]">Paste text and run check</p>
                <p className="text-xs text-[#69736C] max-w-xs leading-relaxed">
                  Real-time scoring evaluates AI probabilities, linguistic perplexity, burstiness variation, and formulaic phrases.
                </p>
              </div>
            )}

            {plagLoading && (
              <div className="bg-white border border-[#E4E8E3] rounded-xl p-10 flex flex-col items-center justify-center gap-4 min-h-[340px] shadow-xs">
                <div className="h-12 w-12 rounded-full border-2 border-[#E4E8E3] border-t-[#315B46] animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-bold text-[#202522]">Running Signal Analysis…</p>
                  <p className="text-xs text-[#69736C] mt-1 font-mono">Scanning patterns · perplexity · burstiness</p>
                </div>
              </div>
            )}

            {plagResult && (
              <div className="space-y-4 animate-fade-in">
                {/* Verdict Card */}
                <div className="bg-white border border-[#E4E8E3] rounded-xl p-4 shadow-xs">
                  <p className={`text-sm font-bold ${verdictColor}`}>{plagResult.verdict}</p>
                  <p className="text-xs text-[#69736C] mt-1 leading-relaxed">{plagResult.detail}</p>
                </div>

                {/* Score Rings Card */}
                <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 shadow-xs">
                  <div className="flex items-center justify-around">
                    <ScoreRing score={Math.round(plagResult.ai_generated_probability)} label="AI Probability" />
                    <ScoreRing score={Math.round(plagResult.human_written_probability)} label="Human Score" />
                    <ScoreRing score={Math.round(plagResult.originality_score)} label="Originality" />
                  </div>
                </div>

                {/* Metric Bars Card */}
                <div className="bg-white border border-[#E4E8E3] rounded-xl p-4 space-y-3 shadow-xs">
                  <p className="text-[10px] font-semibold text-[#69736C] uppercase tracking-wider mb-1">Linguistic Quality Metrics</p>
                  <StatBar label="Perplexity (Vocabulary Diversity)" value={plagResult.perplexity_score} />
                  <StatBar label="Burstiness (Sentence Cadence Variance)" value={plagResult.burstiness_score} />
                </div>

                {/* Flagged Phrases */}
                {plagResult.flagged_phrases.length > 0 && (
                  <div className="bg-white border border-[#E4E8E3] rounded-xl p-4 space-y-2 shadow-xs">
                    <p className="text-[10px] font-semibold text-[#69736C] uppercase tracking-wider">
                      Flagged Repetitive Phrases ({plagResult.flagged_phrases.length})
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {plagResult.flagged_phrases.map((f: PlagiarismMatch, i: number) => (
                        <div key={i} className="flex items-start justify-between gap-2 bg-[#F8F9F7] rounded-lg p-2.5 border border-[#E4E8E3]">
                          <p className="text-xs text-[#202522] font-mono flex-1 leading-snug">"{f.phrase}"</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <SignalBadge signal={f.signal} />
                            <span className="text-[10px] font-mono text-[#8C958E]">{f.similarity_score}pt</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HUMANIZE TEXT ─────────────────────────────────────────────────── */}
      {activeTool === "humanize" && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="bg-white border border-[#E4E8E3] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-[#69736C] uppercase tracking-wider">Writing Tone</p>
                <div className="flex gap-1.5">
                  {["natural", "casual", "professional", "academic"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setHumanStyle(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        humanStyle === s
                          ? "bg-[#315B46] text-white shadow-xs"
                          : "bg-white hover:bg-[#F8F9F7] text-[#69736C] border border-[#E4E8E3]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-[#69736C] uppercase tracking-wider">Humanize Intensity</p>
                <div className="flex gap-1.5">
                  {["light", "medium", "heavy"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setHumanIntensity(lvl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        humanIntensity === lvl
                          ? "bg-[#315B46] text-white shadow-xs"
                          : "bg-white hover:bg-[#F8F9F7] text-[#69736C] border border-[#E4E8E3]"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleHumanize}
              disabled={humanLoading || humanText.trim().length < 20}
              id="humanize-btn"
              className="btn-primary py-2 px-5 text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed self-end"
            >
              {humanLoading ? "Humanizing…" : "Humanize Text Now"}
            </button>
          </div>

          {/* Side by side panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Input Textarea */}
            <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-[#69736C]">Original AI Text</p>
                <span className="text-[11px] font-mono text-[#8C958E]">{humanText.length} chars</span>
              </div>
              <textarea
                id="humanize-input"
                value={humanText}
                onChange={(e) => { setHumanText(e.target.value); setHumanError(null); }}
                rows={14}
                placeholder="Paste AI-generated text here to humanize, vary sentence lengths, and introduce authentic vocabulary…"
                className="w-full resize-none text-xs text-[#202522] placeholder-[#8C958E] bg-[#F8F9F7] border border-[#E4E8E3] rounded-lg p-3.5 focus:outline-none focus:border-[#315B46] focus:ring-1 focus:ring-[#315B46] leading-relaxed transition-colors"
              />
              {humanError && (
                <p className="text-xs text-[#A83232] bg-[#FDF2F2] border border-[#A83232]/20 rounded-lg px-3 py-2">{humanError}</p>
              )}
            </div>

            {/* Right: Humanized Output Panel */}
            <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-3 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#E4E8E3]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#202522]">Humanized Output</p>
                  {humanResult && (
                    <button
                      type="button"
                      onClick={handleCopyHumanized}
                      id="copy-humanized-btn"
                      className="px-2.5 py-1 text-xs bg-white hover:bg-[#F8F9F7] text-[#202522] border border-[#E4E8E3] rounded-lg transition-colors font-medium flex items-center gap-1.5 shadow-2xs"
                    >
                      {copied ? (
                        <span className="text-[#2E6A4F] font-semibold">Copied!</span>
                      ) : (
                        <span>Copy Output</span>
                      )}
                    </button>
                  )}
                </div>

                {!humanResult && !humanLoading && (
                  <div className="py-20 flex flex-col items-center justify-center text-center gap-2">
                    <p className="text-xs text-[#8C958E]">Humanized text will appear here</p>
                    <p className="text-[11px] text-[#8C958E] max-w-xs leading-relaxed">
                      Tone adjustments substitute formulaic patterns with conversational phrasing and variable cadence.
                    </p>
                  </div>
                )}

                {humanLoading && (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <div className="h-8 w-8 rounded-full border-2 border-[#E4E8E3] border-t-[#315B46] animate-spin" />
                    <p className="text-xs font-semibold text-[#202522]">Rewriting and humanizing…</p>
                  </div>
                )}

                {humanResult && (
                  <div className="space-y-4 pt-3">
                    {/* Score comparison banner */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                        <span className="text-[10px] uppercase font-semibold text-[#69736C]">AI Score Before</span>
                        <p className="text-base font-bold text-[#A83232] font-mono mt-0.5">
                          {Math.round(humanResult.ai_score_before)}%
                        </p>
                      </div>
                      <div className="p-3 bg-[#EBF1ED] rounded-lg border border-[#2E6A4F]/20">
                        <span className="text-[10px] uppercase font-semibold text-[#2E6A4F]">AI Score After</span>
                        <p className="text-base font-bold text-[#2E6A4F] font-mono mt-0.5">
                          {Math.round(humanResult.ai_score_after)}%
                        </p>
                      </div>
                    </div>

                    <textarea
                      ref={humanizedRef}
                      readOnly
                      rows={10}
                      value={humanResult.humanized_text}
                      className="w-full resize-none text-xs text-[#202522] bg-[#F8F9F7] border border-[#E4E8E3] rounded-lg p-3.5 focus:outline-none leading-relaxed"
                    />

                    {/* Changes Made */}
                    {humanResult.changes_made.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[#E4E8E3]">
                        <p className="text-[10px] font-semibold text-[#69736C] uppercase tracking-wider">
                          Enhancements Applied ({humanResult.changes_made.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {humanResult.changes_made.map((ch, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20 font-medium">
                              {ch}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#69736C]">Loading tools…</div>}>
      <ToolsContent />
    </Suspense>
  );
}
