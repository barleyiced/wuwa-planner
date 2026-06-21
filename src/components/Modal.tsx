import { useEffect, type ReactNode } from "react";

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  maxWidthClass = "max-w-3xl",
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-width utility for the dialog (default `max-w-3xl`). */
  maxWidthClass?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto overscroll-contain bg-black/60 p-0 backdrop-blur-sm sm:p-4"
      onMouseDown={onClose}
    >
      <div
        className={`my-0 flex max-h-[100dvh] w-full ${maxWidthClass} flex-col overflow-hidden rounded-t-2xl border border-t-2 border-[var(--color-edge)] border-t-[var(--color-accent)] bg-[var(--color-panel)] shadow-2xl shadow-[0_0_40px_-12px_color-mix(in_oklab,var(--color-accent)_45%,transparent)] sm:my-auto sm:max-h-[90dvh] sm:rounded-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-edge)] bg-gradient-to-b from-[color-mix(in_oklab,var(--color-accent)_8%,transparent)] to-transparent px-5 py-3">
          <div className="min-w-0">
            <h2 className="tech-head truncate text-sm font-bold">{title}</h2>
            {subtitle && <div className="truncate text-xs text-slate-400">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
