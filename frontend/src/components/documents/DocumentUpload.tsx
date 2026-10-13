"use client";

import { useCallback, useRef, useState } from "react";
import { api, type DocumentUploadResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];

interface DocumentUploadProps {
  onUploadSuccess?: (doc: DocumentUploadResponse) => void;
}

type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setErrorMsg(`Unsupported format. Please upload a PDF, Word (.docx), or Text (.txt) file.`);
        setState("error");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setErrorMsg("File size exceeds the 50 MB limit.");
        setState("error");
        return;
      }

      setState("uploading");
      setErrorMsg(null);
      setProgress(0);

      const timer = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 100);

      try {
        const result = await api.uploadDocument(file);
        clearInterval(timer);
        setProgress(100);
        setState("success");
        setTimeout(() => {
          setState("idle");
          setProgress(0);
        }, 1200);
        onUploadSuccess?.(result);
      } catch (err) {
        clearInterval(timer);
        setErrorMsg(err instanceof Error ? err.message : "Upload failed. Please try again.");
        setState("error");
      }
    },
    [onUploadSuccess]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setState("idle");
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setState("dragging");
  };
  const onDragLeave = () => {
    if (state === "dragging") setState("idle");
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const isActive = state === "dragging";
  const isUploading = state === "uploading";
  const isSuccess = state === "success";
  const isError = state === "error";

  return (
    <div
      id="document-upload-zone"
      role="button"
      tabIndex={0}
      aria-label="Document upload zone. Click or drag and drop a file."
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => !isUploading && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8",
        "min-h-[220px] cursor-pointer transition-all select-none bg-[#FAFAF9]",
        isActive && "border-[#315B46] bg-[#EBF1ED]",
        !isActive && !isError && "border-[#D5DAD3] hover:border-[#315B46] hover:bg-[#F4F6F3]",
        isError && "border-[#A83232] bg-[#FBEBEB]",
        isSuccess && "border-[#2E6A4F] bg-[#E8F3ED]",
        isUploading && "cursor-wait pointer-events-none"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        id="file-input"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        className="sr-only"
        onChange={onInputChange}
        aria-hidden="true"
      />

      {/* Center Icon */}
      <div className="h-12 w-12 rounded-xl bg-white border border-[#E4E8E3] shadow-sm flex items-center justify-center text-[#315B46] transition-transform group-hover:scale-105">
        {isUploading ? (
          <svg className="w-5 h-5 animate-spin text-[#315B46]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : isSuccess ? (
          <svg className="w-6 h-6 text-[#2E6A4F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : isError ? (
          <svg className="w-6 h-6 text-[#A83232]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-[#315B46]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        )}
      </div>

      <div className="text-center space-y-1 z-10 max-w-sm">
        {isUploading ? (
          <>
            <p className="text-sm font-semibold text-[#202522]">Uploading document…</p>
            <p className="text-xs text-[#69736C]">Preparing document for transformation</p>
          </>
        ) : isSuccess ? (
          <>
            <p className="text-sm font-semibold text-[#2E6A4F]">Upload successful</p>
            <p className="text-xs text-[#69736C]">Opening document workspace…</p>
          </>
        ) : isError ? (
          <>
            <p className="text-sm font-semibold text-[#A83232]">Upload could not be completed</p>
            <p className="text-xs text-[#A83232]">{errorMsg}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-[#202522]">
              {isActive ? "Drop your file to upload" : "Drag & drop your file here, or browse"}
            </p>
            <p className="text-xs text-[#69736C]">
              Supports PDF, DOCX, and TXT files up to 50 MB
            </p>
          </>
        )}
      </div>

      {isUploading && (
        <div className="w-full max-w-xs rounded-full bg-[#E4E8E3] h-1.5 overflow-hidden mt-1">
          <div
            className="h-full bg-[#315B46] rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
