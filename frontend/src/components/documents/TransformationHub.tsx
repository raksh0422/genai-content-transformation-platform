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
  { id: "humanize", label: "Humanized Rewrite", desc: "Natural, conversational flow" },
  { id: "plagiarism_audit", label: "Originality & Plagiarism", desc: "Authenticity & attribution audit" },
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

  const [loadingStep, setLoadingStep] = useState(0);

  // Cycle calm loading messages during generation
  useEffect(() => {
    if (!generating) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 4);
    }, 2400);
    return () => clearInterval(interval);
  }, [generating]);

  const loadingMessages = [
    "Preparing your document…",
    `Creating your ${transformationLabel(selectedType)}…`,
    "Formatting document structure…",
    "Finishing your document…",
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <ToastContainer />

      {/* Left Panel: Selector + History */}
      <div className="lg:w-64 xl:w-72 shrink-0 space-y-5">

        {/* What would you like to create? */}
        <div className="surface-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-[#69736C] uppercase tracking-wider">
              Content format
            </p>
            <span className="text-[11px] text-[#8C958F]">7 formats</span>
          </div>

          <div className="space-y-1">
            {TRANSFORMATION_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  id={`type-${type.id}`}
                  onClick={() => setSelectedType(type.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                    isSelected
                      ? "bg-[#EBF1ED] text-[#315B46] border-[#C5D7CC] shadow-xs"
                      : "text-[#202522] hover:bg-[#F3F6F4] border-transparent"
                  }`}
                >
                  <p className={`text-sm font-medium ${isSelected ? "text-[#315B46]" : "text-[#202522]"}`}>
                    {type.label}
                  </p>
                  <p className="text-xs text-[#69736C] mt-0.5">{type.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Tone & Length */}
          <div className="pt-3 border-t border-[#E4E8E3] space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-[#69736C] uppercase tracking-wider block mb-1.5">
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
                        ? "bg-[#202522] text-white"
                        : "bg-[#F8F9F7] text-[#69736C] hover:bg-[#EBF1ED] hover:text-[#202522] border border-[#E4E8E3]"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-[#69736C] uppercase tracking-wider block">
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
                        ? "bg-[#202522] text-white"
                        : "bg-[#F8F9F7] text-[#69736C] hover:bg-[#EBF1ED] hover:text-[#202522] border border-[#E4E8E3]"
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
                    <span className="text-xs text-[#69736C]">target lines (10-300)</span>
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
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                          customLines === preset
                            ? "bg-[#202522] border-[#202522] text-white"
                            : "bg-white border-[#E4E8E3] text-[#69736C] hover:bg-[#F8F9F7]"
                        }`}
                      >
                        {preset}L
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            id="generate-btn"
            onClick={() => handleGenerate(false)}
            disabled={generating}
            className="w-full btn-primary justify-center mt-2"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Creating content…
              </span>
            ) : "Generate content"}
          </button>
        </div>

        {/* Previously Created */}
        {transformations.length > 0 && (
          <div className="surface-card p-4 space-y-2">
            <p className="text-[11px] font-semibold text-[#69736C] uppercase tracking-wider">
              Saved outputs
            </p>
            <div className="space-y-1">
              {transformations.map((tf) => {
                const isActive = activeTf?.id === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    id={`history-${tf.id}`}
                    onClick={() => setActiveTf(tf)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors border ${
                      isActive
                        ? "bg-[#EBF1ED] text-[#315B46] border-[#C5D7CC] font-medium"
                        : "text-[#202522] hover:bg-[#F8F9F7] border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium truncate capitalize">
                        {transformationLabel(tf.transformation_type)}
                      </p>
                      <p className="text-[11px] text-[#69736C] shrink-0 ml-2">
                        {formatRelativeDate(tf.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {generating ? (
          <div className="surface-card p-12 flex flex-col items-center justify-center min-h-[420px] gap-5 text-center">
            {/* Elegant restrained spinner */}
            <div className="relative flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-2 border-[#E4E8E3] border-t-[#315B46] animate-spin" />
              <div className="absolute h-2 w-2 rounded-full bg-[#315B46]" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <p className="text-base font-semibold text-[#202522] tracking-tight">
                {loadingMessages[loadingStep]}
              </p>
              <p className="text-xs text-[#69736C]">
                Transforming into {transformationLabel(selectedType).toLowerCase()} with {selectedTone} tone.
              </p>
            </div>

            <div className="w-full max-w-xs bg-[#F8F9F7] border border-[#E4E8E3] rounded-full p-1 flex items-center gap-1.5 justify-center">
              {[0, 1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === loadingStep
                      ? "w-8 bg-[#315B46]"
                      : "w-2 bg-[#D1D8D3]"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="surface-card p-8 text-center space-y-3 border-[#F0D5D5] bg-[#FDF8F8]">
            <div className="w-10 h-10 rounded-full bg-[#FCEBEB] text-[#A83232] mx-auto flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#A83232]">We couldn't generate this content</p>
            <p className="text-xs text-[#69736C] max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              className="btn-secondary text-xs"
            >
              Try again
            </button>
          </div>
        ) : activeTf ? (
          <div className="space-y-0">
            {/* Output Header */}
            <div className="surface-card p-5 rounded-b-none border-b border-[#E4E8E3]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#202522]">{activeTf.title}</h2>
                  <p className="text-xs text-[#69736C] mt-0.5 capitalize">
                    {transformationLabel(activeTf.transformation_type)} · {activeTf.tone} tone · {activeTf.length}
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
                      <span className="flex items-center gap-1.5 text-[#2E6A4F] font-medium">
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
          <div className="surface-card p-12 flex flex-col items-center justify-center min-h-[320px] text-center gap-3">
            <div className="w-12 h-12 bg-[#EBF1ED] text-[#315B46] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#202522]">Choose a format and generate</p>
              <p className="text-xs text-[#69736C] mt-1 max-w-sm">
                Select a content format from the left panel and click &ldquo;Generate content&rdquo; to create your first transformation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
