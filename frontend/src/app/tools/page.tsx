"use client";

import { useState, useRef } from "react";
import {
  api,
  type PlagiarismResponse,
  type PlagiarismMatch,
  type HumanizeResponse,
} from "@/lib/api";

// ─── Helpers ────────────────────────────────────────────────────────────────

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const r = (size / 2) * 0.78;
  const circumference = 2 * Math.PI * r;
  const progress = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={6} />
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
        <p className="text-lg font-extrabold text-white font-mono leading-none">{score}%</p>
        <p className="text-[10px] font-mono text-zinc-400 uppercase mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  const map: Record<string, string> = {
    repetitive: "bg-red-950 text-red-300 border-red-900",
    formulaic: "bg-amber-950 text-amber-300 border-amber-900",
    structural: "bg-zinc-800 text-zinc-300 border-zinc-700",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono border ${map[signal] ?? "bg-zinc-800 text-zinc-300 border-zinc-700"}`}>
      {signal.toUpperCase()}
    </span>
  );
}

function StatBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-mono">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-bold">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type ActiveTool = "plagiarism" | "humanize";

export default function ToolsPage() {
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

  // ── Plagiarism ─────────────────────────────────────────────────────────
  async function handlePlagiarismCheck() {
    if (!plagText.trim() || plagText.trim().length < 20) {
      setPlagError("Please paste at least 20 characters of text.");
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

  // ── Humanize ──────────────────────────────────────────────────────────
  async function handleHumanize() {
    if (!humanText.trim() || humanText.trim().length < 20) {
      setHumanError("Please paste at least 20 characters of text.");
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
      ? "text-red-400"
      : plagResult && plagResult.overall_score >= 40
      ? "text-amber-400"
      : "text-green-400";

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Page Header */}
      <div className="relative overflow-hidden surface-card p-6 bg-black text-white bg-dot-pattern-dark border border-zinc-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-[10px] font-mono uppercase tracking-wider text-zinc-300 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              AI Text Analysis Suite
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Text Intelligence Tools</h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-lg">
              Detect AI-generated content with precision signal analysis, or instantly rewrite text to sound authentically human.
            </p>
          </div>
        </div>
      </div>

      {/* Tool Selector Tabs */}
      <div className="flex gap-2 p-1 bg-zinc-100 border border-zinc-200 rounded-lg w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTool("plagiarism")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all duration-150 ${
            activeTool === "plagiarism"
              ? "bg-black text-white shadow-md"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          Plagiarism Checker
        </button>
        <button
          type="button"
          onClick={() => setActiveTool("humanize")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all duration-150 ${
            activeTool === "humanize"
              ? "bg-black text-white shadow-md"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          Humanize Text
        </button>
      </div>

      {/* ── PLAGIARISM CHECKER ─────────────────────────────────────────── */}
      {activeTool === "plagiarism" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Input Panel */}
          <div className="surface-card p-5 space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono font-bold text-zinc-400 uppercase">Input Text</p>
              <span className="text-[10px] font-mono text-zinc-500">{plagText.length} chars</span>
            </div>
            <textarea
              id="plagiarism-input"
              value={plagText}
              onChange={(e) => { setPlagText(e.target.value); setPlagError(null); }}
              rows={10}
              placeholder="Paste any text here — essay, article, AI output, report — to check for plagiarism signals and AI generation probability…"
              className="w-full resize-none text-sm text-zinc-900 placeholder:text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-lg p-3 font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
            {plagError && (
              <p className="text-xs text-red-600 font-mono bg-red-50 border border-red-200 rounded px-3 py-2">{plagError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePlagiarismCheck}
                disabled={plagLoading || plagText.trim().length < 20}
                id="plagiarism-check-btn"
                className="flex-1 btn-primary justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {plagLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analysing…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    Check Plagiarism
                  </span>
                )}
              </button>
              {plagText && (
                <button
                  type="button"
                  onClick={() => { setPlagText(""); setPlagResult(null); setPlagError(null); }}
                  className="btn-secondary px-3 py-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Right: Results Panel */}
          <div className="space-y-4">
            {!plagResult && !plagLoading && (
              <div className="surface-card p-10 flex flex-col items-center justify-center text-center border border-zinc-200 min-h-[300px] gap-3">
                <div className="h-12 w-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-zinc-500">Paste your text and click Analyse</p>
                <p className="text-xs text-zinc-400 max-w-xs">Results show AI probability, originality score, perplexity, sentence burstiness, and flagged phrases.</p>
              </div>
            )}

            {plagLoading && (
              <div className="surface-card p-10 flex flex-col items-center justify-center gap-4 bg-black text-white border border-zinc-800 min-h-[300px]">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Running Signal Analysis…</p>
                  <p className="text-xs text-zinc-400 mt-1 font-mono">Checking patterns · perplexity · burstiness</p>
                </div>
              </div>
            )}

            {plagResult && (
              <div className="space-y-3 animate-fade-in">
                {/* Verdict */}
                <div className="surface-card p-4 bg-black text-white border border-zinc-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-extrabold ${verdictColor}`}>{plagResult.verdict}</p>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{plagResult.detail}</p>
                    </div>
                  </div>
                </div>

                {/* Score Rings */}
                <div className="surface-card p-5 bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-around">
                    <ScoreRing score={Math.round(plagResult.ai_generated_probability)} label="AI Content" />
                    <ScoreRing score={Math.round(plagResult.human_written_probability)} label="Human" />
                    <ScoreRing score={Math.round(plagResult.originality_score)} label="Original" />
                  </div>
                </div>

                {/* Stats Bars */}
                <div className="surface-card p-4 bg-zinc-950 border border-zinc-800 space-y-3">
                  <p className="text-[10px] font-mono text-zinc-400 uppercase mb-1">Linguistic Metrics</p>
                  <StatBar label="Perplexity (Variety)" value={plagResult.perplexity_score} />
                  <StatBar label="Burstiness (Sentence Variance)" value={plagResult.burstiness_score} />
                </div>

                {/* Flagged Phrases */}
                {plagResult.flagged_phrases.length > 0 && (
                  <div className="surface-card p-4 bg-zinc-950 border border-zinc-800 space-y-2">
                    <p className="text-[10px] font-mono text-zinc-400 uppercase">Flagged Signals ({plagResult.flagged_phrases.length})</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {plagResult.flagged_phrases.map((f: PlagiarismMatch, i: number) => (
                        <div key={i} className="flex items-start justify-between gap-2 bg-zinc-900 rounded px-3 py-2 border border-zinc-800">
                          <p className="text-xs text-zinc-200 font-mono flex-1 leading-snug">"{f.phrase}"</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <SignalBadge signal={f.signal} />
                            <span className="text-[10px] font-mono text-zinc-500">{f.similarity_score}pt</span>
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
        <div className="space-y-4">
          {/* Controls Row */}
          <div className="surface-card p-4 border border-zinc-200 flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-zinc-500 uppercase">Writing Style</p>
              <div className="flex gap-1.5">
                {["casual", "natural", "professional", "academic"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setHumanStyle(s)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all duration-150 border ${
                      humanStyle === s
                        ? "bg-black text-white border-black"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-mono text-zinc-500 uppercase">Humanize Intensity</p>
              <div className="flex gap-1.5">
                {["light", "medium", "heavy"].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setHumanIntensity(i)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all duration-150 border ${
                      humanIntensity === i
                        ? "bg-black text-white border-black"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    {i.charAt(0).toUpperCase() + i.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Two-column editor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input */}
            <div className="surface-card p-5 space-y-3 border border-zinc-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono font-bold text-zinc-400 uppercase">Original Text</p>
                <span className="text-[10px] font-mono text-zinc-500">{humanText.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <textarea
                id="humanize-input"
                value={humanText}
                onChange={(e) => { setHumanText(e.target.value); setHumanError(null); setHumanResult(null); }}
                rows={12}
                placeholder="Paste AI-generated text here to rewrite it with a more authentic human voice and natural phrasing…"
                className="w-full resize-none text-sm text-zinc-900 placeholder:text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-lg p-3 font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              />
              {humanError && (
                <p className="text-xs text-red-600 font-mono bg-red-50 border border-red-200 rounded px-3 py-2">{humanError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleHumanize}
                  disabled={humanLoading || humanText.trim().length < 20}
                  id="humanize-btn"
                  className="flex-1 btn-primary justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {humanLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Humanizing…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                      Humanize Text
                    </span>
                  )}
                </button>
                {humanText && (
                  <button
                    type="button"
                    onClick={() => { setHumanText(""); setHumanResult(null); setHumanError(null); }}
                    className="btn-secondary px-3 py-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Output */}
            <div className="surface-card p-5 space-y-3 border border-zinc-200 flex flex-col">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono font-bold text-zinc-400 uppercase">Humanized Output</p>
                {humanResult && (
                  <button
                    type="button"
                    onClick={handleCopyHumanized}
                    id="copy-humanized-btn"
                    className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-black hover:text-zinc-600 transition-colors"
                  >
                    {copied ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                        </svg>
                        Copy Text
                      </>
                    )}
                  </button>
                )}
              </div>

              {!humanResult && !humanLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center bg-zinc-50 border border-zinc-200 rounded-lg p-6 min-h-[200px] gap-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">Humanized text will appear here</p>
                </div>
              )}

              {humanLoading && (
                <div className="flex-1 flex flex-col items-center justify-center bg-black rounded-lg border border-zinc-800 min-h-[200px] gap-3">
                  <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  <p className="text-xs text-zinc-400 font-mono">Rewriting for human authenticity…</p>
                </div>
              )}

              {humanResult && (
                <div className="flex-1 flex flex-col gap-3 animate-fade-in">
                  {/* Score delta */}
                  <div className="flex gap-2 font-mono text-[11px]">
                    <div className="flex-1 bg-zinc-900 text-white rounded px-3 py-2 border border-zinc-800">
                      <p className="text-zinc-400 uppercase text-[9px]">AI Score Before</p>
                      <p className="font-extrabold text-red-400">{humanResult.ai_score_before.toFixed(0)}%</p>
                    </div>
                    <div className="flex items-center text-zinc-400">→</div>
                    <div className="flex-1 bg-zinc-900 text-white rounded px-3 py-2 border border-zinc-800">
                      <p className="text-zinc-400 uppercase text-[9px]">AI Score After</p>
                      <p className="font-extrabold text-green-400">{humanResult.ai_score_after.toFixed(0)}%</p>
                    </div>
                    <div className="flex items-center text-zinc-400">·</div>
                    <div className="flex-1 bg-zinc-900 text-white rounded px-3 py-2 border border-zinc-800">
                      <p className="text-zinc-400 uppercase text-[9px]">Words</p>
                      <p className="font-extrabold text-white">{humanResult.word_count_humanized}</p>
                    </div>
                  </div>

                  {/* Humanized text output */}
                  <textarea
                    ref={humanizedRef}
                    readOnly
                    value={humanResult.humanized_text}
                    rows={9}
                    className="w-full resize-none text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-lg p-3 font-sans focus:outline-none"
                  />

                  {/* Changes list */}
                  {humanResult.changes_made.length > 0 && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-1">
                      <p className="text-[9px] font-mono text-zinc-500 uppercase mb-1">Changes Applied</p>
                      {humanResult.changes_made.map((c, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] font-mono text-zinc-300">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
