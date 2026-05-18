"use client";

import type { ReactNode } from "react";

type StatePanelTone = "loading" | "empty" | "error" | "success";

const toneClasses: Record<StatePanelTone, string> = {
  loading: "border-white/80 bg-white/75 text-ink-700",
  empty: "border-blush-100 bg-blush-50/70 text-ink-700",
  error: "border-blush-200 bg-blush-50 text-blush-700",
  success: "border-mint-100 bg-mint-100/55 text-ink-700",
};

export function StatePanel({
  tone,
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  tone: StatePanelTone;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className={`rounded-3xl border p-5 text-sm leading-7 ${toneClasses[tone]}`}>
      <p className="font-black text-ink-900">{title}</p>
      {description ? <p className="mt-1">{description}</p> : null}
      {children}
      {actionLabel && onAction ? (
        <button
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-full bg-white px-4 font-bold text-ink-900 shadow-sm transition hover:bg-white/80"
          type="button"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
