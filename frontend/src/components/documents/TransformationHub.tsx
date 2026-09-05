"use client";

import { useEffect, useState } from "react";
import {
  api,
  type TransformationCreatePayload,
  type TransformationResponse,
} from "@/lib/api";
import { GeneratedOutput } from "./GeneratedOutput";
import { DownloadMenu } from "./DownloadMenu";
import { useToast } from "@/components/ui/Toast";

const TRANSFORMATION_TYPES = [
  { id: "executive_summary", label: "Executive Summary", desc: "Key insights and conclusions" },
  { id: "short_summary", label: "Short Summary", desc: "Concise 1-2 paragraph overview" },
  { id: "faq", label: "FAQ", desc: "Questions and answers" },
  { id: "quiz", label: "Quiz", desc: "Multiple choice questions" },
  { id: "email", label: "Email", desc: "Professional email draft" },
  { id: "social_post", label: "Social Post", desc: "LinkedIn or Twitter post" },
  { id: "presentation_outline", label: "Presentation", desc: "Slide-by-slide outline" },
] as const;

const TONES = ["professional", "executive", "casual", "academic"] as const;
const LENGTHS = ["short", "medium", "detailed"] as const;

function transformationLabel(type: string) {
  return TRANSFORMATION_TYPES.find((t) => t.id === type)?.label ?? type;
}

function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface TransformationHubProps {
  documentId: string;
}

export function TransformationHub({ documentId }: TransformationHubProps) {
  const [selectedType, setSelectedType] = useState<string>("executive_summary");
  const [selectedTone, setSelectedTone] = useState<string>("professional");
  const [selectedLength, setSelectedLength] = useState<string>("medium");
  const [isCustomLength, setIsCustomLength] = useState<boolean>(false);
  const [customLines, setCustomLines] = useState<number>(100);
  const [transformations, setTransformations] = useState<TransformationResponse[]>([]);
  const [activeTf, setActiveTf] = useState<TransformationResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { showToast, ToastContainer } = useToast();

  // Load existing transformations
  useEffect(() => {
    let active = true;
    api
      .listDocumentTransformations(documentId)
      .then((res) => {
        if (active) {
          setTransformations(res.items);
          if (res.items.length > 0) setActiveTf(res.items[0]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [documentId]);

  const handleGenerate = async (regenerate = false) => {
    setGenerating(true);
    setError(null);

    try {
      const payload: TransformationCreatePayload = {
        document_id: documentId,
        transformation_type: regenerate ? activeTf?.transformation_type ?? selectedType : selectedType,
        tone: regenerate ? activeTf?.tone ?? selectedTone : selectedTone,
        length: regenerate ? activeTf?.length ?? selectedLength : selectedLength,
      };
      const result = await api.generateTransformation(payload);
      setTransformations((prev) => [result, ...prev]);
      setActiveTf(result);
      showToast("Content generated", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!activeTf) return;
    try {
      await navigator.clipboard.writeText(activeTf.content);
      setCopied(true);
      showToast("Copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy", "error");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <ToastContainer />

      {/* Left Panel: Selector + History */}
      <div className="lg:w-64 xl:w-72 shrink-0 space-y-6">

        {/* What would you like to create? */}
        <div className="surface-card p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            What would you like to create?
          </p>
          <div className="space-y-1">
            {TRANSFORMATION_TYPES.map((type) => {
              const isActive = !activeTf
                ? selectedType === type.id
                : activeTf?.transformation_type === type.id && !generating;
              return (
                <button
                  key={type.id}
                  type="button"
                  id={`type-${type.id}`}
                  onClick={() => setSelectedType(type.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    selectedType === type.id
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <p className={`text-sm font-medium ${selectedType === type.id ? "text-blue-700" : "text-gray-900"}`}>
                    {type.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{type.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Tone & Length */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                Tone
              </label>
              <div className="grid grid-cols-2 gap-1">
                {TONES.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    id={`tone-${tone}`}
                    onClick={() => setSelectedTone(tone)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                      selectedTone === tone
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                  Target Length
                </label>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: "short", label: "Short", hint: "~20 lines" },
                  { id: "medium", label: "Medium", hint: "~50 lines" },
                  { id: "detailed", label: "Detailed", hint: "~100 lines" },
                  { id: "custom", label: "Custom", hint: "10-300" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    id={`length-${item.id}`}
                    onClick={() => {
                      if (item.id === "custom") {
                        setIsCustomLength(true);
                        setSelectedLength(`${customLines} lines`);
                      } else {
                        setIsCustomLength(false);
                        setSelectedLength(item.id);
                      }
                    }}
                    className={`py-1.5 px-1 rounded-lg text-xs font-medium transition-colors text-center ${
                      (isCustomLength && item.id === "custom") || (!isCustomLength && selectedLength === item.id)
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <div>{item.label}</div>
                    <div className="text-[9px] opacity-75 font-normal">{item.hint}</div>
                  </button>
                ))}
              </div>

              {isCustomLength && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={customLines}
                      onChange={(e) => {
                        const val = Math.min(300, Math.max(10, parseInt(e.target.value) || 100));
                        setCustomLines(val);
                        setSelectedLength(`${val} lines`);
                      }}
                      className="input-field text-xs py-1 px-2.5 w-24"
                      placeholder="100"
                    />
                    <span className="text-xs text-gray-500 font-medium">target lines (10-300)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[20, 50, 100, 150, 200, 300].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setCustomLines(preset);
                          setSelectedLength(`${preset} lines`);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                          customLines === preset
                            ? "bg-black border-black text-white"
                            : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        {preset}L
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Will generate a comprehensive multi-section report spanning approx {customLines} lines.
                  </p>
                </div>
              )}
            </div>

          </div>

          <button
            type="button"
            id="generate-btn"
            onClick={() => handleGenerate(false)}
            disabled={generating}
            className="w-full btn-primary justify-center"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Generating…
              </span>
            ) : "Generate"}
          </button>
        </div>

        {/* History */}
        {transformations.length > 0 && (
          <div className="surface-card p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Previously Created
            </p>
            <div className="space-y-0.5">
              {transformations.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  id={`history-${tf.id}`}
                  onClick={() => setActiveTf(tf)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    activeTf?.id === tf.id
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {transformationLabel(tf.transformation_type)}
                    </p>
                    <p className="text-xs text-gray-400 shrink-0 ml-2">
                      {formatRelativeDate(tf.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {generating ? (
          <div className="surface-card p-10 flex flex-col items-center justify-center min-h-[380px] gap-6 animate-fade-in bg-black text-white bg-dot-pattern-dark border border-zinc-800">
            <div className="relative flex items-center justify-center">
              <div className="h-14 w-14 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <span className="absolute h-3 w-3 rounded-full bg-white animate-ping" />
            </div>

            <div className="text-center space-y-2 max-w-sm">
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                Grounded RAG Pipeline
              </span>
              <p className="text-base font-extrabold text-white tracking-tight">
                Transforming content into {transformationLabel(selectedType)}…
              </p>
              <p className="text-xs text-zinc-400 font-mono">
                Extracting semantic chunks · Applying tone: <span className="text-white font-bold">{selectedTone}</span> · Target: <span className="text-white font-bold">{selectedLength}</span>
              </p>
            </div>

            {/* High-tech progress indicators */}
            <div className="w-full max-w-xs space-y-2 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                <span>1. Querying FAISS Vector Database</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                <span>2. Executing Strict Grounding Prompts</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                <span>3. Running Fact Verification Audit</span>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="surface-card p-6 text-center space-y-3 border-red-100">
            <p className="text-sm font-semibold text-red-600">Generation failed</p>
            <p className="text-xs text-gray-500">{error}</p>
            <button type="button" onClick={() => setError(null)} className="btn-secondary text-sm">
              Try again
            </button>
          </div>
        ) : activeTf ? (
          <div className="space-y-0">
            {/* Output Header */}
            <div className="surface-card p-5 rounded-b-none border-b-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900">{activeTf.title}</h2>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">
                    {transformationLabel(activeTf.transformation_type)} · {activeTf.tone} · {activeTf.length}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Copy */}
                  <button
                    type="button"
                    id="copy-btn"
                    onClick={handleCopy}
                    className="btn-ghost text-sm"
                  >
                    {copied ? (
                      <span className="flex items-center gap-1.5 text-green-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Copied
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                        </svg>
                        Copy
                      </span>
                    )}
                  </button>
                  {/* Regenerate */}
                  <button
                    type="button"
                    id="regenerate-btn"
                    onClick={() => handleGenerate(true)}
                    disabled={generating}
                    className="btn-ghost text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Regenerate
                  </button>
                  {/* Download */}
                  <DownloadMenu transformation={activeTf} />
                </div>
              </div>
            </div>

            {/* Output Body */}
            <div className="surface-card p-6 sm:p-8 rounded-t-none">
              <GeneratedOutput
                transformation={activeTf}
                onContentChange={(newContent) => {
                  setActiveTf((prev) => prev ? { ...prev, content: newContent } : prev);
                  setTransformations((prev) =>
                    prev.map((t) => t.id === activeTf.id ? { ...t, content: newContent } : t)
                  );
                  showToast("Changes saved", "success");
                }}
              />
            </div>
          </div>
        ) : (
          <div className="surface-card p-12 flex flex-col items-center justify-center min-h-64 text-center gap-3">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Choose a format and generate</p>
              <p className="text-sm text-gray-400 mt-1">
                Select what you'd like to create from the left panel.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
