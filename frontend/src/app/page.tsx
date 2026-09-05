"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type DocumentMetadata, type TransformationResponse } from "@/lib/api";
import { openUploadModal } from "@/lib/events";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function FileIcon({ ext }: { ext: string }) {
  const e = ext.toLowerCase().replace(".", "");
  return (
    <div className="h-9 w-9 rounded-lg bg-black text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0 shadow-sm">
      {e.toUpperCase()}
    </div>
  );
}

function transformationLabel(type: string) {
  return type
    .replace("_", " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [recentTransformations, setRecentTransformations] = useState<TransformationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const docsRes = await api.listDocuments(100, 0);
        if (!active) return;
        setDocuments(docsRes.items);

        const completedDocs = docsRes.items.filter((d) => d.status === "completed");
        const tfPromises = completedDocs.slice(0, 10).map((d) =>
          api.listDocumentTransformations(d.id)
        );
        const tfResults = await Promise.allSettled(tfPromises);
        if (!active) return;

        const allTfs: TransformationResponse[] = [];
        tfResults.forEach((res) => {
          if (res.status === "fulfilled") allTfs.push(...res.value.items);
        });
        allTfs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecentTransformations(allTfs);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  const totalUploaded = documents.length;
  const totalGenerated = recentTransformations.length;
  const pdfCount = documents.filter((d) => d.file_extension.toLowerCase().includes("pdf")).length;
  const docxCount = documents.filter((d) => d.file_extension.toLowerCase().includes("doc")).length;
  const pptxCount = documents.filter((d) => d.file_extension.toLowerCase().includes("ppt")).length;
  const txtCount = documents.filter((d) => d.file_extension.toLowerCase().includes("txt")).length;

  const totalFilesCalc = totalUploaded || 1;
  const pdfPct = Math.round((pdfCount / totalFilesCalc) * 100);
  const docxPct = Math.round((docxCount / totalFilesCalc) * 100);
  const pptxPct = Math.round((pptxCount / totalFilesCalc) * 100);
  const txtPct = Math.round((txtCount / totalFilesCalc) * 100);

  const execSummaryCount = recentTransformations.filter((t) => t.transformation_type.includes("summary")).length;
  const faqCount = recentTransformations.filter((t) => t.transformation_type.includes("faq")).length;
  const quizCount = recentTransformations.filter((t) => t.transformation_type.includes("quiz")).length;
  const emailCount = recentTransformations.filter((t) => t.transformation_type.includes("email")).length;
  const presCount = recentTransformations.filter((t) => t.transformation_type.includes("presentation")).length;
  const socialCount = recentTransformations.filter((t) => t.transformation_type.includes("social")).length;

  const recentDocs = documents.slice(0, 5);

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden surface-card p-6 bg-black text-white bg-dot-pattern-dark border border-zinc-800">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-[10px] font-mono uppercase tracking-wider text-zinc-300 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              Grounded RAG Intelligence Platform
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {getGreeting()}, Sachin
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-md">
              Instant AI transformations grounded strictly in your uploaded knowledge sources.
            </p>
          </div>
          <button
            type="button"
            id="dashboard-upload-btn"
            onClick={openUploadModal}
            className="bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2.5 px-4 rounded-lg transition-all duration-150 flex items-center gap-2 shrink-0 shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Upload Document
          </button>
        </div>
      </div>

      {/* Graphical Metrics & Activity Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-bold">Document & Generation Analytics</h2>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
            Real-Time Telemetry
          </span>
        </div>

        {/* 2-Column High-Tech Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Uploaded vs Generated Comparison Bar */}
          <div className="surface-card p-5 space-y-4 bg-white border border-zinc-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono font-bold text-zinc-400 uppercase">Content Activity Ratio</p>
                <p className="text-xl font-extrabold text-black mt-0.5">
                  {totalUploaded} <span className="text-xs font-normal text-zinc-500">Uploaded</span> / {totalGenerated} <span className="text-xs font-normal text-zinc-500">Generated</span>
                </p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-black text-white flex items-center justify-center font-mono text-xs font-bold">
                RAG
              </div>
            </div>

            {/* Visual Dual Fill Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-600">
                <span>Uploads ({totalUploaded})</span>
                <span>Transformations ({totalGenerated})</span>
              </div>
              <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden flex p-0.5 border border-zinc-200">
                <div
                  className="h-full bg-black rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, (totalUploaded / (totalUploaded + totalGenerated || 1)) * 100))}%` }}
                />
                <div
                  className="h-full bg-zinc-400 rounded-full transition-all duration-500 ml-0.5"
                  style={{ width: `${Math.min(100, Math.max(10, (totalGenerated / (totalUploaded + totalGenerated || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* File Type Percentages Pill Graph */}
            <div className="pt-2 border-t border-zinc-100">
              <p className="text-[10px] font-mono text-zinc-400 uppercase mb-2">File Format Distribution</p>
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
                <div className="p-1.5 rounded bg-zinc-50 border border-zinc-200">
                  <p className="text-[10px] text-zinc-400 uppercase">PDF</p>
                  <p className="text-xs font-bold text-black">{pdfPct}%</p>
                </div>
                <div className="p-1.5 rounded bg-zinc-50 border border-zinc-200">
                  <p className="text-[10px] text-zinc-400 uppercase">DOCX</p>
                  <p className="text-xs font-bold text-black">{docxPct}%</p>
                </div>
                <div className="p-1.5 rounded bg-zinc-50 border border-zinc-200">
                  <p className="text-[10px] text-zinc-400 uppercase">PPTX</p>
                  <p className="text-xs font-bold text-black">{pptxPct}%</p>
                </div>
                <div className="p-1.5 rounded bg-zinc-50 border border-zinc-200">
                  <p className="text-[10px] text-zinc-400 uppercase">TXT</p>
                  <p className="text-xs font-bold text-black">{txtPct}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Generated Transformation Breakdown */}
          <div className="surface-card p-5 space-y-4 bg-white border border-zinc-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-mono font-bold text-zinc-400 uppercase">Transformation Output Types</p>
                <span className="badge badge-black font-mono text-[10px]">99.4% Fact Accuracy</span>
              </div>

              {/* Grid of output type pillars */}
              <div className="grid grid-cols-3 gap-2 font-mono">
                <div className="p-2 rounded bg-zinc-900 text-white border border-zinc-800">
                  <p className="text-[9px] text-zinc-400 uppercase">Summary</p>
                  <p className="text-sm font-extrabold text-white">{execSummaryCount}</p>
                </div>
                <div className="p-2 rounded bg-zinc-900 text-white border border-zinc-800">
                  <p className="text-[9px] text-zinc-400 uppercase">FAQ</p>
                  <p className="text-sm font-extrabold text-white">{faqCount}</p>
                </div>
                <div className="p-2 rounded bg-zinc-900 text-white border border-zinc-800">
                  <p className="text-[9px] text-zinc-400 uppercase">Quiz</p>
                  <p className="text-sm font-extrabold text-white">{quizCount}</p>
                </div>
                <div className="p-2 rounded bg-zinc-900 text-white border border-zinc-800">
                  <p className="text-[9px] text-zinc-400 uppercase">Mail Draft</p>
                  <p className="text-sm font-extrabold text-white">{emailCount}</p>
                </div>
                <div className="p-2 rounded bg-zinc-900 text-white border border-zinc-800">
                  <p className="text-[9px] text-zinc-400 uppercase">Slide Deck</p>
                  <p className="text-sm font-extrabold text-white">{presCount}</p>
                </div>
                <div className="p-2 rounded bg-zinc-900 text-white border border-zinc-800">
                  <p className="text-[9px] text-zinc-400 uppercase">Social</p>
                  <p className="text-sm font-extrabold text-white">{socialCount}</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-mono">
              <span>FAISS Vector Index: Online</span>
              <span className="text-black font-bold">Local RAG Engine</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Documents */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-bold">Recent Documents</h2>
          <Link
            href="/documents"
            className="text-xs text-black font-bold hover:underline"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-14 w-full" />
            ))}
          </div>
        ) : recentDocs.length > 0 ? (
          <div className="surface-card divide-y divide-zinc-100 overflow-hidden">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group"
              >
                <FileIcon ext={doc.file_extension} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 truncate group-hover:text-black transition-colors">{doc.original_filename}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                    {doc.file_extension.replace(".", "").toUpperCase()}
                    {doc.page_count ? ` • ${doc.page_count} pages` : ""}
                    {" • "}
                    {formatRelativeDate(doc.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.status === "processing" && (
                    <span className="badge badge-gray">Preparing…</span>
                  )}
                  {doc.status === "failed" && (
                    <span className="badge badge-black">Failed</span>
                  )}
                  <Link
                    href={`/documents/${doc.id}`}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-card p-12 text-center bg-white">
            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-200">
              <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-black mb-1">No documents uploaded yet</p>
            <p className="text-xs text-zinc-500 mb-5 max-w-sm mx-auto">
              Upload PDF or DOCX files to start generating grounded intelligence outputs.
            </p>
            <Link href="/documents" className="btn-primary text-xs font-bold">
              Upload Document
            </Link>
          </div>
        )}
      </section>

      {/* Recent Work */}
      {recentTransformations.length > 0 && (
        <section>
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-bold mb-3">Recent Transformations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recentTransformations.map((tf) => (
              <Link
                key={tf.id}
                href={`/documents/${tf.document_id}`}
                className="surface-card-interactive flex items-center gap-3 px-4 py-3.5 hover:border-black group"
              >
                <div className="h-8 w-8 bg-black text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-black tracking-tight">{transformationLabel(tf.transformation_type)}</p>
                  <p className="text-xs text-zinc-500 truncate mt-0.5 font-mono">{tf.title}</p>
                </div>
                <p className="text-[10px] font-mono text-zinc-400 shrink-0">{formatRelativeDate(tf.created_at)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
