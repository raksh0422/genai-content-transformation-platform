"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopNav() {
  const pathname = usePathname();

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "Dashboard";
    if (parts[0] === "documents") {
      return parts.length > 1 ? "Document Workspace" : "My Documents";
    }
    if (parts[0] === "settings") return "Settings";
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  };

  return (
    <header className="h-12 border-b border-zinc-200 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-500">
        <Link href="/" className="hover:text-black transition-colors font-bold text-black">
          ContentAI
        </Link>
        <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-black font-extrabold">{getBreadcrumbs()}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-[11px] font-mono text-zinc-800">
          <span className="h-2 w-2 rounded-full bg-black animate-ping" />
          <span>RAG Engine Online</span>
        </div>
      </div>
    </header>
  );
}
