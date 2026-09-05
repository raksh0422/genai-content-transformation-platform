"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect } from "react";
import type { TransformationResponse } from "@/lib/api";

// ─── JSON schema type renderers ───────────────────────────────────────────────

interface FAQItem { question: string; answer: string; source_citation?: string; }
interface FAQResponse { title: string; items: FAQItem[]; }

interface QuizItem { question_number: number; question: string; options: string[]; correct_answer: string; explanation: string; }
interface QuizResponse { title: string; questions: QuizItem[]; }

interface SlideOutline { slide_number: number; title: string; bullet_points: string[]; }
interface PresentationResponse { title: string; slides: SlideOutline[]; }

interface EmailResponse { subject: string; salutation: string; body: string; action_items: string[]; signoff: string; }

interface ExecutiveSummaryResponse { title: string; overview: string; key_findings: string[]; strategic_implications: string[]; }

interface SocialPostResponse { platform: string; headline: string; post_text: string; hashtags: string[]; }

function renderFAQ(data: FAQResponse) {
  return (
    <div className="space-y-5">
      {data.items.map((item, i) => (
        <div key={i} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1.5 flex items-start gap-2">
            <span className="text-blue-600 font-bold shrink-0">Q{i + 1}.</span>
            {item.question}
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed pl-7">{item.answer}</p>
        </div>
      ))}
    </div>
  );
}

// Strip internal technical references that shouldn't be shown to users
function cleanExplanation(text: string): string {
  return text
    .replace(/\[?Chunk\s*#?\d+[^\]]*\]?/gi, "")
    .replace(/\|?\s*Slide\s+\d+\s*\]?/gi, "")
    .replace(/\[?\s*\|?\s*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s|]+|[,\s|]+$/g, "")
    .trim();
}

function renderQuiz(data: QuizResponse) {
  return (
    <div className="space-y-6">
      {data.questions.map((q) => (
        <div key={q.question_number} className="border border-gray-100 rounded-xl p-5 space-y-3 bg-gray-50">
          <p className="text-sm font-semibold text-gray-900">
            <span className="text-blue-600 mr-1.5">{q.question_number}.</span>
            {q.question}
          </p>
          <ul className="space-y-1.5 pl-5">
            {q.options.map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const isCorrect = q.correct_answer === letter;
              return (
                <li
                  key={i}
                  className={`text-sm flex items-start gap-2 py-1.5 px-3 rounded-lg ${
                    isCorrect ? "bg-green-50 text-green-800 font-medium" : "text-gray-700"
                  }`}
                >
                  <span className={`shrink-0 font-semibold ${isCorrect ? "text-green-600" : "text-gray-400"}`}>
                    {letter}
                  </span>
                  {/* Strip "A) " / "B) " prefix if backend included it */}
                  {opt.replace(/^[A-D]\)\s*/i, "")}
                  {isCorrect && (
                    <svg className="w-4 h-4 text-green-500 ml-auto shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
          {q.explanation && cleanExplanation(q.explanation) && (
            <div className="text-xs text-gray-500 bg-white border border-gray-100 rounded-lg px-3 py-2 leading-relaxed">
              <span className="font-semibold text-gray-600">Explanation: </span>{cleanExplanation(q.explanation)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function renderPresentation(data: PresentationResponse) {
  return (
    <div className="space-y-4">
      {data.slides.map((slide) => (
        <div key={slide.slide_number} className="border border-zinc-200 rounded-xl overflow-hidden surface-card">
          <div className="bg-zinc-900 text-white border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
            <span className="h-7 w-7 rounded-lg bg-white text-black flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
              {slide.slide_number}
            </span>
            <p className="text-sm font-bold text-white">{slide.title}</p>
          </div>
          <ul className="px-5 py-3.5 space-y-2">
            {slide.bullet_points.map((pt, i) => (
              <li key={i} className="text-sm text-zinc-700 flex items-start gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 bg-black rounded-full shrink-0" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── Helper: Convert JSON structured output to Markdown for Word-style editing ─────────

export function jsonToMarkdown(rawContent: string, transformationType: string = ""): string {
  if (!rawContent || !rawContent.trim()) return "";
  const trimmed = rawContent.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return rawContent;
  }

  try {
    const data = JSON.parse(trimmed);
    const type = transformationType.toLowerCase();

    // 1. Email
    if ("subject" in data || type.includes("email")) {
      const subject = data.subject || "Executive Briefing";
      const salutation = data.salutation || "Team,";
      const body = data.body || "";
      const actions = Array.isArray(data.action_items) && data.action_items.length > 0
        ? "\n\nAction Items:\n" + data.action_items.map((a: string) => `- ${a}`).join("\n")
        : "";
      const signoff = data.signoff || "Best regards,\nExecutive Briefing Team";
      return `Subject: ${subject}\n\n${salutation}\n\n${body}${actions}\n\n${signoff}`;
    }

    // 2. Executive Summary
    if ("key_findings" in data || type.includes("executive")) {
      const title = data.title || "Executive Briefing & Strategic Summary";
      const overview = data.overview ? `## Overview\n${data.overview}\n\n` : "";
      const findings = Array.isArray(data.key_findings) && data.key_findings.length > 0
        ? `## Key Findings\n` + data.key_findings.map((f: string) => `- ${f}`).join("\n") + "\n\n"
        : "";
      const implications = Array.isArray(data.strategic_implications) && data.strategic_implications.length > 0
        ? `## Strategic Implications\n` + data.strategic_implications.map((i: string) => `- ${i}`).join("\n")
        : "";
      return `# ${title}\n\n${overview}${findings}${implications}`.trim();
    }

    // 3. FAQ
    if ("items" in data || type.includes("faq")) {
      const title = data.title || "Frequently Asked Questions";
      const items = Array.isArray(data.items)
        ? data.items.map((item: any, idx: number) => 
            `### Q${idx + 1}. ${item.question}\n${item.answer}${item.source_citation ? ` *(Source: ${item.source_citation})*` : ""}`
          ).join("\n\n")
        : "";
      return `# ${title}\n\n${items}`.trim();
    }

    // 4. Quiz
    if ("questions" in data || type.includes("quiz")) {
      const title = data.title || "Document Intelligence Quiz";
      const qList = Array.isArray(data.questions)
        ? data.questions.map((q: any) => {
            const opts = Array.isArray(q.options) ? q.options.map((o: string) => `  - ${o}`).join("\n") : "";
            return `### Question ${q.question_number}: ${q.question}\n${opts}\n**Correct Answer:** Option ${q.correct_answer}\n*Explanation:* ${q.explanation || ""}`;
          }).join("\n\n")
        : "";
      return `# ${title}\n\n${qList}`.trim();
    }

    // 5. Presentation Outline
    if ("slides" in data || type.includes("presentation")) {
      const title = data.title || "Presentation Slide Deck";
      const slides = Array.isArray(data.slides)
        ? data.slides.map((s: any) => {
            const bullets = Array.isArray(s.bullet_points) ? s.bullet_points.map((b: string) => `- ${b}`).join("\n") : "";
            return `## Slide ${s.slide_number}: ${s.title}\n${bullets}`;
          }).join("\n\n")
        : "";
      return `# ${title}\n\n${slides}`.trim();
    }

    // 6. Social Post
    if ("post_text" in data || type.includes("social")) {
      const headline = data.headline ? `# ${data.headline}\n\n` : "";
      const text = data.post_text || "";
      const tags = Array.isArray(data.hashtags) ? "\n\n" + data.hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ") : "";
      return `${headline}${text}${tags}`.trim();
    }

    // Generic JSON fallback
    return Object.entries(data)
      .map(([k, v]) => {
        const header = k.replace(/_/g, " ").toUpperCase();
        if (typeof v === "string") return `## ${header}\n${v}`;
        if (Array.isArray(v)) return `## ${header}\n` + v.map((item) => `- ${typeof item === "object" ? JSON.stringify(item) : item}`).join("\n");
        return `## ${header}\n${JSON.stringify(v, null, 2)}`;
      })
      .join("\n\n");
  } catch {
    return rawContent;
  }
}

function renderEmail(data: EmailResponse) {
  const emailDraftText = `Subject: ${data.subject}\n\n${data.salutation}\n\n${data.body}\n\nAction Items:\n${(data.action_items || []).map((a) => `• ${a}`).join("\n")}\n\n${data.signoff}`;

  const copyEmailDraft = async () => {
    try {
      await navigator.clipboard.writeText(emailDraftText);
      alert("Email draft copied to clipboard! You can paste it directly into your email client.");
    } catch {
      alert("Failed to copy email draft");
    }
  };

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-white surface-card">
      <div className="bg-zinc-900 text-white border-b border-zinc-800 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-black uppercase tracking-wider">Mail Draft</span>
          <span className="text-sm font-bold text-white truncate">Subject: {data.subject}</span>
        </div>
        <button
          type="button"
          onClick={copyEmailDraft}
          className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5 shrink-0 bg-white hover:bg-zinc-200 border-white text-black font-bold"
        >
          <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
          </svg>
          Copy Ready-to-Send Mail Draft
        </button>
      </div>

      <div className="p-6 space-y-4 text-sm text-zinc-800 leading-relaxed font-sans">
        <p className="font-bold text-black">{data.salutation}</p>
        <p className="whitespace-pre-line text-zinc-700">{data.body}</p>
        {data.action_items?.length > 0 && (
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-2">
            <p className="text-xs font-mono font-bold text-black uppercase tracking-wider">Action Items & Next Steps</p>
            <ul className="space-y-1.5">
              {data.action_items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-900 font-medium">
                  <span className="text-black font-bold mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="pt-2 text-zinc-600 whitespace-pre-line font-medium">
          {data.signoff}
        </div>
      </div>
    </div>
  );
}

function renderExecutiveSummary(data: ExecutiveSummaryResponse) {
  return (
    <div className="space-y-6">
      {data.overview && (
        <div>
          <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">Overview</h3>
          <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-line">{data.overview}</p>
        </div>
      )}
      {data.key_findings?.length > 0 && (
        <div>
          <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">Key Findings</h3>
          <ul className="space-y-2">
            {data.key_findings.map((finding, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-800">
                <span className="mt-2 h-1.5 w-1.5 bg-black rounded-full shrink-0" />
                {finding}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.strategic_implications?.length > 0 && (
        <div>
          <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2">Strategic Implications</h3>
          <ul className="space-y-2">
            {data.strategic_implications.map((imp, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-800">
                <span className="mt-2 h-1.5 w-1.5 bg-black rounded-full shrink-0" />
                {imp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function renderSocialPost(data: SocialPostResponse) {
  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-xl p-5 space-y-3 bg-white">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">ContentAI Post Highlight</p>
            <p className="text-xs text-gray-400">{data.platform}</p>
          </div>
        </div>
        {data.headline && (
          <p className="text-sm font-bold text-gray-900">{data.headline}</p>
        )}
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{data.post_text}</p>
        {data.hashtags?.length > 0 && (
          <p className="text-sm text-blue-600 font-medium">
            {data.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Smart content renderer ───────────────────────────────────────────────────

function smartRender(content: string, type: string): React.ReactNode {
  // If content is an email string like "Subject: ...", check if it starts with Subject
  if (type.toLowerCase().includes("email") && content.trim().startsWith("Subject:")) {
    const lines = content.trim().split("\n");
    const subjectLine = lines[0].replace(/^Subject:\s*/i, "");
    const rest = lines.slice(1).join("\n").trim();

    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white uppercase tracking-wider">Email Draft</span>
            <span className="text-sm font-bold text-gray-900 truncate">Subject: {subjectLine}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(content);
                alert("Email draft copied to clipboard!");
              } catch {
                alert("Failed to copy email draft");
              }
            }}
            className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5 shrink-0 bg-white hover:bg-gray-50 border-gray-300"
          >
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>
            Copy Ready-to-Send Mail Draft
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm text-gray-800 leading-relaxed font-sans">
          <p className="whitespace-pre-line text-gray-700">{rest}</p>
        </div>
      </div>
    );
  }

  // Try to parse as JSON first
  let parsed: Record<string, unknown> | null = null;
  try {
    const trimmed = content.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      parsed = JSON.parse(trimmed);
    }
  } catch {
    // Not JSON — fall through to markdown renderer
  }

  if (parsed) {
    const t = type.toLowerCase();
    if (t.includes("faq") && "items" in parsed) {
      return renderFAQ(parsed as unknown as FAQResponse);
    }
    if (t.includes("quiz") && "questions" in parsed) {
      return renderQuiz(parsed as unknown as QuizResponse);
    }
    if ((t.includes("presentation") || t.includes("outline")) && "slides" in parsed) {
      return renderPresentation(parsed as unknown as PresentationResponse);
    }
    if (t.includes("email") && "subject" in parsed) {
      return renderEmail(parsed as unknown as EmailResponse);
    }
    if ((t.includes("executive") || t.includes("summary")) && "key_findings" in parsed) {
      return renderExecutiveSummary(parsed as unknown as ExecutiveSummaryResponse);
    }
    if (t.includes("social") && "post_text" in parsed) {
      return renderSocialPost(parsed as unknown as SocialPostResponse);
    }
  }

  // Fallback: render as structured markdown
  return <MarkdownView content={content} />;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function markdownToHtml(md: string): string {
  let cleanMd = md
    .replace(/^Based on the retrieved document context:\s*/gi, "")
    .replace(/^\[Chunk\s*#?\d+[^\]]*\]\s*/gm, "")
    .replace(/^Key finding:\s*/gm, "")
    .trim();

  let html = cleanMd
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```[\s\S]*?```/g, (m) => {
      const code = m.replace(/```[a-z]*\n?/g, "").replace(/```/g, "");
      return `<pre class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono overflow-x-auto"><code>${code}</code></pre>`;
    })
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^[*-] (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<oli>$1</oli>");

  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/(<oli>.*<\/oli>\n?)+/g, (m) =>
    `<ol>${m.replace(/<oli>/g, "<li>").replace(/<\/oli>/g, "</li>")}</ol>`
  );

  const lines = html.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const isBlock = t.startsWith("<h") || t.startsWith("<ul") || t.startsWith("<ol") ||
      t.startsWith("<pre") || t.startsWith("<hr") || t.startsWith("<li") ||
      t.endsWith("</ul>") || t.endsWith("</ol>") || t.endsWith("</pre>");
    result.push(isBlock ? t : `<p>${t}</p>`);
  }
  return result.join("\n");
}

function MarkdownView({ content }: { content: string }) {
  return (
    <div
      className="document-prose"
      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
    />
  );
}

// ─── TipTap Editor ────────────────────────────────────────────────────────────

interface EditorViewProps {
  content: string;
  transformationType?: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

function EditorView({ content, transformationType = "", onSave, onCancel }: EditorViewProps) {
  // Convert JSON or raw content into Word-style markdown text before editing
  const markdownText = jsonToMarkdown(content, transformationType);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start editing text…" }),
    ],
    content: markdownToHtml(markdownText),
  });

  const handleSave = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const text = html
      .replace(/<h[1-3]>(.*?)<\/h[1-3]>/g, "\n## $1\n")
      .replace(/<p>(.*?)<\/p>/g, "$1\n")
      .replace(/<li>(.*?)<\/li>/g, "- $1\n")
      .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
      .replace(/<em>(.*?)<\/em>/g, "*$1*")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .trim();
    onSave(text);
  };

  const formatBtn = (label: string, title: string, action: () => void, isActive: () => boolean) => (
    <button
      key={label}
      type="button"
      title={title}
      onClick={action}
      className={`h-7 px-2 rounded text-sm font-semibold transition-colors ${
        isActive() ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
          </svg>
          Document Word Editor
        </span>
        <span className="text-xs text-gray-400">Edit text, headings, and formatting directly</span>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden tiptap-editor shadow-sm bg-white">
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50">
          {formatBtn("B", "Bold", () => editor?.chain().focus().toggleBold().run(), () => !!editor?.isActive("bold"))}
          {formatBtn("I", "Italic", () => editor?.chain().focus().toggleItalic().run(), () => !!editor?.isActive("italic"))}
          <div className="w-px h-4 bg-gray-200 mx-1" />
          {formatBtn("H2", "Heading 2", () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), () => !!editor?.isActive("heading", { level: 2 }))}
          {formatBtn("H3", "Heading 3", () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), () => !!editor?.isActive("heading", { level: 3 }))}
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button
            type="button" title="Bullet list"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`w-7 h-7 rounded transition-colors ${editor?.isActive("bulletList") ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
          >
            <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </button>
        </div>
        <div className="min-h-[400px] max-h-[70vh] overflow-y-auto">
          <EditorContent editor={editor} className="document-prose px-6 py-4" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">Cancel</button>
        <button type="button" onClick={handleSave} className="btn-primary text-sm">Save changes</button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface GeneratedOutputProps {
  transformation: TransformationResponse;
  onContentChange?: (newContent: string) => void;
}

/** Convert any content (JSON or markdown) to clean plain text for clipboard. */
function toClipboardText(content: string, type: string): string {
  const md = jsonToMarkdown(content, type);
  return md
    .replace(/^#{1,3} /gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^[-*] /gm, "• ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/---+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function GeneratedOutput({ transformation, onContentChange }: GeneratedOutputProps) {
  const [editing, setEditing] = useState(false);
  const [localContent, setLocalContent] = useState(transformation.content);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLocalContent(transformation.content);
    setEditing(false);
  }, [transformation.id, transformation.content]);

  const handleSave = (newContent: string) => {
    setLocalContent(newContent);
    setEditing(false);
    onContentChange?.(newContent);
  };

  const handleCopy = async () => {
    try {
      const text = toClipboardText(localContent, transformation.transformation_type);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (editing) {
    return (
      <EditorView
        content={localContent}
        transformationType={transformation.transformation_type}
        onSave={handleSave}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {/* Copy plain text button */}
        <button
          type="button"
          id="copy-output-btn"
          onClick={handleCopy}
          className="btn-ghost text-sm flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-green-600 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
              </svg>
              Copy Text
            </>
          )}
        </button>

        {/* Edit in Word editor button */}
        <button
          type="button"
          id="edit-output-btn"
          onClick={() => setEditing(true)}
          className="btn-ghost text-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
          </svg>
          Edit in Word Editor
        </button>
      </div>
      {smartRender(localContent, transformation.transformation_type)}
    </div>
  );
}

