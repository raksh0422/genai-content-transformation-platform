"use client";

import { useCallback, useRef, useState } from "react";
import { api, type DocumentUploadResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".txt"];

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
        setErrorMsg(`Unsupported format. Please upload a ${ACCEPTED_EXTENSIONS.join(", ")} file.`);
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
        setProgress((p) => Math.min(p + 8, 88));
      }, 120);

      try {
        const result = await api.uploadDocument(file);
        clearInterval(timer);
        setProgress(100);
        setState("success");
        setTimeout(() => {
          setState("idle");
          setProgress(0);
        }, 1800);
        onUploadSuccess?.(result);
      } catch (err) {
        clearInterval(timer);
        setErrorMsg(err instanceof Error ? err.message : "Upload failed.");
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
        "min-h-[220px] cursor-pointer transition-all select-none bg-slate-50",
        isActive && "border-indigo-500 bg-indigo-50/50",
        !isActive && !isError && "border-slate-300 hover:border-slate-400 hover:bg-slate-100/50",
        isError && "border-red-300 bg-red-50/50",
        isSuccess && "border-emerald-300 bg-emerald-50/50",
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

      <div className="text-center space-y-1 z-10">
        {isUploading ? (
          <>
            <p className="text-sm font-semibold text-gray-900">Uploading document…</p>
            <p className="text-xs text-gray-500">Just a moment</p>
          </>
        ) : isSuccess ? (
          <>
            <p className="text-sm font-semibold text-green-700">Upload successful</p>
            <p className="text-xs text-gray-500">Your document is being prepared</p>
          </>
        ) : isError ? (
          <>
            <p className="text-sm font-semibold text-red-600">Upload failed</p>
            <p className="text-xs text-red-600">{errorMsg}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-900">
              {isActive ? "Drop your file to upload" : "Drag and drop your file here, or click to browse"}
            </p>
            <p className="text-xs text-slate-500">
              Supports PDF, DOCX, PPTX, and TXT files up to 50 MB
            </p>
          </>
        )}
      </div>

      {isUploading && (
        <div className="w-full max-w-xs rounded-full bg-slate-200 h-1.5 overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {!isUploading && !isSuccess && (
        <div className="flex gap-1.5 flex-wrap justify-center z-10 pt-1">
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <span
              key={ext}
              className="saas-badge px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase bg-slate-200/60 border border-slate-300"
            >
              {ext.replace(".", "")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
