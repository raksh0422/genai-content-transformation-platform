"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface TopNavProps {
  onToggleMobileSidebar?: () => void;
}

export function TopNav({ onToggleMobileSidebar }: TopNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0 || parts[0] === "dashboard") return "Dashboard";
    if (parts[0] === "documents") {
      return parts.length > 1 ? "Document Workspace" : "My Documents";
    }
    if (parts[0] === "settings") return "Settings";
    if (parts[0] === "tools") return "Text Tools";
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  };

  return (
    <header className="h-14 border-b border-[#E4E8E3] bg-white/80 backdrop-blur-md px-5 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Mobile menu button & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            aria-label="Open navigation menu"
            className="md:hidden p-1.5 rounded-lg text-[#69736C] hover:text-[#202522] hover:bg-[#F0F2EF] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
          <Link
            href="/dashboard"
            className="text-[#69736C] hover:text-[#202522] font-semibold transition-colors"
          >
            ContentAI
          </Link>
          <span className="text-[#C5CCC3]">/</span>
          <span className="text-[#202522] font-semibold">{getBreadcrumbs()}</span>
        </nav>
      </div>

      {/* Right controls: User-oriented status indicator */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8F3ED] text-[#2E6A4F] text-xs font-medium border border-[#D1E7DC]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2E6A4F]" />
          <span>Ready to create content</span>
        </div>

        <Link
          href="/settings"
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#F0F2EF] transition-colors group"
          title="Account settings"
        >
          <div className="h-7 w-7 rounded-full bg-[#EBF1ED] border border-[#D1E7DC] text-[#315B46] flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-[#315B46] group-hover:text-white transition-colors">
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="hidden md:inline text-xs font-medium text-[#202522] max-w-[120px] truncate">
            {user?.full_name || "Account"}
          </span>
        </Link>
      </div>
    </header>
  );
}
