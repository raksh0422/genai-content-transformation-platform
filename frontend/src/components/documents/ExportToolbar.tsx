"use client";

import { useState } from "react";
import { type TransformationResponse } from "@/lib/api";
import { jsonToMarkdown } from "@/components/documents/GeneratedOutput";

interface ExportToolbarProps {
  transformation: TransformationResponse;
}

export function ExportToolbar({ transformation }: ExportToolbarProps) {
  const [copied, setCopied] = useState(false);

  const sanitizeFilename = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 40);
  };

  /** Convert raw content (may be JSON) to plain readable text */
  const getPlainText = (): string => {
    const md = jsonToMarkdown(transformation.content, transformation.transformation_type);
    // Strip markdown syntax for truly plain text
    return md
      .replace(/^#{1,3} /gm, "")          // remove # heading markers
      .replace(/\*\*(.+?)\*\*/g, "$1")     // remove bold
      .replace(/\*(.+?)\*/g, "$1")         // remove italic
      .replace(/^[-*] /gm, "• ")           // convert bullets
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // strip links
      .replace(/```[\s\S]*?```/g, "")      // remove code blocks
      .replace(/`(.+?)`/g, "$1")           // remove inline code
      .replace(/---+/g, "")               // remove hr
      .replace(/\n{3,}/g, "\n\n")         // normalise blank lines
      .trim();
  };

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(getPlainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const exportMarkdown = () => {
    const filename = `${sanitizeFilename(transformation.title)}_${transformation.transformation_type}.md`;
    let md = `# ${transformation.title}\n\n`;
    md += `**Transformation Type:** ${transformation.transformation_type}\n`;
    md += `**Tone:** ${transformation.tone} | **Length:** ${transformation.length}\n`;
    md += `**Generated Date:** ${new Date(transformation.created_at).toLocaleString()}\n\n`;
    md += `---\n\n${jsonToMarkdown(transformation.content, transformation.transformation_type)}\n\n`;

    if (transformation.source_chunks && transformation.source_chunks.length > 0) {
      md += `## Source Citations\n\n`;
      transformation.source_chunks.forEach((chunk, i) => {
        md += `### Citation #${i + 1} (Chunk ${chunk.chunk_index})\n`;
        if (chunk.page_number != null) md += `- **Page:** ${chunk.page_number}\n`;
        if (chunk.slide_number != null) md += `- **Slide:** ${chunk.slide_number}\n`;
        md += `- **Similarity Score:** ${(chunk.similarity_score * 100).toFixed(1)}%\n`;
        md += `> "${chunk.snippet}"\n\n`;
      });
    }

    downloadFile(filename, md, "text/markdown");
  };

  const exportText = () => {
    const filename = `${sanitizeFilename(transformation.title)}_${transformation.transformation_type}.txt`;
    const txt = `${transformation.title}\n\n${getPlainText()}`;
    downloadFile(filename, txt, "text/plain");
  };

  const exportJSON = () => {
    const filename = `${sanitizeFilename(transformation.title)}_${transformation.transformation_type}.json`;
    const jsonStr = JSON.stringify(transformation, null, 2);
    downloadFile(filename, jsonStr, "application/json");
  };

  const printPDF = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Export Output:
      </span>

      {/* Copy plain text to clipboard */}
      <button
        type="button"
        id="copy-plain-text-btn"
        onClick={handleCopyText}
        className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5"
      >
        {copied ? (
          <>
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span className="text-green-700 font-bold">Copied!</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
            </svg>
            📋 Copy Text
          </>
        )}
      </button>

      <button
        type="button"
        onClick={exportMarkdown}
        className="btn-secondary text-xs py-1 px-2.5"
      >
        📄 Markdown (.md)
      </button>

      <button
        type="button"
        onClick={exportText}
        className="btn-secondary text-xs py-1 px-2.5"
      >
        📝 Text (.txt)
      </button>

      <button
        type="button"
        onClick={exportJSON}
        className="btn-secondary text-xs py-1 px-2.5"
      >
        ⚙️ JSON (.json)
      </button>

      <button
        type="button"
        onClick={printPDF}
        className="btn-secondary text-xs py-1 px-2.5"
      >
        🖨️ Print / PDF
      </button>
    </div>
  );
}

