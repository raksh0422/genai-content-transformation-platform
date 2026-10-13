"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface SidebarProps {
  onOpenUploadModal?: () => void;
  onCloseMobile?: () => void;
}

const PRIMARY_NAV = [
  {
    href: "/dashboard",
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
    label: "Plagiarism & Humanizer",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
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

export function Sidebar({ onOpenUploadModal, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <aside className="w-60 bg-white border-r border-[#E4E8E3] flex flex-col shrink-0 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="px-5 pt-6 pb-4 border-b border-[#F0F2EF] flex items-center justify-between">
        <Link href="/dashboard" onClick={onCloseMobile} className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-[#315B46] text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-sm group-hover:bg-[#264936] transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#202522] tracking-tight leading-none">ContentAI</p>
            <p className="text-[11px] text-[#69736C] mt-0.5 font-medium">Document Workspace</p>
          </div>
        </Link>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-[#69736C] hover:text-[#202522] p-1 rounded-md"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="px-4 py-4">
        <button
          type="button"
          id="sidebar-upload-btn"
          onClick={() => {
            onCloseMobile?.();
            onOpenUploadModal?.();
          }}
          className="w-full btn-primary text-xs font-semibold py-2.5 px-3 flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Upload Document</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {PRIMARY_NAV.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              id={`nav-${item.href.replace("/", "") || "home"}`}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
            >
              <span className={isActive ? "text-[#315B46]" : "text-[#69736C]"}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Admin Console Link for Administrators */}
        {isAdmin && (
          <div className="pt-3 mt-3 border-t border-[#F0F2EF]">
            <Link
              href="/admin"
              onClick={onCloseMobile}
              id="nav-admin-console"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100/70 border border-amber-200/60 transition-all"
            >
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
              </svg>
              <span>Admin Console</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Account Footer with Dropdown Menu */}
      <div className="p-3 border-t border-[#E4E8E3] relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          id="sidebar-account-menu-btn"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[#F0F2EF] border border-transparent hover:border-[#E4E8E3] transition-colors text-left"
        >
          <div className="h-8 w-8 rounded-full bg-[#EBF1ED] border border-[#D1E7DC] text-[#315B46] flex items-center justify-center text-xs font-bold shrink-0">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#202522] truncate">
              {user?.full_name || "Account"}
            </p>
            <p className="text-[11px] text-[#69736C] truncate">
              {user?.email || "Signed in"}
            </p>
          </div>
          <svg className={`w-3.5 h-3.5 text-[#69736C] transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl shadow-lg border border-[#E4E8E3] p-1 space-y-1 animate-slide-up z-40">
            <div className="px-3 py-2 border-b border-[#F0F2EF]">
              <p className="text-xs font-bold text-[#202522] truncate">{user?.full_name || "User"}</p>
              <p className="text-[11px] text-[#69736C] truncate">{user?.email}</p>
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#EBF1ED] text-[#315B46]">
                {user?.role === "admin" ? "Administrator" : "Standard Account"}
              </span>
            </div>

            <Link
              href="/settings"
              onClick={() => {
                setMenuOpen(false);
                onCloseMobile?.();
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#202522] hover:bg-[#F0F2EF] rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-[#69736C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.343 3.94c.09-.542.56-.94 1.11-.94h2.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l1.48 1.48a1.125 1.125 0 0 1 .12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v2.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-1.48 1.48a1.125 1.125 0 0 1-1.45.12l-.737-.528c-.35-.25-.807-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-2.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-1.48-1.48a1.125 1.125 0 0 1-.12-1.45l.528-.737c.25-.35.272-.806.107-1.205-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-2.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.855-.108-1.205l-.527-.737a1.125 1.125 0 0 1 .12-1.45l1.48-1.48a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.93l.15-.893Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <span>Preferences & Settings</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              id="sidebar-logout-btn"
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#A83232] hover:bg-[#FBEBEB] rounded-lg transition-colors text-left"
            >
              <svg className="w-4 h-4 text-[#A83232]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
