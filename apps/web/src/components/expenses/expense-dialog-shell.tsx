"use client";

import type { ReactNode } from "react";
import { Receipt, X } from "lucide-react";

export function DialogShell({
  title,
  description,
  onClose,
  children,
  wide = false,
  preserveHeight = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  preserveHeight?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[3px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl ${preserveHeight ? "h-[calc(100dvh-2rem)] max-h-[50rem]" : ""} ${wide ? "sm:max-w-2xl" : "sm:max-w-xl md:max-w-2xl"}`}
      >
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-rose-200/70 bg-gradient-to-r from-rose-50/95 via-pink-50/70 to-rose-50/95 px-3 py-2.5 shadow-2xs backdrop-blur dark:border-rose-900/40 dark:from-rose-950/40 dark:via-pink-950/25 dark:to-rose-950/40 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-rose-200/90 bg-white text-primary shadow-xs dark:border-rose-900/60 dark:bg-card">
              <Receipt className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
              {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-7.5 shrink-0 items-center justify-center rounded-lg border border-rose-200/90 bg-white text-muted-foreground transition hover:bg-rose-100/70 hover:text-foreground dark:border-rose-900/60 dark:bg-card dark:hover:bg-rose-900/40"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className={`min-h-0 flex-1 px-3 py-2.5 ${preserveHeight ? "flex flex-col overflow-hidden" : "overflow-y-auto"}`}>{children}</div>
      </section>
    </div>
  );
}
