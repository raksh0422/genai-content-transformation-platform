"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AdminTopNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length <= 1) return "Overview";
    const sub = parts[1];
    return sub.charAt(0).toUpperCase() + sub.slice(1);
  };

  return (
    <header className="h-14 border-b border-[#E4E8E3] bg-white/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#69736C]">
        <Link href="/admin" className="hover:text-[#202522] transition-colors font-semibold text-[#202522]">
          Console
        </Link>
        <svg className="w-3.5 h-3.5 text-[#8C958F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-[#202522] font-bold">{getBreadcrumbs()}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF1ED] border border-[#C5D7CC] text-[11px] font-medium text-[#2E6A4F]">
          <span className="h-2 w-2 rounded-full bg-[#2E6A4F] animate-pulse" />
          <span>Real-Time Audit Stream</span>
        </div>

        <div className="flex items-center gap-2 pl-3 border-l border-[#E4E8E3]">
          <span className="text-xs font-semibold text-[#202522] hidden md:inline">
            {user?.full_name || "Administrator"}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F8F9F7] text-[#315B46] border border-[#E4E8E3]">
            ROOT_ADMIN
          </span>
        </div>
      </div>
    </header>
  );
}
