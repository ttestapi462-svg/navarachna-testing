"use client";

import { apiClient, getStoredToken } from "@/lib/api-client";
import {
  AlertCircle,
  ArrowDownIcon,
  ArrowDownToLine,
  ArrowUpIcon,
  CalendarDays,
  CheckCircle2,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronsUpDownIcon,
  Eye,
  FileImage,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  UserRoundPlus,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHeaderAction } from "@/context/header-action-context";
import { useAuth } from "@/context/dashboard-auth-context";
import { toast } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTable } from "@tanstack/react-table";
import type { ColumnDef, ExpandedState, PaginationState, SortingState } from "@tanstack/react-table";
import { DataGridTableRowExpand } from "@/components/reui/data-grid/data-grid-table";
import type { DateRange } from "react-day-picker";

type Expense = {
  id: number;
  expenseDate: string;
  amount: number | string;
  categoryNotes: string;
  sourcingSpecialists: SourcingSpecialist[];
  billFileName: string;
  billUrl?: string;
  createdBy?: number | null;
  createdByUsername?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  updatedBy?: number | null;
  updatedByUsername?: string | null;
};

type SourcingSpecialist = { id: number; firstName: string; lastName?: string | null; displayName: string; mobile?: string | null };

type ExpensePageResult = {
  items: Expense[];
  page: number;
  pageSize: number;
  totalCount: number;
};

type ExpenseGridRow =
  | { kind: "date-group"; id: string; expenseDate: string; expenseCount: number; pageSubtotal: number; children: ExpenseGridRow[] }
  | { kind: "expense"; id: string; expenseDate: string; expense: Expense };

type Feedback = { kind: "success" | "error"; message: string };
type ExpenseFormValues = {
  expenseDate: string;
  amount: string;
  categoryNotes: string;
  sourcingSpecialistIds: number[];
  bill?: File | null;
};

type BillPreview = {
  expenseId: number;
  url: string;
  contentType: string;
  fileName: string;
};

type CachedBillPreview = { promise: Promise<BillPreview>; preview?: BillPreview };

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5207").replace(/\/$/, "");
const PAGE_SIZES = [10, 20, 50, 100];
const MAX_BILL_SIZE = 5 * 1024 * 1024;
const ACCEPTED_BILL_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const EMPLOYEE_AVATAR_PALETTES = [
  "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
];

function getEmployeeAvatarColorClass(employee: SourcingSpecialist) {
  let hash = employee.id || 0;
  for (let index = 0; index < employee.displayName.length; index += 1) {
    hash = (hash << 5) - hash + employee.displayName.charCodeAt(index);
  }
  return EMPLOYEE_AVATAR_PALETTES[Math.abs(hash) % EMPLOYEE_AVATAR_PALETTES.length];
}

function getEmployeeInitials(displayName: string) {
  return displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function ExpenseCellTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top"><p className="text-xs">{label}</p></TooltipContent>
    </Tooltip>
  );
}

function cleanStoredReceiptName(fileName: string) {
  if (!fileName) return fileName;
  const extension = fileName.match(/\.[^.]+$/)?.[0]?.toLowerCase();
  return extension ? `receipt${extension}` : "image";
}

function todayLocalIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalIsoDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatAuditDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatCurrency(value: number | string) {
  const amount = Number(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function matchesExpenseSearch(expense: Expense, value: string, originalReceiptName?: string, currentUser?: { id?: number; firstName?: string | null } | null) {
  const term = value.trim().toLowerCase();
  if (!term) return true;
  const wasUpdated = expense.updatedAt != null;
  const actorId = expense.updatedBy ?? expense.createdBy;
  const actorName = wasUpdated
    ? expense.updatedByUsername ?? (actorId != null && actorId === currentUser?.id ? currentUser.firstName : null) ?? (actorId != null ? `#${actorId}` : "—")
    : expense.createdByUsername ?? (actorId != null && actorId === currentUser?.id ? currentUser.firstName : null) ?? (actorId != null ? `#${actorId}` : "—");
  const receiptName = originalReceiptName || expense.billFileName || "";
  const values = [
    expense.expenseDate,
    formatDate(expense.expenseDate),
    String(expense.amount),
    formatCurrency(expense.amount),
    expense.categoryNotes,
    expense.sourcingSpecialists?.map((person) => person.displayName).join(" "),
    receiptName,
    cleanStoredReceiptName(receiptName),
    expense.createdAt,
    formatAuditDateTime(expense.createdAt),
    expense.updatedAt,
    formatAuditDateTime(expense.updatedAt),
    actorName,
  ];
  return values.some((item) => String(item || "").toLowerCase().includes(term));
}

function shortDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(value));
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateMiddle(name: string, maxLen = 22) {
  if (!name || name.length <= maxLen) return name;
  const extIndex = name.lastIndexOf(".");
  const ext = extIndex !== -1 ? name.slice(extIndex) : "";
  const nameWithoutExt = extIndex !== -1 ? name.slice(0, extIndex) : name;
  const keepFront = Math.max(4, maxLen - ext.length - 3);
  return `${nameWithoutExt.slice(0, keepFront)}…${ext}`;
}

function ExpensePagination({
  page,
  pageCount,
  pageSize,
  totalCount,
  loading,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  totalCount: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const siblingPages = 1;
  const visiblePages = siblingPages * 2 + 3;
  const pageButtons: Array<number | { label: string; target: number }> = pageCount <= visiblePages + 2
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : page <= siblingPages + 3
      ? [1, 2, 3, 4, 5, { label: "…", target: visiblePages + 1 }, pageCount]
      : page >= pageCount - siblingPages - 2
        ? [1, { label: "…", target: pageCount - visiblePages }, ...Array.from({ length: visiblePages }, (_, index) => pageCount - visiblePages + index + 1)]
        : [1, { label: "…", target: page - siblingPages - 1 }, ...Array.from({ length: visiblePages - 2 }, (_, index) => page - siblingPages + index), { label: "…", target: page + siblingPages + 1 }, pageCount];

  return (
    <div className="flex grow flex-col flex-wrap items-center justify-between gap-1.5 py-1.5 sm:flex-row sm:py-0">
      <div className="order-2 flex flex-wrap items-center gap-x-2 pb-1.5 sm:order-1 sm:pb-0">
        <div className="text-sm text-muted-foreground">Rows per page</div>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))} disabled={loading}>
          <SelectTrigger aria-label="Rows per page" className="w-fit min-w-16" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start" className="min-w-(--radix-select-trigger-width)">
            {PAGE_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="order-1 flex flex-col items-center justify-center gap-1.5 pt-1.5 sm:order-2 sm:flex-row sm:justify-end sm:pt-0">
        <div className="order-1 text-nowrap text-sm text-muted-foreground sm:order-1">
          {totalCount === 0 ? "No records to show" : `${from} - ${to} of ${totalCount}`}
        </div>
        {totalCount > 0 && (
          <div className="order-2 flex flex-wrap items-center justify-center gap-1 sm:order-2 sm:flex-nowrap">
            <Button size="icon-sm" variant="ghost" className="p-0 text-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || loading} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </Button>
            {pageButtons.map((item, index) => typeof item === "number" ? (
              <Button
                key={`page-${item}`}
                size="sm"
                variant="ghost"
                aria-label={`Go to page ${item}`}
                aria-current={page === item ? "page" : undefined}
                className={`min-w-8 px-1.5 text-sm text-muted-foreground ${page === item ? "bg-accent text-accent-foreground" : ""}`}
                onClick={() => onPageChange(item)}
                disabled={loading}
              >
                {item}
              </Button>
            ) : (
              <Button key={`ellipsis-${index}`} size="icon-sm" variant="ghost" className="p-0 text-sm" aria-label={`Go to page ${item.target}`} onClick={() => onPageChange(item.target)} disabled={loading}>
                {item.label}
              </Button>
            ))}
            <Button size="icon-sm" variant="ghost" className="p-0 text-sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount || loading} aria-label="Next page">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

async function multipartRequest<T>(expenseId: number | null, formData: FormData): Promise<T> {
  const endpoint = expenseId === null ? "/api/expenses" : `/api/expenses/${expenseId}`;
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: expenseId === null ? "POST" : "PUT",
    headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" },
    body: formData,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorBody = (await response.json()) as {
        message?: string;
        detail?: string;
        title?: string;
        errors?: Record<string, string[]>;
      };
      const validationMessage = errorBody.errors
        ? Object.values(errorBody.errors).flat().join(" ")
        : "";
      message = validationMessage || errorBody.message || errorBody.detail || errorBody.title || message;
    } catch {
      // The server may return an empty response or non-JSON error text.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

async function getBillBlob(expenseId: number) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}/api/expenses/${expenseId}/bill`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "No bill was found for this expense." : `Unable to load bill (${response.status}).`);
  }
  return {
    blob: await response.blob(),
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}

function DialogShell({
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

function BillFilePicker({
  existingFileName,
  value,
  onChange,
  onPreviewExisting,
  required,
  error,
}: {
  existingFileName?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  onPreviewExisting?: () => Promise<{ url: string; contentType: string; fileName: string } | null>;
  required: boolean;
  error?: string;
}) {
  const [localError, setLocalError] = useState("");
  const [preview, setPreview] = useState<{ url: string; contentType: string; fileName: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  const validateAndSet = (file: File | null, inputEl: HTMLInputElement | null) => {
    setLocalError("");
    if (file) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!ACCEPTED_BILL_EXTENSIONS.includes(extension) || !file.type.startsWith("image/")) {
        const message = "Choose a JPG, PNG or WEBP image.";
        setLocalError(message);
        toast.warning("Unsupported file type", { description: message });
        if (inputEl) inputEl.value = "";
        onChange(null);
        return;
      }
      if (file.size > MAX_BILL_SIZE) {
        const message = "The image must be 5 MB or smaller.";
        setLocalError(message);
        toast.warning("File size limit exceeded", { description: message });
        if (inputEl) inputEl.value = "";
        onChange(null);
        return;
      }
    }
    onChange(file);
  };

  const handleCameraChange = (event: ChangeEvent<HTMLInputElement>) => {
    validateAndSet(event.target.files?.[0] ?? null, event.target);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    validateAndSet(event.target.files?.[0] ?? null, event.target);
  };

  const hasFile = Boolean(value || existingFileName);
  const activeFileName = cleanStoredReceiptName(value?.name || existingFileName || "");
  const isPdf = activeFileName.toLowerCase().endsWith(".pdf");
  const hasPickerError = Boolean(localError || error);

  const handleView = async () => {
    if (value) {
      setPreview({
        url: URL.createObjectURL(value),
        contentType: value.type || "image/*",
        fileName: activeFileName,
      });
    } else if (onPreviewExisting) {
      setPreviewLoading(true);
      try {
        const existingPreview = await onPreviewExisting();
        if (existingPreview) setPreview(existingPreview);
      } catch (previewError) {
        toast.error("Unable to preview receipt", {
          description: previewError instanceof Error ? previewError.message : "Please try again.",
        });
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const handleRemove = () => {
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLocalError("");
    onChange(null);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        Bill / receipt {required ? <span className="text-primary">*</span> : null}
      </label>

      {/* Hidden inputs for camera and file picker */}
      <input
        ref={cameraInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleCameraChange}
        className="sr-only"
      />
      {hasFile ? (
        <div className={`flex items-center justify-between gap-2 rounded-[12px] border bg-card p-2.5 ${hasPickerError ? "border-destructive ring-2 ring-destructive/20" : "border-border"}`}>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {isPdf ? <FileText className="size-4.5" /> : <FileImage className="size-4.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground" title={activeFileName}>
                {truncateMiddle(activeFileName, 34)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {value ? formatFileSize(value.size) : "Attached receipt"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void handleView()}
              disabled={previewLoading}
              aria-label="View uploaded photo"
              title="View uploaded photo"
              className="flex size-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {previewLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
            </button>
            {value ? (
              <button
                type="button"
                aria-label="Delete uploaded photo"
                title="Delete uploaded photo"
                onClick={handleRemove}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                <UploadCloud className="size-3.5" /> Replace
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            aria-invalid={hasPickerError}
            className={`flex h-10 items-center justify-center gap-2 rounded-[12px] border border-dashed bg-muted/25 px-3 text-xs font-semibold text-foreground transition sm:hidden ${hasPickerError ? "border-destructive ring-2 ring-destructive/20" : "border-border hover:border-primary/60 hover:bg-primary/[0.035] focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
          >
            <FileImage className="size-4 text-primary" /> Take photo
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-invalid={hasPickerError}
            className={`col-span-1 flex h-10 items-center justify-center gap-2 rounded-[12px] border border-dashed bg-muted/25 px-3 text-xs font-semibold text-foreground transition sm:col-span-2 ${hasPickerError ? "border-destructive ring-2 ring-destructive/20" : "border-border hover:border-primary/60 hover:bg-primary/[0.035] focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
          >
            <UploadCloud className="size-4 text-primary" /> Upload a photo
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        name="bill"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        aria-required={required}
        onChange={handleFileChange}
        className="sr-only"
      />

      {preview ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
          <section role="dialog" aria-modal="true" aria-label={`Preview ${preview.fileName}`} className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rose-200/70 bg-gradient-to-r from-rose-50/95 via-pink-50/70 to-rose-50/95 px-3 py-2.5 dark:border-rose-900/40 dark:from-rose-950/40 dark:via-pink-950/25 dark:to-rose-950/40">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground" title={preview.fileName}>{preview.fileName}</p>
              </div>
              <button type="button" onClick={() => setPreview(null)} aria-label="Close receipt preview" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-rose-200/90 bg-white text-muted-foreground transition hover:bg-rose-100/70 hover:text-foreground dark:border-rose-900/60 dark:bg-card dark:hover:bg-rose-900/40">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 overflow-auto bg-muted/20 p-2.5 sm:p-3">
              {preview.contentType.startsWith("image/") ? (
                <img src={preview.url} alt={`Preview of ${preview.fileName}`} className="mx-auto max-h-[70dvh] w-full object-contain" />
              ) : preview.contentType.includes("pdf") || preview.fileName.toLowerCase().endsWith(".pdf") ? (
                <iframe src={preview.url} title={`Preview of ${preview.fileName}`} className="h-[70dvh] w-full rounded-lg bg-white" />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">Preview is not available for this file type.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {localError || error ? <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{localError || error}</p> : null}
    </div>
  );
}

export default function ExpensesPage() {
  const { user: currentUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [totalExpensesAmount, setTotalExpensesAmount] = useState<number | null>(null);
  const [dateSubtotals, setDateSubtotals] = useState<Record<string, number> | null>(null);
  const [draftFromDate, setDraftFromDate] = useState("");
  const [draftToDate, setDraftToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [expenseCalendarMonth, setExpenseCalendarMonth] = useState(() => new Date());
  const [expenseDatePickerOpen, setExpenseDatePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [originalReceiptNames, setOriginalReceiptNames] = useState<Record<number, string>>({});

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const currentPageRef = useRef(1);
  const isInitialBatchLoadedRef = useRef(false);
  const fullExpenseSearchCacheRef = useRef<{ key: string; items?: Expense[]; pending?: Promise<Expense[]> } | null>(null);

  const loadMoreExpenses = useCallback(async () => {
    if (
      loading ||
      loadingMore ||
      loadingMoreRef.current ||
      !isInitialBatchLoadedRef.current ||
      Boolean(search.trim()) ||
      expenses.length >= totalCount ||
      totalCount === 0
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const nextPage = currentPageRef.current + 1;
    const query = new URLSearchParams({ page: String(nextPage), pageSize: String(pageSize) });
    if (fromDate) query.set("fromDate", fromDate);
    if (toDate) query.set("toDate", toDate);

    try {
      // 4-second visible loading delay as requested ("i should see loading symbol upto 4 seconds")
      const [result] = await Promise.all([
        apiClient<ExpensePageResult | Expense[]>(`/api/expenses?${query.toString()}`),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);

      let newItems: Expense[] = [];
      let newTotal = totalCount;
      if (Array.isArray(result)) {
        newItems = result;
        newTotal = result.length;
      } else {
        newItems = Array.isArray(result.items) ? result.items : [];
        newTotal = Number(result.totalCount) || 0;
      }

      setExpenses((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const fresh = newItems.filter((e) => !existingIds.has(e.id));
        return [...prev, ...fresh];
      });
      setTotalCount(newTotal);
      currentPageRef.current = nextPage;
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [apiClient, expenses.length, fromDate, loading, loadingMore, pageSize, search, toDate, totalCount]);

  useEffect(() => {
    const handleAnyScroll = () => {
      if (!isInitialBatchLoadedRef.current) return;
      const el = sentinelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 150) {
        void loadMoreExpenses();
      }
    };

    window.addEventListener("scroll", handleAnyScroll, { passive: true, capture: true });
    window.addEventListener("touchmove", handleAnyScroll, { passive: true });
    window.addEventListener("wheel", handleAnyScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleAnyScroll, { capture: true });
      window.removeEventListener("touchmove", handleAnyScroll);
      window.removeEventListener("wheel", handleAnyScroll);
    };
  }, [loadMoreExpenses]);

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isInitialBatchLoadedRef.current) return;
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (el.scrollTop > 10 && distanceFromBottom < 180) {
      void loadMoreExpenses();
    }
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ExpenseFormValues, string>>>({});
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState<ExpenseFormValues>({
    expenseDate: todayLocalIso(),
    amount: "",
    categoryNotes: "",
    sourcingSpecialistIds: [],
    bill: null,
  });
  const [sourcingSpecialists, setSourcingSpecialists] = useState<SourcingSpecialist[]>([]);
  const [specialistSearch, setSpecialistSearch] = useState("");
  const [specialistPickerOpen, setSpecialistPickerOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<ExpandedState>(true);
  const [groupByDate, setGroupByDate] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);
  const [billPreview, setBillPreview] = useState<BillPreview | null>(null);
  const billRequestsRef = useRef(new Map<number, ReturnType<typeof getBillBlob>>());
  const billPreviewCacheRef = useRef(new Map<number, CachedBillPreview>());

  // Mobile bill preview modal state
  const [mobileBillPreviewOpen, setMobileBillPreviewOpen] = useState(false);

  const displayReceiptName = useCallback((expense: Expense) =>
    cleanStoredReceiptName(originalReceiptNames[expense.id] || expense.billFileName), [originalReceiptNames]);

  // Pull-to-refresh state
  const listRef = useRef<HTMLDivElement>(null);
  const pullStartYRef = useRef(0);
  const [pullDelta, setPullDelta] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const receiptNameStorageKey = `expenses:receipt-original-names:${currentUser?.id ?? "anonymous"}`;

  // Search debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialFormValuesRef = useRef<ExpenseFormValues | null>(null);

  const { setMobileAction } = useHeaderAction();

  useEffect(() => {
    try {
      const storedNames = window.localStorage.getItem(receiptNameStorageKey);
      if (storedNames) setOriginalReceiptNames(JSON.parse(storedNames) as Record<number, string>);
    } catch {
      // Keep the expense list usable if browser storage is unavailable.
    }
  }, [receiptNameStorageKey]);

  useEffect(() => () => {
    for (const entry of billPreviewCacheRef.current.values()) {
      if (entry.preview) URL.revokeObjectURL(entry.preview.url);
      else void entry.promise.then((preview) => URL.revokeObjectURL(preview.url)).catch(() => undefined);
    }
    billPreviewCacheRef.current.clear();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    fullExpenseSearchCacheRef.current = null;
  }, [fromDate, refreshKey, toDate]);

  const fetchAllExpensesForSearch = useCallback(async () => {
    const cacheKey = `${fromDate}|${toDate}`;
    const cached = fullExpenseSearchCacheRef.current;
    if (cached?.key === cacheKey) {
      if (cached.items) return cached.items;
      if (cached.pending) return cached.pending;
    }

    const pending = (async () => {
      const allItems: Expense[] = [];
      let currentPageNumber = 1;
      let resultCount = Number.POSITIVE_INFINITY;
      while ((currentPageNumber - 1) * 100 < resultCount) {
        const query = new URLSearchParams({ page: String(currentPageNumber), pageSize: "100" });
        if (fromDate) query.set("fromDate", fromDate);
        if (toDate) query.set("toDate", toDate);
        const result = await apiClient<ExpensePageResult | Expense[]>(`/api/expenses?${query.toString()}`);
        if (Array.isArray(result)) {
          allItems.push(...result);
          break;
        }
        const items = Array.isArray(result.items) ? result.items : [];
        resultCount = Number(result.totalCount) || 0;
        allItems.push(...items);
        if (items.length < 100) break;
        currentPageNumber += 1;
      }
      return allItems;
    })();
    const cacheEntry = { key: cacheKey, pending };
    fullExpenseSearchCacheRef.current = cacheEntry;
    try {
      const items = await pending;
      if (fullExpenseSearchCacheRef.current === cacheEntry) {
        fullExpenseSearchCacheRef.current = { key: cacheKey, items };
      }
      return items;
    } catch (error) {
      if (fullExpenseSearchCacheRef.current === cacheEntry) fullExpenseSearchCacheRef.current = null;
      throw error;
    }
  }, [apiClient, fromDate, toDate]);

  const loadExpenses = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    currentPageRef.current = 1;
    isInitialBatchLoadedRef.current = false;
    try {
      if (search.trim()) {
        if (showRefresh) fullExpenseSearchCacheRef.current = null;
        const allItems = await fetchAllExpensesForSearch();
        const matchingItems = allItems.filter((expense) => matchesExpenseSearch(
          expense,
          search,
          originalReceiptNames[expense.id],
          currentUser
        ));
        const start = (page - 1) * pageSize;
        const pageItems = matchingItems.slice(start, start + pageSize);
        setExpenses(pageItems);
        setTotalCount(matchingItems.length);
        setTotalExpensesAmount(matchingItems.reduce((sum, expense) => sum + Number(expense.amount || 0), 0));
        setDateSubtotals(matchingItems.reduce<Record<string, number>>((totals, expense) => {
          const date = expense.expenseDate?.slice(0, 10) || "undated";
          totals[date] = (totals[date] || 0) + Number(expense.amount || 0);
          return totals;
        }, {}));
        return;
      }

      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (fromDate) query.set("fromDate", fromDate);
      if (toDate) query.set("toDate", toDate);
      const result = await apiClient<ExpensePageResult | Expense[]>(`/api/expenses?${query.toString()}`);
      if (Array.isArray(result)) {
        setExpenses(result);
        setTotalCount(result.length);
      } else {
        setExpenses(Array.isArray(result.items) ? result.items : []);
        setTotalCount(Number(result.totalCount) || 0);
      }
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Unable to load expenses. Please try again." });
      setExpenses([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setTimeout(() => {
        isInitialBatchLoadedRef.current = true;
      }, 600);
    }
  }, [apiClient, currentUser, fetchAllExpensesForSearch, fromDate, originalReceiptNames, page, pageSize, refreshKey, search, toDate]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    let active = true;
    setTotalExpensesAmount(null);
    setDateSubtotals(null);

    const loadTotalExpensesAmount = async () => {
      const allItems = await fetchAllExpensesForSearch();
      const relevantItems = search.trim()
        ? allItems.filter((expense) => matchesExpenseSearch(expense, search, originalReceiptNames[expense.id], currentUser))
        : allItems;
      let sum = 0;
      const totalsByDate: Record<string, number> = {};
      for (const expense of relevantItems) {
        const amount = Number(expense.amount || 0);
        sum += amount;
        const date = expense.expenseDate?.slice(0, 10) || "undated";
        totalsByDate[date] = (totalsByDate[date] || 0) + amount;
      }

      if (active) {
        setTotalExpensesAmount(sum);
        setDateSubtotals(totalsByDate);
      }
    };

    void loadTotalExpensesAmount().catch(() => {
      if (active) setTotalExpensesAmount(null);
    });

    return () => { active = false; };
  }, [currentUser, fetchAllExpensesForSearch, originalReceiptNames, refreshKey, search]);

  useEffect(() => {
    let mounted = true;
    void apiClient<SourcingSpecialist[]>("/api/expenses/sourcing-specialists")
      .then((employees) => {
        if (mounted) setSourcingSpecialists(Array.isArray(employees) ? employees : []);
      })
      .catch((error) => {
        if (mounted) setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Unable to load employees for Handled By." });
      });
    return () => { mounted = false; };
  }, [apiClient]);

  const openCreateForm = useCallback(() => {
    setEditingExpense(null);
    const initialValues: ExpenseFormValues = { expenseDate: todayLocalIso(), amount: "", categoryNotes: "", sourcingSpecialistIds: [], bill: null };
    initialFormValuesRef.current = initialValues;
    setFormValues(initialValues);
    setSpecialistSearch("");
    setSpecialistPickerOpen(false);
    setFormError("");
    setFieldErrors({});
    setFormOpen(true);
  }, []);

  // Inject Add (+) button into top app bar next to avatar on mobile
  useEffect(() => {
    setMobileAction(
      <button
        type="button"
        onClick={openCreateForm}
        aria-label="Add expense"
        className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <Plus className="size-5" />
      </button>
    );
    return () => setMobileAction(null);
  }, [setMobileAction, openCreateForm]);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPageTotal = expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
  const hasFilters = Boolean(search || fromDate || toDate);
  const toggleDateFilter = () => {
    if (!filtersOpen) {
      setDraftFromDate(fromDate);
      setDraftToDate(toDate);
      const anchor = fromDate || toDate;
      const month = anchor ? new Date(`${anchor}T00:00:00`) : new Date();
      setCalendarMonth(new Date(month.getFullYear(), month.getMonth(), 1));
    }
    setFiltersOpen(!filtersOpen);
  };
  const applyDateRange = () => {
    setFromDate(draftFromDate);
    setToDate(draftToDate);
    setPage(1);
    setFiltersOpen(false);
  };
  const clearDateRange = () => {
    setFromDate("");
    setToDate("");
    setDraftFromDate("");
    setDraftToDate("");
    setPage(1);
    setFiltersOpen(false);
  };
  const cancelDateRange = () => {
    setDraftFromDate(fromDate);
    setDraftToDate(toDate);
    setFiltersOpen(false);
  };
  const formatDateRangeLabel = (start: string, end: string) => {
    const format = (value: string) => {
      const [year, month, day] = value.slice(0, 10).split("-");
      return `${month}/${day}/${year}`;
    };
    if (start && end) return `${format(start)} - ${format(end)}`;
    if (start) return `From ${format(start)}`;
    if (end) return `Until ${format(end)}`;
    return "Date range";
  };
  const draftDateRange = useMemo<DateRange | undefined>(() => {
    const from = draftFromDate ? new Date(`${draftFromDate}T00:00:00`) : undefined;
    const to = draftToDate ? new Date(`${draftToDate}T00:00:00`) : undefined;
    return from || to ? { from, to } : undefined;
  }, [draftFromDate, draftToDate]);
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDraftFromDate(range?.from ? toLocalIsoDate(range.from) : "");
    setDraftToDate(range?.to ? toLocalIsoDate(range.to) : "");
  };
  const expenseCalendarDays = useMemo(() => {
    const first = new Date(expenseCalendarMonth.getFullYear(), expenseCalendarMonth.getMonth(), 1);
    const start = new Date(first); start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  }, [expenseCalendarMonth]);

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense);
    const initialValues: ExpenseFormValues = {
      expenseDate: expense.expenseDate.slice(0, 10),
      amount: String(expense.amount),
      categoryNotes: expense.categoryNotes,
      sourcingSpecialistIds: (expense.sourcingSpecialists || []).map((employee) => employee.id),
      bill: null,
    };
    initialFormValuesRef.current = initialValues;
    setFormValues(initialValues);
    setSpecialistSearch("");
    setSpecialistPickerOpen(false);
    setFormError("");
    setFieldErrors({});
    setFormOpen(true);
  };

  const updateFormField = (field: keyof ExpenseFormValues, value: string | File | number[] | null) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const isExpenseFormDirty = () => {
    const initialValues = initialFormValuesRef.current;
    if (!initialValues) return false;
    return (
      formValues.expenseDate !== initialValues.expenseDate ||
      formValues.amount !== initialValues.amount ||
      formValues.categoryNotes !== initialValues.categoryNotes ||
      formValues.bill !== initialValues.bill ||
      formValues.sourcingSpecialistIds.length !== initialValues.sourcingSpecialistIds.length ||
      formValues.sourcingSpecialistIds.some((id) => !initialValues.sourcingSpecialistIds.includes(id))
    );
  };

  const requestCloseExpenseForm = () => {
    if (saving) return;
    if (isExpenseFormDirty()) {
      setDiscardDialogOpen(true);
      return;
    }
    initialFormValuesRef.current = null;
    setFormOpen(false);
  };

  const discardExpenseFormChanges = () => {
    setDiscardDialogOpen(false);
    setFormOpen(false);
    initialFormValuesRef.current = null;
    setFormError("");
    setFieldErrors({});
  };

  const toggleSourcingSpecialist = (id: number) => {
    const nextIds = formValues.sourcingSpecialistIds.includes(id)
      ? formValues.sourcingSpecialistIds.filter((item) => item !== id)
      : [...formValues.sourcingSpecialistIds, id];
    updateFormField("sourcingSpecialistIds", nextIds);
    setFormError("");
  };

  const submitExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setFieldErrors({});

    const parsedAmount = Number(formValues.amount);
    const validationErrors: Partial<Record<keyof ExpenseFormValues, string>> = {};
    if (!formValues.expenseDate) {
      validationErrors.expenseDate = "Expense date is required. Please choose a date.";
    } else if (formValues.expenseDate > todayLocalIso()) {
      validationErrors.expenseDate = "Expense date must be today or earlier.";
    }
    if (!formValues.amount.trim()) {
      validationErrors.amount = "Amount is required. Please enter the amount.";
    } else if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      validationErrors.amount = "Amount must be greater than ₹0.";
    } else if (parsedAmount > 9999999.99) {
      validationErrors.amount = "Amount cannot exceed ₹99,99,999.99. Please enter a lower amount.";
    } else if (Math.abs(parsedAmount * 100 - Math.round(parsedAmount * 100)) > 1e-8) {
      validationErrors.amount = "Amount can have at most 2 decimal places. Please adjust the value.";
    }
    const categoryNotes = formValues.categoryNotes.trim();
    if (categoryNotes && (categoryNotes.length < 2 || categoryNotes.length > 250)) {
      validationErrors.categoryNotes = "Category / notes must be at least 2 characters, or leave the field blank. Maximum 250 characters.";
    }
    if (formValues.sourcingSpecialistIds.length === 0) {
      validationErrors.sourcingSpecialistIds = "Handled By is required. Please select at least one employee.";
    }
    if (!formValues.bill && !editingExpense?.billFileName) {
      validationErrors.bill = "Receipt is required. Please attach a JPG, PNG, or WEBP image up to 5 MB.";
    }
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      const firstMessage = Object.values(validationErrors)[0] || "Please review the highlighted fields.";
      toast.warning("Please correct the highlighted fields", { description: firstMessage });
      return;
    }

    const data = new FormData();
    data.append("expenseDate", formValues.expenseDate);
    data.append("amount", formValues.amount);
    data.append("categoryNotes", categoryNotes);
    formValues.sourcingSpecialistIds.forEach((id) => data.append("sourcingSpecialistIds", String(id)));
    if (formValues.bill) data.append("bill", formValues.bill);

    setSaving(true);
    try {
      const savedExpense = await multipartRequest<Expense>(editingExpense?.id ?? null, data);
      fullExpenseSearchCacheRef.current = null;
      const matchesCurrentFilters = (expense: Expense) => {
        const expenseDay = expense.expenseDate?.slice(0, 10) || "";
        const searchTerm = search.trim().toLowerCase();
        const searchableValues = [
          expense.categoryNotes,
          expense.expenseDate,
          formatDate(expense.expenseDate),
          String(expense.amount),
          formatCurrency(expense.amount),
          expense.billFileName,
          cleanStoredReceiptName(originalReceiptNames[expense.id] || expense.billFileName),
          expense.sourcingSpecialists?.map((person) => person.displayName).join(" "),
          expense.createdByUsername,
          expense.updatedByUsername,
          expense.createdBy,
          expense.updatedBy,
        ].filter(Boolean).join(" ").toLowerCase();
        return (!fromDate || expenseDay >= fromDate)
          && (!toDate || expenseDay <= toDate)
          && (!searchTerm || searchableValues.includes(searchTerm));
      };
      if (formValues.bill?.name) {
        const cachedPreview = billPreviewCacheRef.current.get(savedExpense.id)?.preview;
        if (cachedPreview) URL.revokeObjectURL(cachedPreview.url);
        billPreviewCacheRef.current.delete(savedExpense.id);
        billRequestsRef.current.delete(savedExpense.id);
        const nextNames = { ...originalReceiptNames, [savedExpense.id]: formValues.bill.name };
        setOriginalReceiptNames(nextNames);
        try {
          window.localStorage.setItem(receiptNameStorageKey, JSON.stringify(nextNames));
        } catch {
          // Preserve the name for the current page session if storage is unavailable.
        }
      }
      const wasInCurrentResults = Boolean(editingExpense && matchesCurrentFilters(editingExpense));
      const isInCurrentResults = matchesCurrentFilters(savedExpense);
      if (page === 1) {
        setExpenses((current) => {
          const next = current.filter((expense) => expense.id !== savedExpense.id);
          if (isInCurrentResults) next.push(savedExpense);
          return next
            .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate) || (b.createdAt || "").localeCompare(a.createdAt || ""))
            .slice(0, pageSize);
        });
        setTotalCount((current) => Math.max(0, current + Number(isInCurrentResults) - Number(wasInCurrentResults)));
      } else {
        setPage(1);
      }
      setFormOpen(false);
      initialFormValuesRef.current = null;
      setFeedback({ kind: "success", message: editingExpense ? "Expense updated successfully." : "Expense added successfully." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save this expense. Please try again.";
      setFormError(message);
      toast.error("Unable to save expense", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const openDetails = (expense: Expense) => {
    setActiveExpense(expense);
    setDetailsOpen(true);
    const cachedPreview = billPreviewCacheRef.current.get(expense.id)?.preview;
    setBillPreview(cachedPreview || null);
    if (expense.billFileName && !cachedPreview) void viewBill(expense);
  };

  const loadBill = useCallback((expenseId: number) => {
    const cachedRequest = billRequestsRef.current.get(expenseId);
    if (cachedRequest) return cachedRequest;

    const request = getBillBlob(expenseId);
    billRequestsRef.current.set(expenseId, request);
    void request.catch(() => {
      if (billRequestsRef.current.get(expenseId) === request) billRequestsRef.current.delete(expenseId);
    });
    return request;
  }, []);

  const prefetchBill = useCallback((expense: Expense) => {
    if (!expense.billFileName) return;
    const cached = billPreviewCacheRef.current.get(expense.id);
    if (cached) return;
    const entry: CachedBillPreview = {
      promise: loadBill(expense.id).then((bill) => ({
        expenseId: expense.id,
        url: URL.createObjectURL(bill.blob),
        contentType: bill.contentType,
        fileName: displayReceiptName(expense) || `expense-${expense.id}-bill`,
      })),
    };
    billPreviewCacheRef.current.set(expense.id, entry);
    void entry.promise.then((preview) => {
      if (billPreviewCacheRef.current.get(expense.id) === entry) entry.preview = preview;
    }).catch(() => {
      if (billPreviewCacheRef.current.get(expense.id) === entry) billPreviewCacheRef.current.delete(expense.id);
    });
  }, [displayReceiptName, loadBill]);

  const viewBill = useCallback(async (expense: Expense) => {
    try {
      prefetchBill(expense);
      const cached = billPreviewCacheRef.current.get(expense.id);
      if (!cached) return;
      const preview = cached.preview || await cached.promise;
      if (!cached.preview) cached.preview = preview;
      billRequestsRef.current.delete(expense.id);
      setBillPreview(preview);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Unable to open this bill." });
    }
  }, [prefetchBill]);

  useEffect(() => {
    expenses.slice(0, Math.min(pageSize, 10)).forEach(prefetchBill);
  }, [expenses, pageSize, prefetchBill]);

  const requestDeleteExpense = (expense: Expense) => {
    setDeleteTarget(expense);
    setDeleteDialogOpen(true);
  };

  const deleteExpense = async () => {
    if (!deleteTarget) return;
    const expense = deleteTarget;
    setDeleting(true);
    setFeedback(null);
    try {
      await apiClient(`/api/expenses/${expense.id}`, { method: "DELETE" });
      fullExpenseSearchCacheRef.current = null;
      const cachedPreview = billPreviewCacheRef.current.get(expense.id)?.preview;
      if (cachedPreview) URL.revokeObjectURL(cachedPreview.url);
      billPreviewCacheRef.current.delete(expense.id);
      billRequestsRef.current.delete(expense.id);
      setFeedback({ kind: "success", message: "Expense deleted successfully." });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      if (expenses.length === 1 && page > 1) setPage((current) => current - 1);
      else setRefreshKey((key) => key + 1);
      if (activeExpense?.id === expense.id) {
        setDetailsOpen(false);
        setBillPreview(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete this expense.";
      setFeedback({ kind: "error", message });
      toast.error("Unable to delete expense", { description: message });
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput("");
    setSearch("");
    setFromDate("");
    setToDate("");
    setPage(1);
    setFiltersOpen(false);
  };

  // Search input handler with 300ms debounce
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value.trim());
      setPage(1);
    }, 300);
  };

  // Immediate search on Enter key
  const applySearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPage(1);
    setSearch(searchInput.trim());
  };


  // Pull-to-refresh touch handlers on list container
  const handleTouchStart = (e: React.TouchEvent) => {
    if (listRef.current && listRef.current.scrollTop <= 0) {
      pullStartYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    } else {
      setIsPulling(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const delta = e.touches[0].clientY - pullStartYRef.current;
    if (delta > 0 && listRef.current && listRef.current.scrollTop <= 0) {
      setPullDelta(Math.min(delta * 0.45, 80));
    } else {
      setIsPulling(false);
      setPullDelta(0);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDelta >= 70) {
      setPullDelta(0);
      setIsPulling(false);
      try {
        await loadExpenses(true);
      } catch {
        setFeedback({ kind: "error", message: "Refresh failed. Please try again." });
      }
    } else {
      setPullDelta(0);
      setIsPulling(false);
    }
  };

  const gridRows = useMemo<ExpenseGridRow[]>(() => {
    if (!groupByDate) {
      return expenses.map((expense) => ({
        kind: "expense" as const,
        id: `expense:${expense.id}`,
        expenseDate: expense.expenseDate,
        expense,
      }));
    }

    const groups = new Map<string, Expense[]>();
    for (const expense of expenses) {
      const date = expense.expenseDate?.slice(0, 10) || "undated";
      groups.set(date, [...(groups.get(date) || []), expense]);
    }
    return Array.from(groups, ([date, items]) => ({
      kind: "date-group" as const,
      id: `group:${date}`,
      expenseDate: date,
      expenseCount: items.length,
      pageSubtotal: items.reduce((total, expense) => total + Number(expense.amount || 0), 0),
      children: items.map((expense) => ({
        kind: "expense" as const,
        id: `expense:${expense.id}`,
        expenseDate: expense.expenseDate,
        expense,
      })),
    }));
  }, [expenses, groupByDate]);

  // Date groups should open when a page of expenses is loaded so the table
  // immediately shows the records users came to review. Users can still
  // collapse individual dates; this only runs when the underlying page data changes.
  useEffect(() => {
    if (!groupByDate) {
      setExpandedRows({});
      return;
    }
    setExpandedRows(Object.fromEntries(
      gridRows.filter((row) => row.kind === "date-group").map((row) => [row.id, true])
    ));
  }, [gridRows, groupByDate]);

  const columns = useMemo<ColumnDef<DataGridFeatures, ExpenseGridRow>[]>(
    () => [
      {
        accessorFn: (item) => item.expenseDate,
        id: "expenseDate",
        header: ({ column }) => (
          <Tooltip>
            <DropdownMenu>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button type="button" aria-label="Date column options" className="-ms-2 inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-left text-xs font-semibold text-foreground/80 transition hover:bg-secondary data-[state=open]:bg-secondary">
                    Date
                    {column.getIsSorted() === "asc" ? <ArrowUpIcon className="size-3.25" aria-hidden="true" /> : column.getIsSorted() === "desc" ? <ArrowDownIcon className="size-3.25" aria-hidden="true" /> : <ChevronsUpDownIcon className="size-3.5 opacity-60" aria-hidden="true" />}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <DropdownMenuContent align="start" className="w-44 rounded-xl border border-border/60 bg-popover shadow-lg">
                <DropdownMenuItem onSelect={() => column.toggleSorting(false)} className="cursor-pointer text-xs">Sort oldest first</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => column.toggleSorting(true)} className="cursor-pointer text-xs">Sort newest first</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={groupByDate ? "date" : "none"} onValueChange={(value) => setGroupByDate(value === "date")}>
                  <DropdownMenuRadioItem value="date" className="cursor-pointer text-xs">Group by date</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="none" className="cursor-pointer text-xs">Ungroup</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipContent side="top"><p className="text-xs">Date options</p></TooltipContent>
          </Tooltip>
        ),
        cell: ({ row }) => row.original.kind === "date-group" ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <DataGridTableRowExpand row={row} indent={0}>
              <ChevronDown className="size-3.5 transition-transform in-aria-[expanded=false]:-rotate-90" />
            </DataGridTableRowExpand>
            <span className="shrink-0 whitespace-nowrap text-left text-xs font-semibold text-foreground">{row.original.expenseDate === "undated" ? "Undated expenses" : formatDate(row.original.expenseDate)}</span>
            <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">{row.original.expenseCount} {row.original.expenseCount === 1 ? "expense" : "expenses"}</span>
          </div>
        ) : groupByDate ? null : (
          <span className="block whitespace-nowrap text-left text-xs text-muted-foreground">{formatDate(row.original.expenseDate)}</span>
        ),
        meta: { skeleton: <Skeleton className="mx-auto h-3.5 w-20 rounded-md" /> },
        size: 140,
        enableSorting: true,
      },
      {
        accessorFn: (item) => item.kind === "date-group" ? dateSubtotals?.[item.expenseDate] ?? item.pageSubtotal : Number(item.expense.amount),
        id: "amount",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Amount" className="w-full justify-end text-right text-xs font-semibold text-foreground/80" />
        ),
        cell: ({ row }) => row.original.kind === "date-group" ? (
          <ExpenseCellTooltip label="Subtotal for all matching expenses on this date"><div className="flex flex-col items-end justify-center gap-0.5 text-right">
            <span className="whitespace-nowrap text-[10px] text-primary/80">Date subtotal</span>
            <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-primary">{dateSubtotals ? formatCurrency(dateSubtotals[row.original.expenseDate] || 0) : "—"}</span>
          </div></ExpenseCellTooltip>
        ) : <span className="block whitespace-nowrap text-right text-xs font-semibold tabular-nums text-foreground">{formatCurrency(row.original.expense.amount)}</span>,
        meta: { skeleton: <Skeleton className="mx-auto h-3.5 w-16 rounded-md" /> },
        size: 130,
        enableSorting: true,
      },
      {
        id: "handledBy",
        accessorFn: (item) => item.kind === "expense" ? item.expense.sourcingSpecialists.map((person) => person.displayName).join(", ") : "",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Handled By" className="w-full justify-start text-left text-xs font-semibold text-foreground/80" />
        ),
        cell: ({ row }) => {
          if (row.original.kind !== "expense") return null;
          const expense = row.original.expense;
          const specialists = expense.sourcingSpecialists || [];
          const name = specialists.map((person) => person.displayName).join(", ") || "Unassigned";
          const visibleSpecialists = specialists.slice(0, 2);
          const additionalCount = Math.max(0, specialists.length - visibleSpecialists.length);
          return (
            <div className="flex min-w-0 items-center gap-1.5 py-0.5">
              {visibleSpecialists.length ? visibleSpecialists.map((specialist) => <ExpenseCellTooltip key={specialist.id} label={specialist.displayName}><Avatar className="size-7 shrink-0">
                <AvatarFallback className={`text-[10px] font-bold ${getEmployeeAvatarColorClass(specialist)}`}>{getEmployeeInitials(specialist.displayName)}</AvatarFallback>
              </Avatar></ExpenseCellTooltip>) : <span className="text-xs text-muted-foreground">—</span>}
              {additionalCount > 0 ? <ExpenseCellTooltip label={specialists.slice(2).map((person) => person.displayName).join(", ")}><span aria-label={`${additionalCount} additional employees`} className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold leading-none text-primary">+{additionalCount}</span></ExpenseCellTooltip> : null}
            </div>
          );
        },
        meta: {
          skeleton: <Skeleton className="h-3.5 w-32 rounded-md" />,
        },
        size: 105,
        enableSorting: false,
      },
      {
        accessorFn: (item) => item.kind === "expense" ? item.expense.billFileName : "",
        id: "receipt",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Receipt" className="w-full justify-start text-left text-xs font-semibold text-foreground/80" />
        ),
        cell: ({ row }) => {
          if (row.original.kind !== "expense") return null;
          const expense = row.original.expense;
          return (
            <div className="flex min-w-0 justify-start pr-3">
            <ExpenseCellTooltip label={originalReceiptNames[expense.id] || expense.billFileName || "No receipt attached"}><div className="inline-flex w-fit max-w-full min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground">
              {expense.billFileName?.toLowerCase().endsWith(".pdf") ? <FileText className="size-3.5 shrink-0" /> : <FileImage className="size-3.5 shrink-0" />}
              <span className="min-w-0 truncate">{displayReceiptName(expense) || "View bill"}</span>
            </div></ExpenseCellTooltip>
            </div>
          );
        },
        meta: { skeleton: <Skeleton className="mx-auto h-7 w-32 rounded-lg" /> },
        size: 150,
        enableSorting: false,
      },
      {
        accessorFn: (item) => item.kind === "expense" ? item.expense.updatedAt ?? item.expense.createdAt : item.expenseDate,
        id: "updatedAt",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Updated At" className="w-full justify-start text-left text-xs font-semibold text-foreground/80" />
        ),
        cell: ({ row }) => {
          if (row.original.kind !== "expense") return null;
          const expense = row.original.expense;
          const isUpdated = expense.updatedAt != null;
          return (
            <ExpenseCellTooltip label={isUpdated ? "Last updated timestamp" : "No updates yet — showing created timestamp"}><span className="inline-block whitespace-nowrap text-left text-xs text-muted-foreground">
              {formatAuditDateTime(expense.updatedAt ?? expense.createdAt)}
            </span></ExpenseCellTooltip>
          );
        },
        meta: { skeleton: <Skeleton className="h-3.5 w-28 rounded-md" /> },
        size: 175,
        enableSorting: true,
      },
      {
        accessorFn: (item) => item.kind === "expense" ? item.expense.updatedBy ?? item.expense.createdBy : "",
        id: "updatedBy",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Updated By" className="w-full justify-start text-left text-xs font-semibold text-foreground/80" />
        ),
        cell: ({ row }) => {
          if (row.original.kind !== "expense") return null;
          const expense = row.original.expense;
          const isUpdated = expense.updatedBy != null;
          const actorId = expense.updatedBy ?? expense.createdBy;
          const currentActorName = actorId != null && actorId === currentUser?.id
            ? currentUser.firstName
            : null;
          const actorName = isUpdated
            ? expense.updatedByUsername ?? currentActorName ?? (actorId != null ? `#${actorId}` : "—")
            : expense.createdByUsername ?? currentActorName ?? (actorId != null ? `#${actorId}` : "—");
          return (
            <ExpenseCellTooltip label={isUpdated ? "Last updated by" : "No updates yet — showing created by"}><span className="inline-block max-w-[130px] truncate text-left text-xs text-muted-foreground">
              {actorName}
            </span></ExpenseCellTooltip>
          );
        },
        meta: { skeleton: <Skeleton className="h-3.5 w-16 rounded-md" /> },
        size: 135,
        enableSorting: true,
      },
      {
        id: "actions",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title="Actions" className="w-full justify-center text-center text-xs font-semibold text-foreground/80" />
        ),
        cell: ({ row }) => {
          if (row.original.kind !== "expense") return null;
          const expense = row.original.expense;
          return (
            <div className="flex items-center justify-center gap-1">
              <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => openEditForm(expense)} aria-label="Edit expense" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"><Pencil className="size-4" /></button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Edit expense</p></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button type="button" onPointerEnter={() => prefetchBill(expense)} onFocus={() => prefetchBill(expense)} onClick={() => openDetails(expense)} aria-label="View expense details" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"><Eye className="size-4" /></button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">View details</p></TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => requestDeleteExpense(expense)} aria-label="Delete expense" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Delete expense</p></TooltipContent></Tooltip>
            </div>
          );
        },
        meta: { skeleton: <Skeleton className="mx-auto h-7 w-20 rounded-md" /> },
        size: 105,
        enableSorting: false,
      },
    ],
    [currentUser?.firstName, currentUser?.id, dateSubtotals, displayReceiptName, groupByDate, openDetails, openEditForm, originalReceiptNames, prefetchBill, requestDeleteExpense]
  );

  const tablePagination: PaginationState = { pageIndex: page - 1, pageSize };
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: gridRows,
    pageCount,
    rowCount: totalCount,
    getRowId: (item) => item.id,
    getSubRows: (item) => item.kind === "date-group" ? item.children : undefined,
    autoResetExpanded: false,
    state: { pagination: tablePagination, sorting, expanded: expandedRows },
    onSortingChange: setSorting,
    onExpandedChange: setExpandedRows,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(tablePagination) : updater;
      setPage(next.pageIndex + 1);
      if (next.pageSize !== pageSize) setPageSize(next.pageSize);
    },
    manualPagination: true,
  });

  const activeExpenseUpdatedBy = activeExpense ? (() => {
    const isUpdatedBy = activeExpense.updatedBy != null;
    const actorId = activeExpense.updatedBy ?? activeExpense.createdBy;
    const actorName = isUpdatedBy ? activeExpense.updatedByUsername : activeExpense.createdByUsername;
    return actorName
      ?? (actorId != null && actorId === currentUser?.id ? currentUser?.firstName : null)
      ?? (actorId != null ? `#${actorId}` : "—");
  })() : "—";

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 h-full gap-2.5 pb-1 sm:gap-3">
      {feedback ? (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live={feedback.kind === "error" ? "assertive" : "polite"}
          className={`fixed right-4 top-[4.25rem] z-[60] flex w-[min(26rem,calc(100vw-2rem))] items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-1 ${feedback.kind === "success" ? "border-emerald-500/25 bg-background/95 text-emerald-700 dark:text-emerald-300" : "border-destructive/25 bg-background/95 text-destructive"}`}
        >
          {feedback.kind === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
          <p className="flex-1 leading-relaxed">{feedback.message}</p>
          <button type="button" className="rounded-md p-0.5 opacity-70 hover:opacity-100" onClick={() => setFeedback(null)} aria-label="Dismiss message"><X className="size-3.5" /></button>
        </div>
      ) : null}

      {/* Main card section */}
      <section className="relative w-full flex-1 min-h-0 rounded-xl border border-border/70 bg-card p-3 sm:p-3.5 shadow-2xs flex flex-col gap-2.5">
        {/* Desktop search header */}
        <div className="hidden shrink-0 flex-wrap items-center justify-between gap-2 sm:gap-2.5 md:flex">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
          <form onSubmit={applySearch} className="relative w-48 sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search expenses..."
                aria-label="Search expenses"
                className="h-8 appearance-none rounded-lg border-border/70 bg-background pl-8 pr-7 text-xs [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />
              {searchInput ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              ) : null}
          </form>
          <button
            type="button"
            onClick={toggleDateFilter}
            aria-expanded={filtersOpen}
            title={fromDate && toDate ? `${shortDate(fromDate)} – ${shortDate(toDate)}` : undefined}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${filtersOpen || fromDate || toDate ? "border-primary/30 bg-primary/10 text-primary" : "border-border/70 bg-background text-muted-foreground hover:bg-muted/60"}`}
          >
            <CalendarDays className="size-3.5" /> {formatDateRangeLabel(fromDate, toDate)}
            {(fromDate || toDate) ? <span className="size-1.5 rounded-full bg-primary" /> : null}
          </button>
          {fromDate || toDate ? (
            <button type="button" onClick={clearDateRange} aria-label="Clear date range" className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              <X className="size-3.5" />
            </button>
          ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => void loadExpenses(true)} disabled={loading || refreshing} className="h-8 cursor-pointer gap-1.5 rounded-lg border-border/70 px-2.5 text-xs font-medium hover:bg-muted/60">
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} /> <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={openCreateForm} className="h-8 cursor-pointer gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-xs transition-transform hover:bg-primary/90 active:scale-95">
              <Plus className="size-3.5" /> Add expense
            </Button>
          </div>
        </div>

        {/* Mobile Search Row (44px tall, sitting directly under app bar with 8px gap) */}
        <div className="flex flex-col gap-2 md:hidden">
          <div className="flex items-center gap-2">
          <form onSubmit={applySearch} className="flex min-w-0 flex-1 items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchInput}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search expenses..."
                aria-label="Search expenses"
                className="h-8 w-full appearance-none rounded-lg border border-border/70 bg-background pl-8 pr-8 text-xs outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:ring-2 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />
              {searchInput ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </label>
            {/* Calendar icon button (44px visual and tap, opens date sheet) */}
            <button
              type="button"
              onClick={toggleDateFilter}
              aria-label={formatDateRangeLabel(fromDate, toDate)}
              title={fromDate && toDate ? `${shortDate(fromDate)} – ${shortDate(toDate)}` : undefined}
              className={`relative flex h-8 min-w-8 max-w-full shrink items-center justify-center gap-1.5 rounded-lg border px-2 transition ${fromDate || toDate ? "border-primary/40 bg-primary/10 text-primary" : "border-border/70 bg-background text-muted-foreground hover:bg-muted/60"}`}
            >
              <CalendarDays className="size-3.5" />
              {(fromDate || toDate) ? <span className="truncate text-[10px] font-medium">{formatDateRangeLabel(fromDate, toDate)}</span> : null}
              {(fromDate || toDate) ? (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
              ) : null}
            </button>
            {fromDate || toDate ? (
              <button type="button" onClick={clearDateRange} aria-label="Clear date range" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-3.5" />
              </button>
            ) : null}
          </form>
          <Button variant="outline" size="icon-sm" type="button" onClick={() => void loadExpenses(true)} disabled={loading || refreshing} className="size-8 shrink-0 cursor-pointer rounded-lg border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground" aria-label="Refresh expenses">
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
          </Button>
          </div>

        </div>

        {/* Desktop Filter chips row */}
        {search ? <div className="hidden flex-wrap items-center gap-2 md:flex">
          {search ? <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-xs text-foreground">Search: “{search}”</span> : null}
          <button type="button" onClick={clearFilters} className="ml-auto text-xs font-semibold text-primary hover:underline">Clear all</button>
        </div> : null}

        {/* Date filter sheet / modal */}
        {filtersOpen ? (
          <div className="absolute left-0 top-12 z-50 w-[min(24rem,calc(100%-1.5rem))] md:left-[14.25rem] md:top-[2.625rem] md:w-[40rem]">
            <div className="p-2 md:hidden">
              <div className="rounded-xl border border-border/80 bg-background shadow-lg">
                <Calendar
                  mode="range"
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  numberOfMonths={1}
                  fixedWeeks
                  selected={draftDateRange}
                  onSelect={handleDateRangeSelect}
                  disabled={{ after: new Date() }}
                  className="w-full"
                />
                <div className="flex justify-end gap-2 border-t border-border/70 px-3 py-2.5">
                  <button type="button" onClick={cancelDateRange} className="h-8 rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted">Cancel</button>
                  <button type="button" disabled={!draftFromDate || !draftToDate} onClick={applyDateRange} className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">Apply</button>
                </div>
              </div>
            </div>
            <div className="hidden p-2 md:block">
              <div className="w-full rounded-xl border border-border/80 bg-background shadow-lg">
                <Calendar
                  mode="range"
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  numberOfMonths={2}
                  fixedWeeks
                  selected={draftDateRange}
                  onSelect={handleDateRangeSelect}
                  disabled={{ after: new Date() }}
                  className="w-full [--cell-size:2.25rem]"
                />
                <div className="flex justify-end gap-2 border-t border-border/70 px-4 py-2.5">
                  <button type="button" onClick={cancelDateRange} className="h-8 rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted">Cancel</button>
                  <button type="button" disabled={!draftFromDate || !draftToDate} onClick={applyDateRange} className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">Apply</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Desktop grid fills the expense card like Employee List; rows scroll inside the table viewport. */}
        <div className="hidden min-h-0 flex-1 md:flex md:flex-col">
          <DataGrid
            table={table}
            recordCount={totalCount}
            isLoading={loading}
            loadingMode="skeleton"
            tableLayout={{ dense: true, rowBorder: true, stripped: true, rowRounded: false, headerSticky: true }}
            tableClassNames={{
              base: "w-full min-w-full",
              headerSticky: "sticky top-0 z-20 bg-muted",
              bodyRow: "[&[data-row-id^='group:']]:!bg-muted/70 [&[data-row-id^='group:']>td]:border-y-4 [&[data-row-id^='group:']>td]:border-white",
            }}
            emptyMessage={<EmptyState hasFilters={hasFilters} onClear={clearFilters} />}
          >
            <div className="w-full flex-1 min-h-0 flex flex-col justify-between">
              <DataGridContainer className="w-full flex-1 min-h-0 overflow-hidden flex flex-col">
                <DataGridScrollArea className="w-full flex-1 min-h-0">
                  <DataGridTable />
                </DataGridScrollArea>
              </DataGridContainer>
              <div className="shrink-0 grid grid-cols-[140fr_130fr_105fr_150fr_175fr_135fr_105fr] items-center border-t border-border/50 px-1 py-2 text-xs">
                <span />
                <span className="flex min-w-0 items-baseline justify-end gap-1.5 pr-2 text-right text-muted-foreground">
                  <span className="whitespace-nowrap">Current page total</span>
                  <strong className="whitespace-nowrap font-semibold tabular-nums text-primary">{formatCurrency(currentPageTotal)}</strong>
                </span>
                <span /><span /><span /><span />
                <span className="flex min-w-0 items-baseline justify-end gap-1.5 text-right text-muted-foreground">
                  <span className="whitespace-nowrap">Total expenses</span>
                  <strong aria-live="polite" className="whitespace-nowrap font-semibold tabular-nums text-primary">{totalExpensesAmount === null ? "—" : formatCurrency(totalExpensesAmount)}</strong>
                </span>
              </div>
              <div className="shrink-0 pt-1.5 mt-auto">
                <DataGridPagination sizes={[10, 20, 50, 100]} />
              </div>
            </div>
          </DataGrid>
        </div>

        {/* Mobile View ONLY (Inner scroll container with pull-to-refresh & compact cards) */}
        <div className="flex min-h-0 flex-1 flex-col md:hidden">
          {/* Pull-to-refresh spinner indicator */}
          {pullDelta > 0 ? (
            <div
              className="flex items-center justify-center overflow-hidden transition-all duration-100 ease-out"
              style={{ height: pullDelta }}
            >
              <LoaderCircle className="size-5 animate-spin text-primary" />
            </div>
          ) : null}
          {refreshing && pullDelta === 0 ? (
            <div className="flex items-center justify-center py-2">
              <LoaderCircle className="size-5 animate-spin text-primary" />
            </div>
          ) : null}

          {/* Inner scroll container: blocks native pull-to-refresh via overscroll-contain */}
          <div
            ref={listRef}
            className="min-h-0 max-h-[calc(100dvh-11.5rem)] flex-1 overflow-y-auto overscroll-y-contain px-2.5 pb-3 sm:px-3 md:max-h-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => void handleTouchEnd()}
            onScroll={handleMobileScroll}
          >
            {loading ? (
              <div className="flex flex-col gap-1.5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`mobile-loading-${index}`} className="h-[68px] animate-pulse rounded-[16px] bg-muted/70" />
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="py-8 text-center">
                <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {expenses.map((expense) => (
                  <article
                    key={expense.id}
                    onClick={() => void openDetails(expense)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void openDetails(expense);
                      }
                    }}
                    aria-label={`View expense for ${(expense.sourcingSpecialists || []).map((employee) => employee.displayName).join(", ") || "unassigned specialist"}, ${formatCurrency(expense.amount)}`}
                    className="group flex min-h-[68px] w-full cursor-pointer flex-col justify-between rounded-xl border border-border/70 bg-card p-2.5 shadow-2xs transition hover:border-primary/25 hover:shadow-xs active:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                        <CalendarDays className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate text-xs font-medium">
                          {formatDate(expense.expenseDate)}
                        </span>
                      </div>
                      <span className="shrink-0 text-right text-sm font-semibold leading-tight tabular-nums text-foreground">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Receipt className="size-3.5" />
                        </span>
                        <div className="flex min-w-0 items-center gap-1.5" title={expense.sourcingSpecialists?.map((employee) => employee.displayName).join(", ") || "Unassigned"}>
                          <span className="min-w-0 truncate text-xs font-semibold text-foreground">{expense.sourcingSpecialists?.[0]?.displayName || "Unassigned"}</span>
                          {(expense.sourcingSpecialists?.length || 0) > 1 && (
                            <span aria-label={`${expense.sourcingSpecialists.length - 1} additional ${expense.sourcingSpecialists.length === 2 ? "employee" : "employees"}`} className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold leading-none text-primary">
                              +{expense.sourcingSpecialists.length - 1}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70" />
                    </div>
                  </article>
                ))}
              </div>
            )}

          </div>
          <div className="shrink-0 border-t border-border/50 px-2.5 pt-1.5 sm:px-3">
            <div className="flex items-center justify-between gap-2 pb-1.5 text-[11px]">
              <span className="text-muted-foreground">Current page total <strong className="ml-1 font-semibold tabular-nums text-primary">{formatCurrency(currentPageTotal)}</strong></span>
              <span className="text-muted-foreground">Total expenses <strong className="ml-1 font-semibold tabular-nums text-primary">{totalExpensesAmount === null ? "—" : formatCurrency(totalExpensesAmount)}</strong></span>
            </div>
            <ExpensePagination
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              totalCount={totalCount}
              loading={loading}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
          </div>
        </div>

      </section>

      {/* Create / edit Form */}
      {formOpen ? (
        <DialogShell
          title={editingExpense ? "Edit expense" : "Add a new expense"}
          description={editingExpense ? "Update the expense details, assigned employees, and receipt." : "Record the expense date, amount, assigned employees, and receipt."}
          onClose={requestCloseExpenseForm}
        >
          <form noValidate onSubmit={submitExpense} className="space-y-2.5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {/* Date field: Normal field with calendar icon on left, date text, no dropdown arrow */}
              <label className="block text-sm font-medium text-foreground">
                Expense date <span className="text-primary">*</span>
                <span className="relative mt-1.5 block">
                  <button
                    type="button"
                    aria-invalid={Boolean(fieldErrors.expenseDate)}
                    onClick={() => {
                      const selected = formValues.expenseDate ? new Date(`${formValues.expenseDate}T00:00:00`) : new Date();
                      setExpenseCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
                      setExpenseDatePickerOpen((open) => !open);
                    }}
                    className={`flex h-9 w-full items-center gap-2.5 rounded-[12px] border bg-background px-3 text-left text-sm outline-none transition ${fieldErrors.expenseDate ? "border-destructive ring-2 ring-destructive/20 focus:border-destructive focus:ring-destructive/20" : "border-input hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
                  >
                    <CalendarDays className="size-4 text-primary shrink-0" />
                    <span className="flex-1 font-medium text-foreground">
                      {formValues.expenseDate ? formatDate(formValues.expenseDate) : "Choose expense date"}
                    </span>
                  </button>
                  {expenseDatePickerOpen ? (
                    <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(21rem,calc(100vw-3rem))] rounded-2xl border border-border bg-background p-2.5 shadow-xl">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <button type="button" aria-label="Previous month" onClick={() => setExpenseCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><ChevronDown className="size-4 rotate-90" /></button>
                        <p className="text-sm font-semibold">{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(expenseCalendarMonth)}</p>
                        <button type="button" aria-label="Next month" disabled={expenseCalendarMonth.getFullYear() === new Date().getFullYear() && expenseCalendarMonth.getMonth() >= new Date().getMonth()} onClick={() => setExpenseCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30"><ChevronDown className="size-4 -rotate-90" /></button>
                      </div>
                      <div className="grid grid-cols-7 text-center">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="py-1.5 text-[10px] font-medium text-muted-foreground">{day}</span>)}
                        {expenseCalendarDays.map((day) => {
                          const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                          const selected = iso === formValues.expenseDate;
                          const inMonth = day.getMonth() === expenseCalendarMonth.getMonth();
                          const disabled = iso > todayLocalIso();
                          return (
                            <button
                              key={iso}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                updateFormField("expenseDate", iso);
                                setExpenseDatePickerOpen(false);
                              }}
                              className={`mx-auto my-0.5 flex aspect-square w-full max-w-8 items-center justify-center rounded-lg text-xs ${selected ? "bg-primary font-bold text-primary-foreground" : inMonth ? "text-foreground hover:bg-muted" : "text-muted-foreground/40"} ${disabled ? "cursor-not-allowed opacity-30" : ""}`}
                            >
                              {day.getDate()}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex justify-end border-t border-border pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            updateFormField("expenseDate", todayLocalIso());
                            setExpenseDatePickerOpen(false);
                          }}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
                        >
                          Today
                        </button>
                      </div>
                    </div>
                  ) : null}
                </span>
                {fieldErrors.expenseDate ? <span className="mt-1 block text-xs text-destructive">{fieldErrors.expenseDate}</span> : null}
              </label>

              {/* Amount field */}
              <label className="block text-sm font-medium text-foreground">
                Amount (INR) <span className="text-primary">*</span>
                <span className="relative mt-1.5 block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    name="amount"
                    min="0.01"
                    max="9999999.99"
                    step="0.01"
                    inputMode="decimal"
                    value={formValues.amount}
                    onChange={(event) => updateFormField("amount", event.target.value)}
                    required
                    aria-invalid={Boolean(fieldErrors.amount)}
                    placeholder="0.00"
                    className={`h-9 w-full rounded-[12px] border bg-background pl-8 pr-3 text-sm outline-none transition ${fieldErrors.amount ? "border-destructive ring-2 ring-destructive/20 focus:border-destructive focus:ring-destructive/20" : "border-input focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
                  />
                </span>
                {fieldErrors.amount ? <span className="mt-1 block text-xs text-destructive">{fieldErrors.amount}</span> : null}
              </label>
            </div>

            <div className="relative block text-sm font-medium text-foreground">
              <span>Handled By <span className="text-primary">*</span></span>
              <Popover open={specialistPickerOpen} onOpenChange={setSpecialistPickerOpen}>
              <PopoverTrigger asChild><button
                type="button"
                aria-expanded={specialistPickerOpen}
                aria-haspopup="listbox"
                aria-invalid={Boolean(fieldErrors.sourcingSpecialistIds)}
                className={`mt-1 flex h-9 w-full items-center gap-2 rounded-[12px] border bg-background px-3 text-left text-sm outline-none transition ${fieldErrors.sourcingSpecialistIds ? "border-destructive ring-2 ring-destructive/20 focus:border-destructive focus:ring-destructive/20" : "border-input hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
              >
                <UsersIcon className="size-4 shrink-0 text-primary" />
                <span className="flex-1 truncate text-foreground">
                  {formValues.sourcingSpecialistIds.length
                    ? `${formValues.sourcingSpecialistIds.length} selected`
                    : "Choose one or more employees"}
                </span>
                <ChevronDown className={`size-4 text-muted-foreground transition ${specialistPickerOpen ? "rotate-180" : ""}`} />
              </button></PopoverTrigger>
              {formValues.sourcingSpecialistIds.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sourcingSpecialists.filter((employee) => formValues.sourcingSpecialistIds.includes(employee.id)).map((employee) => (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => toggleSourcingSpecialist(employee.id)}
                      aria-label={`Remove ${employee.displayName}`}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary/10"
                    >
                      <span className="truncate">{employee.displayName}</span><X className="size-3 shrink-0 text-primary" />
                    </button>
                  ))}
                </div>
              ) : null}
              {fieldErrors.sourcingSpecialistIds ? <p className="mt-1 text-xs text-destructive">{fieldErrors.sourcingSpecialistIds}</p> : null}
              <PopoverContent align="start" side="bottom" sideOffset={5} style={{ width: "min(34rem, var(--radix-popover-trigger-width))" }} className="z-[80] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-background p-0 shadow-lg">
                  <div className="border-b border-border p-2">
                    <Input
                      type="search"
                      value={specialistSearch}
                      onChange={(event) => setSpecialistSearch(event.target.value)}
                      placeholder="Search employees"
                      aria-label="Search employees for Handled By"
                      className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                  <div role="listbox" aria-multiselectable="true" aria-label="Employees available for Handled By" className="max-h-[220px] overflow-y-auto">
                    <div className="sticky top-0 z-10 grid grid-cols-[1rem_minmax(0,1fr)_9rem] items-center gap-2 border-b border-border bg-background px-2 py-2 text-[11px] font-semibold text-muted-foreground"><span aria-hidden="true" /><span>Name</span><span className="text-center">Phone number</span></div>
                    {sourcingSpecialists.filter((employee) => `${employee.displayName} ${employee.mobile || ""}`.toLowerCase().includes(specialistSearch.trim().toLowerCase())).length ? (
                      sourcingSpecialists
                        .filter((employee) => `${employee.displayName} ${employee.mobile || ""}`.toLowerCase().includes(specialistSearch.trim().toLowerCase()))
                        .map((employee) => {
                          const selected = formValues.sourcingSpecialistIds.includes(employee.id);
                          return (
                            <button
                              key={employee.id}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => toggleSourcingSpecialist(employee.id)}
                              className="grid min-h-8 w-full grid-cols-[1rem_minmax(0,1fr)_9rem] items-center gap-2 rounded-md px-2 text-left text-sm text-foreground hover:bg-muted"
                            >
                              <span className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>
                                {selected ? <Check className="size-3 stroke-[3]" /> : null}
                              </span>
                              <span className="flex min-w-0 items-center gap-2">
                                <Avatar className="size-6 shrink-0"><AvatarFallback className={`text-[9px] font-bold ${getEmployeeAvatarColorClass(employee)}`}>{getEmployeeInitials(employee.displayName)}</AvatarFallback></Avatar>
                                <span className="truncate">{employee.displayName}</span>
                              </span>
                              <span className="whitespace-nowrap text-center text-xs text-muted-foreground">{employee.mobile || "—"}</span>
                            </button>
                          );
                        })
                    ) : (
                      <p className="px-2.5 py-2 text-xs text-muted-foreground">No active employees found.</p>
                    )}
                  </div>
              </PopoverContent>
              </Popover>
            </div>

            {/* Required image receipt picker */}
            <BillFilePicker
              existingFileName={editingExpense ? displayReceiptName(editingExpense) : undefined}
              value={formValues.bill || null}
              onChange={(file) => updateFormField("bill", file)}
              onPreviewExisting={async () => {
                if (!editingExpense) return null;
                const bill = await getBillBlob(editingExpense.id);
                return {
                  url: URL.createObjectURL(bill.blob),
                  contentType: bill.contentType,
                  fileName: displayReceiptName(editingExpense) || `expense-${editingExpense.id}-receipt`,
                };
              }}
              required
              error={fieldErrors.bill}
            />

            {/* Category / notes with a live character counter */}
            <label className="block text-sm font-medium text-foreground">
              <span className="flex items-center justify-between gap-3">
                <span>Category / notes <span className="text-muted-foreground">(optional)</span></span>
                <span aria-live="polite" className="shrink-0 text-xs font-normal text-muted-foreground">{formValues.categoryNotes.length}/250</span>
              </span>
              <textarea
                name="categoryNotes"
                rows={3}
                maxLength={250}
                value={formValues.categoryNotes}
                onChange={(event) => updateFormField("categoryNotes", event.target.value)}
                aria-invalid={Boolean(fieldErrors.categoryNotes)}
                placeholder="e.g. Fabric purchase, tailoring supplies, 2 Shirts order"
                className={`mt-1 block w-full resize-none rounded-[12px] border bg-background px-3 py-1.5 text-sm leading-relaxed outline-none transition placeholder:text-muted-foreground/80 ${fieldErrors.categoryNotes ? "border-destructive ring-2 ring-destructive/20 focus:border-destructive focus:ring-destructive/20" : "border-input focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
              />
              {fieldErrors.categoryNotes ? <span className="mt-1 block text-xs text-destructive">{fieldErrors.categoryNotes}</span> : null}
            </label>

            {formError ? (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            {/* Fixed footer: Cancel + Create expense */}
            <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={requestCloseExpenseForm}
                disabled={saving}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-destructive/60 bg-background px-3 text-xs font-medium text-destructive shadow-2xs transition-colors hover:border-destructive hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="size-3.5" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : editingExpense ? <Check className="size-3.5" /> : <UserRoundPlus className="size-3.5" />}
                {saving ? "Saving..." : editingExpense ? "Save Changes" : "Create expense"}
              </button>
            </div>
          </form>
        </DialogShell>
      ) : null}

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
          onClose={() => { setDetailsOpen(false); setBillPreview(null); }}
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
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/10 bg-primary/[0.07] text-primary">
        <Receipt className="size-6" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-foreground">
        {hasFilters ? "No expenses found" : "Your expense list is empty"}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {hasFilters ? "Try a different search or date range." : "Add your first expense and attach its receipt to get started."}
      </p>
      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
