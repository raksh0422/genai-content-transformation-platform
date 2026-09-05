"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  onOpenUploadModal?: () => void;
}

const PRIMARY_NAV = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: "/documents",
    label: "My Documents",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    href: "/tools",
    label: "Text Tools",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

export function Sidebar({ onOpenUploadModal }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-[#09090b] border-r border-zinc-800 flex flex-col shrink-0 h-screen sticky top-0 z-30 select-none bg-dot-pattern-dark">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-white text-black flex items-center justify-center shrink-0 font-extrabold text-sm shadow-sm group-hover:scale-105 transition-transform duration-200">
            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 0 0 5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0 1 5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0 1 15 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0 0 15 4a7.968 7.968 0 0 0-4.5.804V12a1 1 0 1 1-2 0V4.804Z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-extrabold text-white tracking-tight leading-none">ContentAI</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mt-1">Intelligence SaaS</p>
          </div>
        </Link>
      </div>

      {/* Upload CTA */}
      <div className="px-3 mb-5">
        <button
          type="button"
          id="sidebar-upload-btn"
          onClick={onOpenUploadModal}
          className="w-full bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2.5 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Upload Document
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {PRIMARY_NAV.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.href.replace("/", "") || "home"}`}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-3 border-t border-zinc-800 bg-[#09090b]/80">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/50">
          <div className="h-7 w-7 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold shrink-0">
            S
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">Sachin</p>
            <p className="text-[10px] font-mono text-zinc-400 truncate">PRO Enterprise</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
