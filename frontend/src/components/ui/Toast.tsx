"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onDismiss?: () => void;
}

export function Toast({ message, type = "success", duration = 2500, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss?.(), 300);
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  const bg =
    type === "success"
      ? "bg-gray-900 text-white"
      : type === "error"
      ? "bg-red-600 text-white"
      : "bg-gray-700 text-white";

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${bg} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      {type === "success" && (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      )}
      {message}
    </div>
  );
}

// Toast manager hook
import { useCallback } from "react";
import React from "react";

interface ToastItem {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
}

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = () => (
    <>
      {toasts.map((t, idx) => (
        <div key={t.id} style={{ bottom: `${24 + idx * 56}px` }} className="fixed left-1/2 -translate-x-1/2 z-[100]">
          <Toast message={t.message} type={t.type} onDismiss={() => dismiss(t.id)} />
        </div>
      ))}
    </>
  );

  return { showToast, ToastContainer };
}
