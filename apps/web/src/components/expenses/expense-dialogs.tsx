"use client";

import type { Dispatch, SetStateAction } from "react";
import { AlertCircle, ArrowDownToLine, FileText, LoaderCircle, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DialogShell } from "@/components/expenses/expense-dialog-shell";
import type { BillPreview, Expense } from "@/components/expenses/expense-types";

type ExpenseDialogsProps = {
  discardDialogOpen: boolean;
  setDiscardDialogOpen: Dispatch<SetStateAction<boolean>>;
  discardExpenseFormChanges: () => void;
  detailsOpen: boolean;
  activeExpense: Expense | null;
  activeExpenseUpdatedBy: string;
  closeDetails: () => void;
  billPreview: BillPreview | null;
  setBillPreview: Dispatch<SetStateAction<BillPreview | null>>;
  deleteTarget: Expense | null;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  setDeleteTarget: Dispatch<SetStateAction<Expense | null>>;
  deleting: boolean;
  deleteExpense: () => Promise<void>;
  mobileBillPreviewOpen: boolean;
  setMobileBillPreviewOpen: Dispatch<SetStateAction<boolean>>;
  displayReceiptName: (expense: Expense) => string;
  formatDate: (value?: string | null) => string;
  formatCurrency: (value: number | string) => string;
  formatAuditDateTime: (value?: string | null) => string;
};

export function ExpenseDialogs({
  discardDialogOpen, setDiscardDialogOpen, discardExpenseFormChanges, detailsOpen,
  activeExpense, activeExpenseUpdatedBy, closeDetails, billPreview, setBillPreview,
  deleteTarget, deleteDialogOpen, setDeleteDialogOpen, setDeleteTarget, deleting,
  deleteExpense, mobileBillPreviewOpen, setMobileBillPreviewOpen, displayReceiptName,
  formatDate, formatCurrency, formatAuditDateTime,
}: ExpenseDialogsProps) {
  return (
    <>
<AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
  <AlertDialogContent className="z-[70] w-[calc(100vw-2rem)] max-w-[360px] gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-2xl sm:w-full">
    <div className="flex min-w-0 items-start gap-2.5 p-3 sm:p-3.5">
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive">
        <AlertCircle className="size-4.5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <AlertDialogTitle className="text-sm font-semibold leading-snug tracking-tight text-foreground">
          Discard changes?
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-0.5 text-xs leading-normal text-muted-foreground">
          You have unsaved changes. Do you want to discard them?
        </AlertDialogDescription>
      </div>
    </div>
    <AlertDialogFooter className="flex flex-row items-center justify-end gap-2 border-t border-slate-200/90 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
      <AlertDialogCancel className="h-8 cursor-pointer rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
        Keep editing
      </AlertDialogCancel>
      <AlertDialogAction
        variant="destructive"
        onClick={discardExpenseFormChanges}
        className="h-8 cursor-pointer rounded-full border border-rose-200/90 bg-rose-50 px-3.5 text-xs font-semibold text-rose-600 shadow-2xs transition-colors hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/60 dark:text-rose-400 dark:hover:bg-rose-950/90"
      >
        Discard changes
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* Expense details dialog */}
{detailsOpen && activeExpense ? (
  <DialogShell
    title="Expense details"
    onClose={closeDetails}
    wide
    preserveHeight
  >
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="grid shrink-0 gap-2 md:grid-cols-[minmax(0,1.55fr)_minmax(12rem,0.85fr)]">
          <section className="h-20 min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-muted/20 p-2.5 sm:p-3">
            <p className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Expense date</p>
            <p className="mt-1 text-base font-semibold leading-snug text-primary">{formatDate(activeExpense.expenseDate)}</p>
          </section>
          <section className="flex min-w-0 flex-col justify-center rounded-2xl border border-border/70 bg-muted/20 p-2.5 sm:p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Amount</p>
            <p className="mt-1 font-heading text-2xl font-semibold tracking-tight text-primary">{formatCurrency(activeExpense.amount)}</p>
          </section>
        </div>

        <section className="grid min-w-0 shrink-0 grid-cols-1 items-start gap-x-3 gap-y-1 overflow-hidden rounded-xl border border-border/70 bg-muted/20 px-2.5 py-1.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:px-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:whitespace-nowrap">Category / notes</p>
          <div className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium leading-5 text-muted-foreground">
            {activeExpense.categoryNotes || "—"}
          </div>
        </section>

        <div className="grid shrink-0 gap-2 md:grid-cols-2">
          <section className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 p-2.5 sm:p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Handled By</p>
            <p className="mt-1.5 break-words text-sm font-semibold text-foreground">
              {(activeExpense.sourcingSpecialists || []).map((employee) => employee.displayName).join(", ") || "—"}
            </p>
          </section>
          <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2">
            <div className="min-w-0 rounded-xl border border-border/70 px-2.5 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Updated By</p>
              <p className="mt-1 break-words text-[13px] font-medium text-foreground">{activeExpenseUpdatedBy}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 px-2.5 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Updated At</p>
              <p className="mt-1 whitespace-normal text-[13px] font-medium text-foreground md:whitespace-nowrap">{formatAuditDateTime(activeExpense.updatedAt ?? activeExpense.createdAt)}</p>
            </div>
          </div>
        </div>

        <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/70 p-2 sm:p-2.5">
          <div className="mb-1.5 flex shrink-0 flex-wrap items-center justify-between gap-1.5">
            <h3 className="text-sm font-semibold text-foreground">Attached receipt</h3>
            {billPreview?.expenseId === activeExpense.id ? <a href={billPreview.url} download={billPreview.fileName} className="inline-flex h-8 items-center justify-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"><ArrowDownToLine className="size-3.5" /> Download</a> : null}
          </div>
          {billPreview?.expenseId === activeExpense.id ? (
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/20">
              {billPreview.contentType.startsWith("image/") ? <img src={billPreview.url} alt={`Receipt for expense ${activeExpense.id}`} className="absolute inset-0 m-auto h-auto w-auto max-h-full max-w-full object-contain" /> : billPreview.contentType.includes("pdf") || billPreview.fileName.toLowerCase().endsWith(".pdf") ? <iframe src={billPreview.url} title={`PDF Receipt for expense ${activeExpense.id}`} className="h-full w-full bg-white" /> : <div className="flex flex-col items-center justify-center px-4 py-8 text-center"><FileText className="size-9 text-primary" /><p className="mt-3 text-sm font-medium text-foreground">File ready to download</p><p className="mt-1 text-xs text-muted-foreground">Preview is not available for this file type.</p></div>}
            </div>
          ) : !activeExpense.billFileName ? (
            <div className="flex min-h-24 flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-3 py-5 text-center text-sm text-muted-foreground">No receipt attached</div>
          ) : null}
        </section>
      </div>
  </DialogShell>
) : null}

{deleteTarget ? (
  <AlertDialog
    open={deleteDialogOpen}
    onOpenChange={(open) => {
      if (deleting) return;
      setDeleteDialogOpen(open);
      if (!open) setDeleteTarget(null);
    }}
  >
    <AlertDialogContent className="z-[70] w-[calc(100vw-2rem)] max-w-[360px] gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-2xl sm:w-full">
      <div className="flex min-w-0 items-start gap-2.5 p-3 sm:p-3.5">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive">
          <AlertCircle className="size-4.5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <AlertDialogTitle className="text-sm font-semibold leading-snug tracking-tight text-foreground">
            Delete this expense?
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-0.5 text-xs leading-normal text-muted-foreground">
            This will permanently delete the{" "}
            <span className="font-semibold text-foreground">{formatCurrency(deleteTarget.amount)}</span>{" "}
            expense from {formatDate(deleteTarget.expenseDate)}
            {deleteTarget.billFileName ? ", including its receipt" : ""}. This action cannot be undone.
          </AlertDialogDescription>
        </div>
      </div>
      <AlertDialogFooter className="flex flex-row items-center justify-end gap-2 border-t border-slate-200/90 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
        <AlertDialogCancel
          disabled={deleting}
          className="h-8 cursor-pointer rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={() => void deleteExpense()}
          disabled={deleting}
          className="h-8 cursor-pointer rounded-full border border-rose-200/90 bg-rose-50 px-3.5 text-xs font-semibold text-rose-600 shadow-2xs transition-colors hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/60 dark:text-rose-400 dark:hover:bg-rose-950/90"
        >
          {deleting ? <><LoaderCircle className="mr-1 size-3 animate-spin" />Deleting…</> : "Delete expense"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
) : null}

{/* Mobile Bill Preview overlay (opened when tapping an expense card with a bill) */}
{mobileBillPreviewOpen && (
  <div
    className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-[3px] md:hidden"
    onClick={() => { setMobileBillPreviewOpen(false); }}
  >
    <div
      className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border-t border-border/80 bg-card shadow-2xl animate-in slide-in-from-bottom duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header: title, Download button, Close (X) */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2.5 bg-card/95">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {billPreview?.fileName || (activeExpense ? displayReceiptName(activeExpense) : "Bill preview")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {billPreview?.url ? (
            <a
              href={billPreview.url}
              download={billPreview.fileName}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <ArrowDownToLine className="size-3.5" /> Download
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setMobileBillPreviewOpen(false)}
            aria-label="Close bill preview"
            className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Bill Preview body */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {billPreview?.contentType.startsWith("image/") ? (
          <div className="flex items-center justify-center overflow-hidden rounded-xl bg-muted/20">
            <img src={billPreview.url} alt="Receipt preview" className="max-h-[65dvh] w-full object-contain" />
          </div>
        ) : billPreview?.contentType.includes("pdf") || billPreview?.fileName.toLowerCase().endsWith(".pdf") ? (
          <iframe src={billPreview?.url} title="PDF Receipt preview" className="h-[65dvh] w-full rounded-xl bg-white" />
        ) : (
          <div className="flex flex-col items-center px-3 py-8 text-center">
            <FileText className="size-10 text-primary" />
            <p className="mt-3 text-sm font-semibold text-foreground">File ready to download</p>
            <p className="mt-1 text-xs text-muted-foreground">Preview not available for this format.</p>
          </div>
        )}
      </div>
    </div>
  </div>
)}
    </>
  );
}
