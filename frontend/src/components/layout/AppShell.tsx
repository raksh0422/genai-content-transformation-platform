"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { DocumentUpload } from "../documents/DocumentUpload";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleOpen = () => setUploadModalOpen(true);
    window.addEventListener("open-upload-modal", handleOpen);
    return () => window.removeEventListener("open-upload-modal", handleOpen);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isAdminPage = pathname.startsWith("/admin");

  if (isAuthPage || isAdminPage) {
    return <div className="min-h-screen bg-[#09090b] text-zinc-100">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9F7] text-[#202522]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar onOpenUploadModal={() => setUploadModalOpen(true)} />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-64 bg-white h-full shadow-2xl animate-slide-up">
            <Sidebar
              onOpenUploadModal={() => {
                setMobileSidebarOpen(false);
                setUploadModalOpen(true);
              }}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav onToggleMobileSidebar={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 p-5 sm:p-8 max-w-6xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 sm:p-8 border border-[#E4E8E3] shadow-2xl animate-slide-up">
            {/* Close Button */}
            <button
              type="button"
              id="close-upload-modal"
              onClick={() => setUploadModalOpen(false)}
              className="absolute top-5 right-5 text-[#69736C] hover:text-[#202522] transition-colors h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#F0F2EF]"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-[#202522]">Upload a Document</h3>
              <p className="text-xs text-[#69736C] mt-1 leading-relaxed">
                Add source files to your workspace. Supports PDF, Word (DOCX), and Plain Text (TXT) files up to 50 MB.
              </p>
            </div>

            <DocumentUpload
              onUploadSuccess={(doc) => {
                setUploadModalOpen(false);
                router.push(`/documents/${doc.id}`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
