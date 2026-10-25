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
  ChevronRight,
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
  Users,
  X,
} from "lucide-react";
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

type Expense = {
  id: number;
  expenseDate: string;
  amount: number | string;
  categoryNotes: string;
  sourcingSpecialists: SourcingSpecialist[];
  billFileName: string;
  billUrl?: string;
  createdBy?: number | null;
  createdAt?: string;
  updatedAt?: string | null;
};

type SourcingSpecialist = { id: number; firstName: string; lastName?: string | null; displayName: string };

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
  sourcingSpecialistIds: number[];
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
  onPreviewExisting,
  required,
  error,
}: {
  existingFileName?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  onPreviewExisting?: () => void;
  required: boolean;
  error?: string;
}) {
  const [localError, setLocalError] = useState("");
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = (file: File | null, inputEl: HTMLInputElement | null) => {
    setLocalError("");
    if (file) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!ACCEPTED_BILL_EXTENSIONS.includes(extension)) {
        setLocalError("Choose a JPG, PNG, WEBP or PDF file.");
        if (inputEl) inputEl.value = "";
        onChange(null);
        return;
      }
      if (file.size > MAX_BILL_SIZE) {
        setLocalError("The bill must be 5 MB or smaller.");
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
  const activeFileName = value?.name || existingFileName || "";
  const isPdf = activeFileName.toLowerCase().endsWith(".pdf");

  const handleView = () => {
    if (value) {
      const url = URL.createObjectURL(value);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else if (onPreviewExisting) {
      onPreviewExisting();
    }
  };

  const handleRemove = () => {
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
    onChange(null);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">
        Bill / receipt {required ? <span className="text-primary">*</span> : <span className="text-muted-foreground">(optional)</span>}
      </label>

      {/* Hidden inputs for camera and file picker */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        className="sr-only"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        onChange={handleFileChange}
        className="sr-only"
      />

      {/* Mobile: when a file is selected, show single file card with middle truncation, View, Replace, Remove */}
      <div className="sm:hidden">
        {hasFile ? (
          <div className="flex items-center justify-between gap-2.5 rounded-[12px] border border-border bg-card p-3 shadow-xs">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {isPdf ? <FileText className="size-4.5" /> : <FileImage className="size-4.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground" title={activeFileName}>
                  {truncateMiddle(activeFileName, 22)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {value ? formatFileSize(value.size) : "Attached receipt"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={handleView}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                View
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Replace
              </button>
              <button
                type="button"
                aria-label="Remove receipt"
                onClick={handleRemove}
                className="rounded-lg p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Mobile: Two clear options side by side */
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-dashed border-border bg-muted/25 px-3 text-xs font-semibold text-foreground transition hover:border-primary/60 hover:bg-primary/[0.035] focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              <FileImage className="size-4 text-primary" /> Take photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 items-center justify-center gap-2 rounded-[12px] border border-dashed border-border bg-muted/25 px-3 text-xs font-semibold text-foreground transition hover:border-primary/60 hover:bg-primary/[0.035] focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              <UploadCloud className="size-4 text-primary" /> Upload file
            </button>
          </div>
        )}
      </div>

      {/* Desktop: single drag-and-drop picker */}
      <label className="group hidden cursor-pointer items-center gap-3 rounded-[12px] border border-dashed border-border bg-muted/25 p-3.5 transition hover:border-primary/60 hover:bg-primary/[0.035] sm:flex sm:p-4">
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
          onChange={(e) => validateAndSet(e.target.files?.[0] ?? null, e.target)}
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const currentPageRef = useRef(1);
  const isInitialBatchLoadedRef = useRef(false);

  const loadMoreExpenses = useCallback(async () => {
    if (
      loading ||
      loadingMore ||
      loadingMoreRef.current ||
      !isInitialBatchLoadedRef.current ||
      expenses.length >= totalCount ||
      totalCount === 0
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);

    const nextPage = currentPageRef.current + 1;
    const query = new URLSearchParams({ page: String(nextPage), pageSize: String(PAGE_SIZE) });
    if (search.trim()) query.set("search", search.trim());
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
  }, [apiClient, expenses.length, fromDate, loading, loadingMore, search, toDate, totalCount]);

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

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);
  const [billLoading, setBillLoading] = useState(false);
  const [billPreview, setBillPreview] = useState<BillPreview | null>(null);

  // Mobile bill preview modal state
  const [mobileBillPreviewOpen, setMobileBillPreviewOpen] = useState(false);

  // Pull-to-refresh state
  const listRef = useRef<HTMLDivElement>(null);
  const pullStartYRef = useRef(0);
  const [pullDelta, setPullDelta] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  // Search debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { setMobileAction } = useHeaderAction();

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
    currentPageRef.current = 1;
    isInitialBatchLoadedRef.current = false;
    const query = new URLSearchParams({ page: "1", pageSize: String(PAGE_SIZE) });
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
      setPage(1);
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
  }, [apiClient, fromDate, refreshKey, search, toDate]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    let mounted = true;
    void apiClient<SourcingSpecialist[]>("/api/expenses/sourcing-specialists")
      .then((employees) => {
        if (mounted) setSourcingSpecialists(Array.isArray(employees) ? employees : []);
      })
      .catch((error) => {
        if (mounted) setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Unable to load active Sourcing Specialists." });
      });
    return () => { mounted = false; };
  }, [apiClient]);

  const openCreateForm = useCallback(() => {
    setEditingExpense(null);
    setFormValues({ expenseDate: todayLocalIso(), amount: "", categoryNotes: "", sourcingSpecialistIds: [], bill: null });
    setSpecialistSearch("");
    setSpecialistPickerOpen(false);
    setFormError("");
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

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense);
    setFormValues({
      expenseDate: expense.expenseDate.slice(0, 10),
      amount: String(expense.amount),
      categoryNotes: expense.categoryNotes,
      sourcingSpecialistIds: (expense.sourcingSpecialists || []).map((employee) => employee.id),
      bill: null,
    });
    setSpecialistSearch("");
    setSpecialistPickerOpen(false);
    setFormError("");
    setFormOpen(true);
  };

  const updateFormField = (field: keyof ExpenseFormValues, value: string | File | number[] | null) => {
    setFormValues((current) => ({ ...current, [field]: value }));
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
    const categoryNotes = formValues.categoryNotes.trim();
    if (categoryNotes && (categoryNotes.length < 2 || categoryNotes.length > 250)) {
      setFormError("Notes must contain between 2 and 250 characters.");
      return;
    }
    if (formValues.sourcingSpecialistIds.length === 0) {
      setFormError("Select at least one Sourcing Specialist.");
      return;
    }
    if (!editingExpense && !formValues.bill) {
      setFormError("Attach a bill or receipt before saving this expense.");
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
    const confirmed = window.confirm(`Delete this expense — ${expense.categoryNotes}? This action will remove it from the active list.`);
    if (!confirmed) return;
    setFeedback(null);
    try {
      await apiClient(`/api/expenses/${expense.id}`, { method: "DELETE" });
      setFeedback({ kind: "success", message: "Expense deleted successfully." });
      if (expenses.length === 1 && page > 1) setPage((current) => current - 1);
      else setRefreshKey((key) => key + 1);
      if (activeExpense?.id === expense.id) setDetailsOpen(false);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Unable to delete this expense." });
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

  // Tapping mobile card body opens bill preview if bill exists
  const handleCardTap = async (expense: Expense) => {
    if (!expense.billFileName) return;
    setActiveExpense(expense);
    setMobileBillPreviewOpen(true);
    await viewBill(expense);
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

  return (
    <div className="space-y-2 md:space-y-4 pb-4">
      {/* Page heading — hidden on mobile, shown on desktop (Refresh + Add expense) */}
      <div className="hidden flex-col justify-between gap-3 md:flex md:flex-row md:items-center">
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

      {/* Main card section */}
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_8px_28px_rgba(33,29,27,0.045)]">
        {/* Desktop search header */}
        <div className="hidden border-b border-border/70 bg-muted/[0.12] p-4 sm:px-5 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold tracking-tight text-foreground">Recent expenses</h2>
            <p className="mt-1 text-sm text-muted-foreground">Search, review receipts and manage each entry.</p>
          </div>
          <form onSubmit={applySearch} className="flex w-full gap-2 sm:max-w-md">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search expenses..."
                aria-label="Search expenses"
                className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-9 text-sm outline-none transition placeholder:text-muted-foreground/80 focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </label>
            <button type="submit" className="h-10 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">Search</button>
          </form>
        </div>

        {/* Mobile Search Row (44px tall, sitting directly under app bar with 8px gap) */}
        <div className="p-3 md:hidden">
          <form onSubmit={applySearch} className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search expenses..."
                aria-label="Search expenses"
                className="h-11 w-full rounded-full border border-input bg-background pl-10 pr-9 text-sm outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:ring-4 focus:ring-primary/10"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </label>
            {/* Calendar icon button (44px visual and tap, opens date sheet) */}
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-label="Filter by date range"
              className={`relative flex size-11 shrink-0 items-center justify-center rounded-full border transition ${fromDate || toDate ? "border-primary/40 bg-primary/10 text-primary" : "border-input bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <CalendarDays className="size-5" />
              {(fromDate || toDate) ? (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
              ) : null}
            </button>
          </form>

          {/* Active date range chip (e.g. "07 Oct - 13 Oct x") directly under search row */}
          {fromDate && toDate ? (
            <div className="mt-2 flex items-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {shortDate(fromDate)} – {shortDate(toDate)}
                <button
                  type="button"
                  aria-label="Clear date range"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setPage(1);
                  }}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            </div>
          ) : null}
        </div>

        {/* Desktop Filter chips row */}
        <div className="hidden flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2.5 md:flex">
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

        {/* Date filter sheet / modal */}
        {filtersOpen ? (
          <div className="border-t border-border/60 bg-muted/10">
            {/* Mobile: calendar only (no quick-range chips), pinned Clear all & Apply range footer */}
            <div className="p-3 md:hidden">
              <div className="rounded-[16px] border border-border/80 bg-background p-3 shadow-md">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(calendarMonth)}</p>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Previous month" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><ChevronDown className="size-4 rotate-90" /></button>
                    <button type="button" aria-label="Next month" onClick={() => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><ChevronDown className="size-4 -rotate-90" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 text-center">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="py-1 text-[11px] font-medium text-muted-foreground">{day}</span>)}
                  {calendarDays.map((day) => {
                    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                    const inMonth = day.getMonth() === calendarMonth.getMonth();
                    const selected = iso === fromDate || iso === toDate;
                    const inRange = Boolean(fromDate && toDate && iso > fromDate && iso < toDate);
                    const disabled = iso > todayLocalIso();
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (!fromDate || (fromDate && toDate)) {
                            setFromDate(iso);
                            setToDate("");
                          } else if (iso < fromDate) {
                            setFromDate(iso);
                          } else {
                            setToDate(iso);
                          }
                          setPage(1);
                        }}
                        className={`mx-auto my-0.5 flex aspect-square w-full max-w-8 items-center justify-center rounded-lg text-xs transition ${selected ? "bg-primary text-primary-foreground font-bold" : inRange ? "bg-primary/10 text-primary" : inMonth ? "text-foreground hover:bg-muted" : "text-muted-foreground/30"} ${disabled ? "cursor-not-allowed opacity-25" : ""}`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/50 px-2.5 py-1.5"><p className="text-[10px] text-muted-foreground">From</p><p className="text-xs font-semibold text-foreground">{fromDate ? shortDate(fromDate) : "Select start"}</p></div>
                  <div className="rounded-lg bg-muted/50 px-2.5 py-1.5"><p className="text-[10px] text-muted-foreground">To</p><p className="text-xs font-semibold text-foreground">{toDate ? shortDate(toDate) : "Select end"}</p></div>
                </div>
                {/* Pinned footer: Clear all & Apply range (disabled until both dates chosen) */}
                <div className="sticky bottom-0 mt-3 flex items-center justify-end gap-2 border-t border-border/80 bg-background pt-2.5">
                  <button
                    type="button"
                    onClick={() => { setFromDate(""); setToDate(""); setPage(1); }}
                    className="h-9 rounded-[12px] px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    disabled={!fromDate || !toDate}
                    onClick={() => { setPage(1); setFiltersOpen(false); }}
                    className="h-9 rounded-[12px] bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Apply range
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop: presets + calendar */}
            <div className="hidden gap-4 p-5 md:grid md:grid-cols-[190px_minmax(0,1fr)]">
              <div className="grid grid-cols-1 gap-1">
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
          </div>
        ) : null}

        {/* Desktop table — UNTOUCHED */}
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
                        <p className="max-w-[340px] truncate text-sm font-semibold text-foreground">{expense.categoryNotes?.trim() || "Expense"}</p>
                        {(expense.sourcingSpecialists?.length || 0) > 0 ? (
                          <p className="mt-1 max-w-[340px] truncate text-xs text-muted-foreground">
                            Sourcing Specialist: {expense.sourcingSpecialists.map((employee) => employee.displayName).join(", ")}
                          </p>
                        ) : null}
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

        {/* Mobile View ONLY (Inner scroll container with pull-to-refresh & compact cards) */}
        <div className="md:hidden">
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
            className="max-h-[calc(100dvh-11.5rem)] overflow-y-auto overscroll-y-contain px-3 pb-5 sm:px-4 md:max-h-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => void handleTouchEnd()}
            onScroll={handleMobileScroll}
          >
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`mobile-loading-${index}`} className="h-[80px] animate-pulse rounded-[16px] bg-muted/70" />
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="py-12 text-center">
                <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
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
                    aria-label={`View expense ${expense.categoryNotes?.trim() || "Expense"}, ${formatCurrency(expense.amount)}`}
                    className="group flex min-h-[104px] w-full cursor-pointer flex-col justify-between rounded-[20px] border border-border/80 bg-card p-4 shadow-[0_4px_14px_rgba(33,29,27,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_8px_22px_rgba(33,29,27,0.08)] active:translate-y-0 active:scale-[0.995] active:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                        <CalendarDays className="size-4 shrink-0 text-primary" />
                        <span className="truncate text-xs font-semibold tracking-wide">
                          {formatDate(expense.expenseDate)}
                        </span>
                      </div>
                      <span className="shrink-0 text-right text-xl font-extrabold leading-tight tracking-tight tabular-nums" style={{ color: "#dc143c" }}>
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary transition-colors group-hover:bg-primary/[0.12]">
                          <Receipt className="size-4" />
                        </span>
                        <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                          {expense.categoryNotes?.trim() || "Expense"}
                        </p>
                      </div>
                      <ChevronRight className="size-3.5 text-muted-foreground/70" />
                    </div>
                    {(expense.sourcingSpecialists?.length || 0) > 0 ? (
                      <p className="truncate pl-10 text-xs text-muted-foreground">
                        Sourcing Specialist: {expense.sourcingSpecialists.map((employee) => employee.displayName).join(", ")}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}

            {/* Infinite scroll loader: visible for 4 seconds while fetching next batch */}
            {loadingMore ? (
              <div className="flex flex-col items-center justify-center py-6">
                <LoaderCircle className="size-8 animate-spin text-primary" />
              </div>
            ) : null}
            <div ref={sentinelRef} className="h-4 w-full pointer-events-none" />
          </div>
        </div>

        {/* Desktop Pagination — UNTOUCHED */}
        <div className="hidden flex-col gap-3 border-t border-border/70 bg-muted/[0.13] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 md:flex">
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

      {/* Desktop hint — hidden on mobile */}
      <div className="hidden items-start gap-2.5 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 md:flex">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">Receipts are stored with each expense. Use the details view to preview or download the original bill; replacing a receipt is optional when editing.</p>
      </div>

      {/* Create / edit Form */}
      {formOpen ? (
        <DialogShell
          title={editingExpense ? "Edit expense" : "Add a new expense"}
          description={editingExpense ? "Update the details below and save your changes." : "Add the purchase details and attach its bill or receipt."}
          onClose={() => { if (!saving) setFormOpen(false); }}
        >
          <form onSubmit={submitExpense} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Date field: Normal field with calendar icon on left, date text, no dropdown arrow */}
              <label className="block text-sm font-medium text-foreground">
                Expense date <span className="text-primary">*</span>
                <span className="relative mt-1.5 block">
                  <button
                    type="button"
                    onClick={() => {
                      const selected = formValues.expenseDate ? new Date(`${formValues.expenseDate}T00:00:00`) : new Date();
                      setExpenseCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
                      setExpenseDatePickerOpen((open) => !open);
                    }}
                    className="flex h-11 w-full items-center gap-2.5 rounded-[12px] border border-input bg-background px-3 text-left text-sm outline-none transition hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    <CalendarDays className="size-4 text-primary shrink-0" />
                    <span className="flex-1 font-medium text-foreground">
                      {formValues.expenseDate ? formatDate(formValues.expenseDate) : "Choose expense date"}
                    </span>
                  </button>
                  {expenseDatePickerOpen ? (
                    <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(21rem,calc(100vw-3rem))] rounded-2xl border border-border bg-background p-3 shadow-xl">
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
                              className={`mx-auto my-0.5 flex aspect-square w-full max-w-9 items-center justify-center rounded-lg text-xs ${selected ? "bg-primary font-bold text-primary-foreground" : inMonth ? "text-foreground hover:bg-muted" : "text-muted-foreground/40"} ${disabled ? "cursor-not-allowed opacity-30" : ""}`}
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
              </label>

              {/* Amount field */}
              <label className="block text-sm font-medium text-foreground">
                Amount (INR) <span className="text-primary">*</span>
                <span className="relative mt-1.5 block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">₹</span>
                  <input
                    type="number"
                    name="amount"
                    min="0.01"
                    max="9999999.99"
                    step="0.01"
                    inputMode="decimal"
                    value={formValues.amount}
                    onChange={(event) => updateFormField("amount", event.target.value)}
                    required
                    placeholder="0.00"
                    className="h-11 w-full rounded-[12px] border border-input bg-background pl-8 pr-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </span>
              </label>
            </div>

            <div className="relative block text-sm font-medium text-foreground">
              <span>Sourcing Specialist <span className="text-primary">*</span></span>
              <button
                type="button"
                onClick={() => setSpecialistPickerOpen((open) => !open)}
                aria-expanded={specialistPickerOpen}
                aria-haspopup="listbox"
                className="mt-1.5 flex h-11 w-full items-center gap-2 rounded-[12px] border border-input bg-background px-3.5 text-left text-sm outline-none transition hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10"
              >
                <Users className="size-4 shrink-0 text-primary" />
                <span className="flex-1 truncate text-foreground">
                  {formValues.sourcingSpecialistIds.length
                    ? `${formValues.sourcingSpecialistIds.length} selected`
                    : "Choose one or more employees"}
                </span>
                <ChevronDown className={`size-4 text-muted-foreground transition ${specialistPickerOpen ? "rotate-180" : ""}`} />
              </button>
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
              {specialistPickerOpen ? (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-border bg-background shadow-xl">
                  <div className="border-b border-border p-2.5">
                    <input
                      type="search"
                      value={specialistSearch}
                      onChange={(event) => setSpecialistSearch(event.target.value)}
                      placeholder="Search employees"
                      aria-label="Search Sourcing Specialists"
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                  <div role="listbox" aria-multiselectable="true" aria-label="Active Sourcing Specialists" className="max-h-52 overflow-y-auto p-1.5">
                    {sourcingSpecialists.filter((employee) => employee.displayName.toLowerCase().includes(specialistSearch.trim().toLowerCase())).length ? (
                      sourcingSpecialists
                        .filter((employee) => employee.displayName.toLowerCase().includes(specialistSearch.trim().toLowerCase()))
                        .map((employee) => {
                          const selected = formValues.sourcingSpecialistIds.includes(employee.id);
                          return (
                            <button
                              key={employee.id}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => toggleSourcingSpecialist(employee.id)}
                              className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm text-foreground hover:bg-muted"
                            >
                              <span className={`flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>
                                {selected ? <CheckCircle2 className="size-3.5" /> : null}
                              </span>
                              <span className="truncate">{employee.displayName}</span>
                            </button>
                          );
                        })
                    ) : (
                      <p className="px-2.5 py-3 text-xs text-muted-foreground">No active employees found.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Category / notes: compact ~3 rows, maxLength=250 only, no counter text */}
            <label className="block text-sm font-medium text-foreground">
              Category / notes <span className="text-muted-foreground">(optional)</span>
              <textarea
                name="categoryNotes"
                rows={3}
                maxLength={250}
                value={formValues.categoryNotes}
                onChange={(event) => updateFormField("categoryNotes", event.target.value)}
                placeholder="e.g. Fabric purchase, tailoring supplies, 2 Shirts order"
                className="mt-1.5 block w-full resize-none rounded-[12px] border border-input bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>

            {/* Bill / receipt picker: Take photo + Upload file side-by-side on mobile, single card after chosen */}
            <BillFilePicker
              existingFileName={editingExpense?.billFileName}
              value={formValues.bill || null}
              onChange={(file) => updateFormField("bill", file)}
              onPreviewExisting={() => {
                if (editingExpense) void viewBill(editingExpense);
              }}
              required={!editingExpense}
            />

            {formError ? (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3.5 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            {/* Fixed footer: Cancel + Create expense */}
            <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
                className="h-10 rounded-full border border-border bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {saving ? "Saving…" : editingExpense ? "Save changes" : "Create expense"}
              </button>
            </div>
          </form>
        </DialogShell>
      ) : null}

      {/* Desktop Details dialog — UNTOUCHED */}
      {detailsOpen && activeExpense ? (
        <DialogShell
          title="Expense details"
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
                    <div className="mt-4 border-t border-border/70 pt-3">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Sourcing Specialist</p>
                      <p className="mt-1.5 text-sm font-semibold text-foreground">
                        {(activeExpense.sourcingSpecialists || []).map((employee) => employee.displayName).join(", ") || "—"}
                      </p>
                    </div>
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
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 bg-card/95">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {billPreview?.fileName || activeExpense?.billFileName || "Bill preview"}
                </p>
                <p className="text-[11px] text-muted-foreground">Receipt preview</p>
              </div>
              <div className="flex items-center gap-2">
                {billPreview?.url ? (
                  <a
                    href={billPreview.url}
                    download={billPreview.fileName}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    <ArrowDownToLine className="size-3.5" /> Download
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setMobileBillPreviewOpen(false)}
                  aria-label="Close bill preview"
                  className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Bill Preview body */}
            <div className="flex-1 overflow-y-auto p-3">
              {billLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <LoaderCircle className="size-7 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Loading bill…</p>
                </div>
              ) : billPreview?.contentType.startsWith("image/") ? (
                <div className="flex items-center justify-center overflow-hidden rounded-xl bg-muted/20">
                  <img src={billPreview.url} alt="Receipt preview" className="max-h-[65dvh] w-full object-contain" />
                </div>
              ) : billPreview?.contentType.includes("pdf") || billPreview?.fileName.toLowerCase().endsWith(".pdf") ? (
                <iframe src={billPreview?.url} title="PDF Receipt preview" className="h-[65dvh] w-full rounded-xl bg-white" />
              ) : (
                <div className="flex flex-col items-center px-4 py-12 text-center">
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
      <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/10 bg-primary/[0.07] text-primary">
        <Receipt className="size-6" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-foreground">
        {hasFilters ? "No expenses found" : "Your expense list is empty"}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {hasFilters ? "Try a different search or date range." : "Add your first expense and attach its receipt to get started."}
      </p>
      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
