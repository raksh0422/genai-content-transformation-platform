"use client";

import { useState, useRef, useEffect } from "react";
import type { TransformationResponse } from "@/lib/api";

interface DownloadMenuProps {
  transformation: TransformationResponse;
}

function sanitizeName(title: string, type: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);
  return `${base}_${type.replace("_", "-")}`;
}

function downloadBlob(filename: string, content: string | ArrayBuffer, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts ANY transformation output (whether JSON schema object or raw markdown string)
 * into a clean, structured Markdown representation for export (PDF, Word, TXT, MD).
 */
export function formatTransformationToMarkdown(tf: TransformationResponse): { title: string; markdown: string } {
  let content = tf.content;
  let parsed: any = null;

  try {
    const trimmed = content.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      parsed = JSON.parse(trimmed);
    }
  } catch {
    // Not JSON
  }

  const type = tf.transformation_type.toLowerCase();
  const title = tf.title || "Document Transformation";

  if (parsed) {
    if (type.includes("executivesummary") || type.includes("summary")) {
      const overview = parsed.overview || "";
      const findings = parsed.key_findings || [];
      const implications = parsed.strategic_implications || [];

      let md = `# ${parsed.title || title}\n\n`;
      if (overview) md += `## Executive Overview\n\n${overview}\n\n`;
      if (findings.length > 0) {
        md += `## Key Findings\n\n`;
        findings.forEach((f: string) => { md += `- ${f}\n`; });
        md += `\n`;
      }
      if (implications.length > 0) {
        md += `## Strategic Implications\n\n`;
        implications.forEach((imp: string) => { md += `- ${imp}\n`; });
      }
      return { title: parsed.title || title, markdown: md.trim() };
    }

    if (type.includes("faq")) {
      const items = parsed.items || [];
      let md = `# ${parsed.title || "Frequently Asked Questions"}\n\n`;
      items.forEach((item: any, idx: number) => {
        md += `### Q${idx + 1}: ${item.question}\n\n${item.answer}\n\n`;
      });
      return { title: parsed.title || title, markdown: md.trim() };
    }

    if (type.includes("quiz")) {
      const questions = parsed.questions || [];
      let md = `# ${parsed.title || "Document Verification Quiz"}\n\n`;
      questions.forEach((q: any) => {
        md += `### Question ${q.question_number}: ${q.question}\n\n`;
        if (Array.isArray(q.options)) {
          q.options.forEach((opt: string) => {
            md += `- ${opt}\n`;
          });
        }
        md += `\n**Correct Answer:** Option ${q.correct_answer}\n\n`;
        if (q.explanation) {
          md += `> **Explanation:** ${q.explanation}\n\n`;
        }
        md += `---\n\n`;
      });
      return { title: parsed.title || title, markdown: md.trim() };
    }

    if (type.includes("email")) {
      let md = `# Subject: ${parsed.subject || title}\n\n`;
      if (parsed.salutation) md += `${parsed.salutation}\n\n`;
      if (parsed.body) md += `${parsed.body}\n\n`;
      if (parsed.action_items && parsed.action_items.length > 0) {
        md += `### Key Action Items\n\n`;
        parsed.action_items.forEach((item: string) => { md += `- ${item}\n`; });
        md += `\n`;
      }
      if (parsed.signoff) md += `${parsed.signoff}\n`;
      return { title: parsed.subject || title, markdown: md.trim() };
    }

    if (type.includes("presentation")) {
      const slides = parsed.slides || [];
      let md = `# ${parsed.title || "Executive Presentation Deck"}\n\n`;
      slides.forEach((slide: any) => {
        md += `## Slide ${slide.slide_number}: ${slide.title}\n\n`;
        if (Array.isArray(slide.bullet_points)) {
          slide.bullet_points.forEach((pt: string) => { md += `- ${pt}\n`; });
        }
        md += `\n`;
      });
      return { title: parsed.title || title, markdown: md.trim() };
    }

    if (type.includes("social")) {
      let md = `# ${parsed.headline || title}\n\n`;
      if (parsed.post_text) md += `${parsed.post_text}\n\n`;
      if (parsed.hashtags && parsed.hashtags.length > 0) {
        md += `**Hashtags:** ${parsed.hashtags.join(" ")}\n`;
      }
      return { title: parsed.headline || title, markdown: md.trim() };
    }
  }

  // If plain markdown string
  let cleanMd = content;
  if (!cleanMd.startsWith("#")) {
    cleanMd = `# ${title}\n\n${cleanMd}`;
  }
  return { title, markdown: cleanMd };
}

function exportMarkdown(tf: TransformationResponse) {
  const { title, markdown } = formatTransformationToMarkdown(tf);
  const name = sanitizeName(title, tf.transformation_type);
  downloadBlob(`${name}.md`, markdown, "text/markdown");
}

function exportText(tf: TransformationResponse) {
  const { title, markdown } = formatTransformationToMarkdown(tf);
  const name = sanitizeName(title, tf.transformation_type);
  // Strip markdown formatting symbols for plain text
  const txt = markdown
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^>\s+/gm, "");
  downloadBlob(`${name}.txt`, txt, "text/plain");
}

function exportPDF(tf: TransformationResponse) {
  const { title, markdown } = formatTransformationToMarkdown(tf);

  // Convert markdown to clean HTML for PDF rendering
  const bodyHtml = markdownToPdfHtml(markdown);

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 11pt;
          line-height: 1.7;
          color: #0f172a;
          padding: 48px 56px;
          max-width: 820px;
          margin: 0 auto;
          background: #ffffff;
        }
        .header-meta {
          font-size: 9pt;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 24pt;
          padding-bottom: 12pt;
          border-bottom: 2px solid #2563eb;
          display: flex;
          justify-content: space-between;
        }
        h1 {
          font-size: 20pt;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 16pt;
          line-height: 1.3;
        }
        h2 {
          font-size: 13pt;
          font-weight: 700;
          color: #1e293b;
          margin: 22pt 0 10pt;
          padding-bottom: 4pt;
          border-bottom: 1px solid #e2e8f0;
        }
        h3 {
          font-size: 11.5pt;
          font-weight: 600;
          color: #1e293b;
          margin: 16pt 0 6pt;
        }
        p {
          margin-bottom: 10pt;
          color: #334155;
          text-align: justify;
        }
        ul, ol {
          margin: 8pt 0 14pt 20pt;
        }
        li {
          margin-bottom: 4pt;
          color: #334155;
        }
        strong {
          font-weight: 600;
          color: #0f172a;
        }
        blockquote {
          border-left: 3px solid #2563eb;
          background-color: #f8fafc;
          padding: 10pt 14pt;
          margin: 12pt 0;
          border-radius: 0 6px 6px 0;
          color: #1e3a8a;
          font-size: 10.5pt;
        }
        hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 20pt 0;
        }
        @page {
          margin: 1.5cm 2cm;
        }
      </style>
    </head>
    <body>
      <div class="header-meta">
        <span>ContentAI Executive Report</span>
        <span>Generated ${new Date().toLocaleDateString()}</span>
      </div>
      <div>${bodyHtml}</div>
    </body>
    </html>
  `;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(printContent);
    w.document.close();
    setTimeout(() => { w.print(); }, 400);
  }
}

async function exportDocx(tf: TransformationResponse) {
  const { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } = await import("docx");
  const { title, markdown } = formatTransformationToMarkdown(tf);

  const lines = markdown.split("\n");
  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 36, color: "0f172a" })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 240 },
    }),
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
      continue;
    }
    if (trimmed.startsWith("# ")) {
      // Ignore if title already rendered
      if (trimmed.slice(2) === title) continue;
      children.push(new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 140 } }));
    } else if (trimmed.startsWith("## ")) {
      children.push(new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 } }));
    } else if (trimmed.startsWith("### ")) {
      children.push(new Paragraph({ text: trimmed.slice(4), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const itemText = trimmed.slice(2);
      const runs = parseInlineFormatting(itemText, TextRun);
      children.push(new Paragraph({ children: runs, bullet: { level: 0 }, spacing: { after: 80 } }));
    } else if (/^\d+\. /.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\. /, "");
      const runs = parseInlineFormatting(itemText, TextRun);
      children.push(new Paragraph({ children: runs, numbering: { reference: "default", level: 0 }, spacing: { after: 80 } }));
    } else if (trimmed.startsWith("> ")) {
      const quoteText = trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, "$1");
      children.push(new Paragraph({
        children: [new TextRun({ text: quoteText, italics: true, color: "1e3a8a" })],
        spacing: { before: 140, after: 140 },
      }));
    } else if (trimmed === "---") {
      children.push(new Paragraph({ text: "", border: { bottom: { color: "e2e8f0", size: 1, space: 1, style: "single" } }, spacing: { before: 180, after: 180 } }));
    } else {
      const runs = parseInlineFormatting(trimmed, TextRun);
      children.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
    }
  }

  const doc = new Document({
    numbering: {
      config: [{ reference: "default", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 360, hanging: 360 } } } }] }],
    },
    sections: [{ properties: {}, children }],
  });

  const buffer = await Packer.toBuffer(doc);
  const name = sanitizeName(title, tf.transformation_type);
  downloadBlob(`${name}.docx`, buffer as unknown as ArrayBuffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

function parseInlineFormatting(text: string, TextRun: any) {
  const runs: any[] = [];
  const parts = text.split(/(\*\*.*?\*\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, color: "0f172a" }));
    } else {
      runs.push(new TextRun({ text: part, color: "334155" }));
    }
  }
  return runs;
}

function markdownToPdfHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^[*-] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      if (t.startsWith("<h") || t.startsWith("<ul") || t.startsWith("<hr") || t.startsWith("<li") || t.startsWith("<blockquote")) return t;
      return `<p>${t}</p>`;
    })
    .join("\n");
}

async function exportPptx(tf: TransformationResponse) {
  const pptxgen = (await import("pptxgenjs")).default;
  const pptx = new pptxgen();
  const { title, markdown } = formatTransformationToMarkdown(tf);

  pptx.layout = "LAYOUT_16x9";
  pptx.title = title;

  // Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "0F172A" };
  titleSlide.addText(title, {
    x: 0.8, y: 2.0, w: 8.4, h: 2.0,
    fontSize: 26, bold: true, color: "FFFFFF", align: "left",
  });
  titleSlide.addText("Generated by ContentAI Intelligence Platform", {
    x: 0.8, y: 4.2, w: 8.4, h: 0.8,
    fontSize: 14, color: "94A3B8",
  });

  // Content slides
  const lines = markdown.split("\n");
  let currentTitle = title;
  let currentBullets: string[] = [];

  const addContentSlide = (slideTitle: string, bullets: string[]) => {
    if (bullets.length === 0) return;
    const slide = pptx.addSlide();
    slide.addText(slideTitle, {
      x: 0.8, y: 0.6, w: 8.4, h: 0.8,
      fontSize: 20, bold: true, color: "0F172A",
    });

    const items = bullets.slice(0, 7).map((b) => ({
      text: b,
      options: { bullet: true, color: "334155", fontSize: 13, breakLine: true },
    }));

    slide.addText(items as any, {
      x: 0.8, y: 1.5, w: 8.4, h: 4.8,
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      if (currentBullets.length > 0) {
        addContentSlide(currentTitle, currentBullets);
        currentBullets = [];
      }
      currentTitle = trimmed.replace(/^#+\s*/, "");
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\. /.test(trimmed)) {
      const cleanItem = trimmed.replace(/^[*-]\s*/, "").replace(/^\d+\.\s*/, "").replace(/\*\*/g, "");
      currentBullets.push(cleanItem);
    } else if (trimmed.length > 15 && !trimmed.startsWith("#")) {
      currentBullets.push(trimmed.replace(/\*\*/g, ""));
    }
  }

  if (currentBullets.length > 0) {
    addContentSlide(currentTitle, currentBullets);
  }

  const name = sanitizeName(title, tf.transformation_type);
  await pptx.writeFile({ fileName: `${name}.pptx` });
}

async function exportImage(tf: TransformationResponse, format: "png" | "jpeg") {
  const { toPng, toJpeg } = await import("html-to-image");
  const { title, markdown } = formatTransformationToMarkdown(tf);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "850px";
  container.style.padding = "40px";
  container.style.background = "#ffffff";
  container.style.fontFamily = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
  container.style.color = "#0f172a";
  container.style.borderRadius = "16px";
  container.style.border = "1px solid #e2e8f0";

  const bodyHtml = markdownToPdfHtml(markdown);

  container.innerHTML = `
    <div style="border-top: 6px solid #2563eb; padding-top: 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
      <div>
        <div style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px;">ContentAI Intelligence Output</div>
        <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px;">${title}</div>
      </div>
      <div style="font-size: 11px; color: #64748b;">${new Date().toLocaleDateString()}</div>
    </div>
    <div style="font-size: 14px; line-height: 1.7; color: #334155;">
      ${bodyHtml}
    </div>
    <div style="margin-top: 32px; pt: 16px; border-top: 1px solid #f1f5f9; text-align: right; font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
      Grounded RAG Transformation · ContentAI SaaS
    </div>
  `;

  document.body.appendChild(container);

  try {
    const dataUrl = format === "png" 
      ? await toPng(container, { pixelRatio: 2 }) 
      : await toJpeg(container, { quality: 0.95, pixelRatio: 2 });
      
    const name = sanitizeName(title, tf.transformation_type);
    const link = document.createElement("a");
    link.download = `${name}.${format === "png" ? "png" : "jpg"}`;
    link.href = dataUrl;
    link.click();
  } finally {
    document.body.removeChild(container);
  }
}

export function DownloadMenu({ transformation }: DownloadMenuProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options = [
    {
      id: "pdf",
      label: "PDF Document",
      description: "Print-ready formatted PDF report",
      action: () => exportPDF(transformation),
    },
    {
      id: "docx",
      label: "Word (.docx)",
      description: "Editable Word document",
      action: async () => {
        setDownloading("docx");
        await exportDocx(transformation).catch(console.error);
        setDownloading(null);
      },
    },
    {
      id: "pptx",
      label: "PowerPoint (.pptx)",
      description: "Slide presentation deck",
      action: async () => {
        setDownloading("pptx");
        await exportPptx(transformation).catch(console.error);
        setDownloading(null);
      },
    },
    {
      id: "png",
      label: "PNG Image (.png)",
      description: "High resolution graphic image",
      action: async () => {
        setDownloading("png");
        await exportImage(transformation, "png").catch(console.error);
        setDownloading(null);
      },
    },
    {
      id: "jpg",
      label: "JPG Image (.jpg)",
      description: "Compressed graphic image",
      action: async () => {
        setDownloading("jpg");
        await exportImage(transformation, "jpeg").catch(console.error);
        setDownloading(null);
      },
    },
    {
      id: "md",
      label: "Markdown (.md)",
      description: "Formatted plain text with structure",
      action: () => exportMarkdown(transformation),
    },
    {
      id: "txt",
      label: "Plain text (.txt)",
      description: "Simple unformatted text file",
      action: () => exportText(transformation),
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        id="download-menu-btn"
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary text-sm flex items-center gap-1.5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Download
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden animate-slide-up max-h-96 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.id}
              id={`download-${opt.id}`}
              type="button"
              onClick={() => {
                opt.action();
                if (opt.id !== "docx" && opt.id !== "pptx" && opt.id !== "png" && opt.id !== "jpg") setOpen(false);
              }}
              disabled={downloading === opt.id}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group border-b border-gray-50 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{opt.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
              </div>
              {downloading === opt.id ? (
                <svg className="w-4 h-4 text-blue-600 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
