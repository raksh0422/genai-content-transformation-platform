"use client";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-xl p-6 space-y-4 animate-slide-up">
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary text-sm py-2 px-4"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={destructive ? "btn-danger text-sm py-2 px-4" : "btn-primary text-sm py-2 px-4"}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Deleting...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
