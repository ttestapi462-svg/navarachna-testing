"use client";

import { apiClient, getStoredToken } from "@/lib/api-client";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileImage,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

type Expense = {
  id: number;
  expenseDate: string;
  amount: number | string;
  categoryNotes: string;
  billFileName: string;
  billUrl?: string;
  createdBy?: number | null;
  createdAt?: string;
  updatedAt?: string | null;
};

type ExpensePageResult = {
  items: Expense[];
  page: number;
  pageSize: number;
  totalCount: number;
};

type Feedback = { kind: "success" | "error"; message: string };
type ExpenseFormValues = {
  expenseDate: string;
  amount: string;
  categoryNotes: string;
  bill?: File | null;
};

type BillPreview = {
  expenseId: number;
  url: string;
  contentType: string;
  fileName: string;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5207").replace(/\/$/, "");
const PAGE_SIZE = 10;
const MAX_BILL_SIZE = 5 * 1024 * 1024;
const ACCEPTED_BILL_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

function todayLocalIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function formatCurrency(value: number | string) {
  const amount = Number(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function shortDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(value));
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
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] border border-border/70 bg-card shadow-2xl sm:rounded-[1.5rem] ${wide ? "sm:max-w-2xl" : "sm:max-w-xl"}`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border/70 bg-card/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

function BillFilePicker({
  existingFileName,
  value,
  onChange,
  required,
  error,
}: {
  existingFileName?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  required: boolean;
  error?: string;
}) {
  const [localError, setLocalError] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setLocalError("");
    if (file) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!ACCEPTED_BILL_EXTENSIONS.includes(extension)) {
        setLocalError("Choose a JPG, PNG, WEBP or PDF file.");
        event.target.value = "";
        onChange(null);
        return;
      }
      if (file.size > MAX_BILL_SIZE) {
        setLocalError("The bill must be 5 MB or smaller.");
        event.target.value = "";
        onChange(null);
        return;
      }
    }
    onChange(file);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">
        Bill / receipt {required ? <span className="text-primary">*</span> : <span className="text-muted-foreground">(optional)</span>}
      </label>
      <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/25 p-3.5 transition hover:border-primary/60 hover:bg-primary/[0.035] sm:p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {value ? <FileText className="size-5" /> : <UploadCloud className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{value?.name || existingFileName || "Upload a bill or receipt"}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">JPG, PNG, WEBP or PDF · max 5 MB</span>
        </span>
        <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground group-hover:border-primary/40">Browse</span>
        <input
          type="file"
          name="bill"
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          required={required}
          onChange={handleChange}
          className="sr-only"
        />
      </label>
      {localError || error ? <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{localError || error}</p> : null}
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [expenseCalendarMonth, setExpenseCalendarMonth] = useState(() => new Date());
  const [expenseDatePickerOpen, setExpenseDatePickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formValues, setFormValues] = useState<ExpenseFormValues>({
    expenseDate: todayLocalIso(),
    amount: "",
    categoryNotes: "",
    bill: null,
  });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);
  const [billLoading, setBillLoading] = useState(false);
  const [billPreview, setBillPreview] = useState<BillPreview | null>(null);

  useEffect(() => {
    return () => {
      if (billPreview?.url) URL.revokeObjectURL(billPreview.url);
    };
  }, [billPreview]);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const loadExpenses = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) query.set("search", search.trim());
    if (fromDate) query.set("fromDate", fromDate);
    if (toDate) query.set("toDate", toDate);

    try {
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
    }
  }, [fromDate, page, refreshKey, search, toDate]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilters = Boolean(search || fromDate || toDate);
  const calendarDays = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start); day.setDate(start.getDate() + index); return day;
    });
  }, [calendarMonth]);
  const expenseCalendarDays = useMemo(() => {
    const first = new Date(expenseCalendarMonth.getFullYear(), expenseCalendarMonth.getMonth(), 1);
    const start = new Date(first); start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  }, [expenseCalendarMonth]);

  const openCreateForm = () => {
    setEditingExpense(null);
    setFormValues({ expenseDate: todayLocalIso(), amount: "", categoryNotes: "", bill: null });
    setFormError("");
    setFormOpen(true);
  };

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense);
    setFormValues({
      expenseDate: expense.expenseDate.slice(0, 10),
      amount: String(expense.amount),
      categoryNotes: expense.categoryNotes,
      bill: null,
    });
    setFormError("");
    setFormOpen(true);
  };

  const updateFormField = (field: keyof ExpenseFormValues, value: string | File | null) => {
    setFormValues((current) => ({ ...current, [field]: value }));
  };

  const submitExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const parsedAmount = Number(formValues.amount);
    if (!formValues.expenseDate) {
      setFormError("Choose an expense date.");
      return;
    }
    if (formValues.expenseDate > todayLocalIso()) {
      setFormError("Expense date cannot be in the future.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 9999999.99) {
      setFormError("Enter an amount greater than ₹0 and no more than ₹99,99,999.99.");
      return;
    }
    if (Math.abs(parsedAmount * 100 - Math.round(parsedAmount * 100)) > 1e-8) {
      setFormError("Amount can have at most 2 decimal places.");
      return;
    }
    if (formValues.categoryNotes.trim().length < 2 || formValues.categoryNotes.trim().length > 250) {
      setFormError("Notes must contain between 2 and 250 characters.");
      return;
    }
    if (!editingExpense && !formValues.bill) {
      setFormError("Attach a bill or receipt before saving this expense.");
      return;
    }

    const data = new FormData();
    data.append("expenseDate", formValues.expenseDate);
    data.append("amount", formValues.amount);
    data.append("categoryNotes", formValues.categoryNotes.trim());
    if (formValues.bill) data.append("bill", formValues.bill);

    setSaving(true);
    try {
      await multipartRequest<Expense>(editingExpense?.id ?? null, data);
      setFormOpen(false);
      setFeedback({ kind: "success", message: editingExpense ? "Expense updated successfully." : "Expense added successfully." });
      setPage(1);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save this expense. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (expense: Expense) => {
    setActiveExpense(expense);
    setDetailsOpen(true);
    setDetailsLoading(true);
    setBillPreview(null);
    try {
      const response = await apiClient<Expense>(`/api/expenses/${expense.id}`);
      setActiveExpense(response);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Unable to load expense details." });
    } finally {
      setDetailsLoading(false);
    }
  };

  const viewBill = async (expense: Expense) => {
    setBillLoading(true);
    try {
      const bill = await getBillBlob(expense.id);
      const url = URL.createObjectURL(bill.blob);
      setBillPreview({
        expenseId: expense.id,
        url,
        contentType: bill.contentType,
        fileName: expense.billFileName || `expense-${expense.id}-bill`,
      });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Unable to open this bill." });
    } finally {
      setBillLoading(false);
    }
  };

  const deleteExpense = async (expense: Expense) => {
    const confirmed = window.confirm(`Delete expense #${expense.id} — ${expense.categoryNotes}? This action will remove it from the active list.`);
    if (!confirmed) return;
    setFeedback(null);
    try {
      await apiClient(`/api/expenses/${expense.id}`, { method: "DELETE" });
      setFeedback({ kind: "success", message: `Expense #${expense.id} deleted successfully.` });
      if (expenses.length === 1 && page > 1) setPage((current) => current - 1);
      else setRefreshKey((key) => key + 1);
      if (activeExpense?.id === expense.id) setDetailsOpen(false);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Unable to delete this expense." });
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setFromDate("");
    setToDate("");
    setPage(1);
    setFiltersOpen(false);
  };

  const applySearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-4 pb-5">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">Expense management</h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => void loadExpenses(true)}
            disabled={loading || refreshing}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            <Plus className="size-4" /> Add expense
          </button>
        </div>
      </div>

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

      {/* Search / filters */}
      <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm shadow-foreground/[0.025]">
        <div className="flex flex-col gap-2.5 border-b border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">Expense records</h2>
            <p className="mt-1 text-xs text-muted-foreground">Search descriptions, review receipts and manage each entry.</p>
          </div>
          <form onSubmit={applySearch} className="flex w-full gap-2 sm:max-w-md">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search expenses..."
                aria-label="Search expenses"
                className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-4 text-sm outline-none transition placeholder:text-muted-foreground/80 focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <button type="submit" className="h-10 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">Search</button>
          </form>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${filtersOpen || fromDate || toDate ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <CalendarDays className="size-4" /> Date range <ChevronDown className={`size-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>
          {search ? <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-xs text-foreground">Search: “{search}” <button type="button" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }} aria-label="Clear search"><X className="size-3" /></button></span> : null}
          {fromDate || toDate ? <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-muted px-3 text-xs text-foreground">{fromDate ? shortDate(fromDate) : "Any date"} – {toDate ? shortDate(toDate) : "Today"}<button type="button" onClick={() => { setFromDate(""); setToDate(""); setPage(1); }} aria-label="Clear date range"><X className="size-3" /></button></span> : null}
          {hasFilters ? <button type="button" onClick={clearFilters} className="ml-auto text-xs font-semibold text-primary hover:underline">Clear all</button> : null}
        </div>
        {filtersOpen ? (
          <div className="grid grid-cols-1 gap-4 border-t border-border/60 bg-muted/10 p-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:p-5">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-1">
              {["Today", "Yesterday", "Last 7 days", "Last 30 days", "Month to date", "Last month", "Year to date", "Last year"].map((preset) => (
                <button key={preset} type="button" onClick={() => {
                  const today = new Date();
                  const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  const start = new Date(today);
                  const end = new Date(today);
                  if (preset === "Yesterday") { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
                  else if (preset === "Last 7 days") start.setDate(start.getDate() - 6);
                  else if (preset === "Last 30 days") start.setDate(start.getDate() - 29);
                  else if (preset === "Month to date") start.setDate(1);
                  else if (preset === "Last month") { start.setMonth(start.getMonth() - 1, 1); end.setDate(0); }
                  else if (preset === "Year to date") { start.setMonth(0, 1); }
                  else if (preset === "Last year") { start.setFullYear(start.getFullYear() - 1, 0, 1); end.setFullYear(end.getFullYear() - 1, 11, 31); }
                  setFromDate(iso(start)); setToDate(iso(end)); setPage(1); setFiltersOpen(false);
                }} className="rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground transition hover:bg-primary/10 hover:text-primary">{preset}</button>
              ))}
            </div>
            <div className="rounded-xl border border-border/80 bg-background p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(calendarMonth)}</p>
                <div className="flex items-center gap-1"><button type="button" aria-label="Previous month" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><ChevronDown className="size-4 rotate-90" /></button><button type="button" aria-label="Next month" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><ChevronDown className="size-4 -rotate-90" /></button></div>
              </div>
              <div className="grid grid-cols-7 text-center">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="py-2 text-[11px] font-medium text-muted-foreground">{day}</span>)}
                {calendarDays.map((day) => {
                  const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                  const inMonth = day.getMonth() === calendarMonth.getMonth();
                  const selected = iso === fromDate || iso === toDate;
                  const inRange = Boolean(fromDate && toDate && iso > fromDate && iso < toDate);
                  const disabled = iso > todayLocalIso();
                  return <button key={iso} type="button" disabled={disabled} onClick={() => { if (!fromDate || (fromDate && toDate)) { setFromDate(iso); setToDate(""); } else if (iso < fromDate) { setFromDate(iso); } else { setToDate(iso); } setPage(1); }} className={`mx-auto my-0.5 flex aspect-square w-full max-w-9 items-center justify-center rounded-lg text-xs transition ${selected ? "bg-primary text-primary-foreground font-bold" : inRange ? "bg-primary/10 text-primary" : inMonth ? "text-foreground hover:bg-muted" : "text-muted-foreground/40"} ${disabled ? "cursor-not-allowed opacity-30" : ""}`}>{day.getDate()}</button>;
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-[10px] text-muted-foreground">From</p><p className="mt-0.5 text-xs font-semibold text-foreground">{fromDate ? shortDate(fromDate) : "Select start"}</p></div>
                <div className="rounded-lg bg-muted/50 px-3 py-2"><p className="text-[10px] text-muted-foreground">To</p><p className="mt-0.5 text-xs font-semibold text-foreground">{toDate ? shortDate(toDate) : "Select end"}</p></div>
              </div>
              <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => { setFromDate(""); setToDate(""); setPage(1); }} className="h-9 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-muted">Clear</button><button type="button" onClick={() => { setPage(1); setFiltersOpen(false); }} className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90">Apply range</button></div>
            </div>
          </div>
        ) : null}

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-muted/25 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-2.5">Expense</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Receipt</th>
                <th className="px-4 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? Array.from({ length: 5 }).map((_, index) => (
                <tr key={`loading-${index}`} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="size-10 animate-pulse rounded-xl bg-muted/70" /><div className="flex-1 space-y-2"><div className="h-3 w-3/4 animate-pulse rounded bg-muted/70" /><div className="h-2.5 w-1/3 animate-pulse rounded bg-muted/50" /></div></div></td>
                  <td className="px-4 py-3"><div className="h-3 w-20 animate-pulse rounded bg-muted/70" /></td>
                  <td className="px-4 py-3"><div className="h-7 w-28 animate-pulse rounded-full bg-muted/70" /></td>
                  <td className="px-4 py-3"><div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted/70" /></td>
                  <td className="px-4 py-3"><div className="ml-auto h-8 w-24 animate-pulse rounded-full bg-muted/50" /></td>
                </tr>
              )) : expenses.map((expense) => (
                <tr key={expense.id} className="group transition-colors hover:bg-primary/[0.025]">
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.07] text-primary"><Receipt className="size-[18px]" /></span>
                      <div className="min-w-0">
                        <p className="max-w-[340px] truncate text-sm font-semibold text-foreground">{expense.categoryNotes}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Expense #{expense.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(expense.expenseDate)}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => void openDetails(expense)} className="inline-flex max-w-[180px] items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/30 hover:text-primary" title={expense.billFileName}>
                      {expense.billFileName?.toLowerCase().endsWith(".pdf") ? <FileText className="size-3.5 shrink-0" /> : <FileImage className="size-3.5 shrink-0" />}
                      <span className="truncate">{expense.billFileName || "View bill"}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-foreground">{formatCurrency(expense.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <ActionButton label="View details" onClick={() => void openDetails(expense)}><Eye className="size-4" /></ActionButton>
                      <ActionButton label="Edit expense" onClick={() => openEditForm(expense)}><Pencil className="size-4" /></ActionButton>
                      <ActionButton label="Delete expense" destructive onClick={() => void deleteExpense(expense)}><Trash2 className="size-4" /></ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && expenses.length === 0 ? <tr><td colSpan={5} className="px-5 py-16 text-center"><EmptyState hasFilters={hasFilters} onClear={clearFilters} /></td></tr> : null}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-border/60 md:hidden">
          {loading ? Array.from({ length: 4 }).map((_, index) => <div key={`mobile-loading-${index}`} className="p-4"><div className="h-24 animate-pulse rounded-2xl bg-muted/70" /></div>) : expenses.map((expense) => (
            <article key={expense.id} className="p-3 transition-colors active:bg-muted/30">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/[0.07] text-primary"><Receipt className="size-[18px]" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold leading-snug text-foreground">{expense.categoryNotes}</h3>
                      <p className="mt-1 text-[11px] text-muted-foreground">#{expense.id} <span className="px-1">·</span> {formatDate(expense.expenseDate)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatCurrency(expense.amount)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => void openDetails(expense)} className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-primary"><FileText className="size-3.5 shrink-0" /><span className="max-w-[145px] truncate">{expense.billFileName || "View receipt"}</span><Eye className="size-3.5 shrink-0" /></button>
                    <div className="flex shrink-0 items-center gap-1">
                      <ActionButton label="View details" onClick={() => void openDetails(expense)}><Eye className="size-4" /></ActionButton>
                      <ActionButton label="Edit expense" onClick={() => openEditForm(expense)}><Pencil className="size-4" /></ActionButton>
                      <ActionButton label="Delete expense" destructive onClick={() => void deleteExpense(expense)}><Trash2 className="size-4" /></ActionButton>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!loading && expenses.length === 0 ? <div className="px-4 py-12 text-center"><EmptyState hasFilters={hasFilters} onClear={clearFilters} /></div> : null}
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/[0.13] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-muted-foreground">
            {totalCount === 0 ? "No records to show" : <>Showing <span className="font-semibold text-foreground">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)}</span> of <span className="font-semibold text-foreground">{totalCount}</span> expenses</>}
          </p>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft className="size-3.5" /> Previous</button>
            <span className="min-w-16 text-center text-xs font-medium text-muted-foreground">{page} / {pageCount}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount || loading} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Next <ArrowRight className="size-3.5" /></button>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">Receipts are stored with each expense. Use the details view to preview or download the original bill; replacing a receipt is optional when editing.</p>
      </div>

      {/* Create / edit */}
      {formOpen ? (
        <DialogShell
          title={editingExpense ? `Edit expense #${editingExpense.id}` : "Add a new expense"}
          description={editingExpense ? "Update the details below and save your changes." : "Add the purchase details and attach its bill or receipt."}
          onClose={() => { if (!saving) setFormOpen(false); }}
        >
          <form onSubmit={submitExpense} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">Expense date <span className="text-primary">*</span>
                <span className="relative mt-1.5 block">
                  <button type="button" onClick={() => { const selected = formValues.expenseDate ? new Date(`${formValues.expenseDate}T00:00:00`) : new Date(); setExpenseCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1)); setExpenseDatePickerOpen((open) => !open); }} className="flex h-11 w-full items-center gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm outline-none transition hover:border-primary/50 focus:border-primary/60 focus:ring-4 focus:ring-primary/10">
                    <CalendarDays className="size-4 text-primary" /><span className="flex-1">{formValues.expenseDate ? formatDate(formValues.expenseDate) : "Choose expense date"}</span><ChevronDown className={`size-4 text-muted-foreground transition-transform ${expenseDatePickerOpen ? "rotate-180" : ""}`} />
                  </button>
                  {expenseDatePickerOpen ? <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(21rem,calc(100vw-3rem))] rounded-2xl border border-border bg-background p-3 shadow-xl">
                    <div className="mb-2 flex items-center justify-between gap-2"><button type="button" aria-label="Previous month" onClick={() => setExpenseCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><ChevronDown className="size-4 rotate-90" /></button><p className="text-sm font-semibold">{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(expenseCalendarMonth)}</p><button type="button" aria-label="Next month" disabled={expenseCalendarMonth.getFullYear() === new Date().getFullYear() && expenseCalendarMonth.getMonth() >= new Date().getMonth()} onClick={() => setExpenseCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30"><ChevronDown className="size-4 -rotate-90" /></button></div>
                    <div className="grid grid-cols-7 text-center">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="py-1.5 text-[10px] font-medium text-muted-foreground">{day}</span>)}
                      {expenseCalendarDays.map((day) => { const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`; const selected = iso === formValues.expenseDate; const inMonth = day.getMonth() === expenseCalendarMonth.getMonth(); const disabled = iso > todayLocalIso(); return <button key={iso} type="button" disabled={disabled} onClick={() => { updateFormField("expenseDate", iso); setExpenseDatePickerOpen(false); }} className={`mx-auto my-0.5 flex aspect-square w-full max-w-9 items-center justify-center rounded-lg text-xs ${selected ? "bg-primary font-bold text-primary-foreground" : inMonth ? "text-foreground hover:bg-muted" : "text-muted-foreground/40"} ${disabled ? "cursor-not-allowed opacity-30" : ""}`}>{day.getDate()}</button>; })}
                    </div>
                    <div className="mt-2 flex justify-end border-t border-border pt-2"><button type="button" onClick={() => { updateFormField("expenseDate", todayLocalIso()); setExpenseDatePickerOpen(false); }} className="rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10">Today</button></div>
                  </div> : null}
                </span>
              </label>
              <label className="block text-sm font-medium text-foreground">Amount (INR) <span className="text-primary">*</span>
                <span className="relative mt-1.5 block"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">₹</span><input type="number" name="amount" min="0.01" max="9999999.99" step="0.01" inputMode="decimal" value={formValues.amount} onChange={(event) => updateFormField("amount", event.target.value)} required placeholder="0.00" className="h-11 w-full rounded-xl border border-input bg-background pl-8 pr-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10" /></span>
              </label>
            </div>
            <label className="block text-sm font-medium text-foreground">Category / notes <span className="text-primary">*</span>
              <textarea name="categoryNotes" rows={3} maxLength={250} value={formValues.categoryNotes} onChange={(event) => updateFormField("categoryNotes", event.target.value)} required minLength={2} placeholder="e.g. Fabric purchase, tailoring supplies, 2 Shirts order" className="mt-1.5 block w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-sm leading-relaxed outline-none transition placeholder:text-muted-foreground/80 focus:border-primary/60 focus:ring-4 focus:ring-primary/10" />
              <span className="mt-1 block text-right text-[11px] font-normal text-muted-foreground">{formValues.categoryNotes.length}/250 characters</span>
            </label>
            <BillFilePicker
              existingFileName={editingExpense?.billFileName}
              value={formValues.bill || null}
              onChange={(file) => updateFormField("bill", file)}
              required={!editingExpense}
            />
            {formError ? <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{formError}</span></div> : null}
            <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setFormOpen(false)} disabled={saving} className="h-10 rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60">
                {saving ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {saving ? "Saving…" : editingExpense ? "Save changes" : "Create expense"}
              </button>
            </div>
          </form>
        </DialogShell>
      ) : null}

      {/* Details / bill preview */}
      {detailsOpen && activeExpense ? (
        <DialogShell
          title={`Expense #${activeExpense.id}`}
          description="Expense details and attached receipt."
          onClose={() => { setDetailsOpen(false); setBillPreview(null); }}
          wide
        >
          {detailsLoading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading expense details…</div> : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Category / notes</p>
                    <p className="mt-2 break-words text-base font-semibold leading-snug text-foreground">{activeExpense.categoryNotes}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Recorded {formatDate(activeExpense.expenseDate)}</p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Amount</p>
                    <p className="mt-1.5 font-heading text-2xl font-semibold tracking-tight text-primary">{formatCurrency(activeExpense.amount)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border/70 pt-4 text-xs sm:grid-cols-2">
                  <div><p className="text-muted-foreground">Receipt file</p><p className="mt-1 break-all font-medium text-foreground">{activeExpense.billFileName || "No filename returned"}</p></div>
                  <div><p className="text-muted-foreground">Last updated</p><p className="mt-1 font-medium text-foreground">{activeExpense.updatedAt ? formatDate(activeExpense.updatedAt) : "Not updated"}</p></div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div><h3 className="text-sm font-semibold text-foreground">Attached receipt</h3><p className="mt-0.5 text-xs text-muted-foreground">Preview is loaded from the bill endpoint.</p></div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void viewBill(activeExpense)} disabled={billLoading} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border bg-background px-3.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50">{billLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />} {billPreview?.expenseId === activeExpense.id ? "Reload bill" : "View bill"}</button>
                    {billPreview?.expenseId === activeExpense.id ? <a href={billPreview.url} download={billPreview.fileName} className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"><ArrowDownToLine className="size-3.5" /> Download</a> : null}
                  </div>
                </div>
                {billPreview?.expenseId === activeExpense.id ? (
                  <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
                    {billPreview.contentType.startsWith("image/") ? <img src={billPreview.url} alt={`Receipt for expense ${activeExpense.id}`} className="mx-auto max-h-[55dvh] w-full object-contain" /> : billPreview.contentType.includes("pdf") || billPreview.fileName.toLowerCase().endsWith(".pdf") ? <iframe src={billPreview.url} title={`Receipt for expense ${activeExpense.id}`} className="h-[55dvh] w-full bg-white" /> : <div className="flex flex-col items-center px-4 py-10 text-center"><FileText className="size-9 text-primary" /><p className="mt-3 text-sm font-medium text-foreground">File ready to download</p><p className="mt-1 text-xs text-muted-foreground">Preview is not available for this file type.</p></div>}
                  </div>
                ) : (
                  <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileImage className="size-5" /></span>
                    <p className="mt-3 text-sm font-medium text-foreground">Bill not loaded yet</p>
                    <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Load the attached file to preview it here or download a copy.</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-between">
                <button type="button" onClick={() => void deleteExpense(activeExpense)} className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/10"><Trash2 className="size-4" /> Delete expense</button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => { setDetailsOpen(false); setBillPreview(null); }} className="h-10 rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-muted">Close</button>
                  <button type="button" onClick={() => { setDetailsOpen(false); setBillPreview(null); openEditForm(activeExpense); }} className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"><Pencil className="size-4" /> Edit expense</button>
                </div>
              </div>
            </div>
          )}
        </DialogShell>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  children,
  destructive = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-full transition ${destructive ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
    >
      {children}
    </button>
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
      <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/10 bg-primary/[0.07] text-primary"><Receipt className="size-6" /></span>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{hasFilters ? "No matching expenses" : "Your expense list is empty"}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hasFilters ? "Try a different search or date range." : "Add your first expense and attach its receipt to get started."}</p>
      {hasFilters ? <button type="button" onClick={onClear} className="mt-4 text-xs font-semibold text-primary hover:underline">Clear filters</button> : null}
    </div>
  );
}
