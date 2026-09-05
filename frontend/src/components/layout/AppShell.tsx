"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { DocumentUpload } from "../documents/DocumentUpload";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleOpen = () => setUploadModalOpen(true);
    window.addEventListener("open-upload-modal", handleOpen);
    return () => window.removeEventListener("open-upload-modal", handleOpen);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <Sidebar onOpenUploadModal={() => setUploadModalOpen(true)} />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-xl p-6 border border-gray-200 shadow-xl animate-slide-up">
            {/* Close */}
            <button
              type="button"
              id="close-upload-modal"
              onClick={() => setUploadModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-5">
              <h3 className="text-base font-semibold text-gray-900">Upload a document</h3>
              <p className="text-sm text-gray-500 mt-1">
                Supports PDF, DOCX, PPTX, and TXT files up to 50 MB.
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
