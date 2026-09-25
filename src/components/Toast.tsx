"use client";

export function ErrorBanner({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
    >
      <span>{message}</span>
      {onDismiss ? (
        <button type="button" className="text-rose-600 hover:underline" onClick={onDismiss}>
          dismiss
        </button>
      ) : null}
    </div>
  );
}
