"use client";

import { apiClient, getStoredToken } from "@/lib/api-client";
import { PAGE_SIZES } from "@/components/expenses/expense-pagination";
import { ExpenseMobileList } from "@/components/expenses/expense-mobile-list";
import { ExpenseReceiptPicker } from "@/components/expenses/expense-receipt-picker";
import { EmptyState as ExpenseEmptyState } from "@/components/expenses/expense-empty-state";
import { ExpenseDialogs } from "@/components/expenses/expense-dialogs";
import { cleanStoredReceiptName } from "@/components/expenses/expense-ui-utils";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { dataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useHeaderAction } from "@/context/header-action-context";
import { useAuth } from "@/context/dashboard-auth-context";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTable } from "@tanstack/react-table";
import type { ExpandedState, PaginationState, SortingState } from "@tanstack/react-table";
import type { DateRange } from "react-day-picker";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { ExpenseDataGrid } from "@/components/expenses/expense-data-grid";
import { createExpenseColumns } from "@/components/expenses/expense-grid-columns";
import type { BillPreview, Expense, ExpenseFormValues, ExpenseGridRow, SourcingSpecialist } from "@/components/expenses/expense-types";

type ExpensePageResult = {
  items: Expense[];
  page: number;
  pageSize: number;
  totalCount: number;
};

type Feedback = { kind: "success" | "error"; message: string };
type CachedBillPreview = { promise: Promise<BillPreview>; preview?: BillPreview };

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5207").replace(/\/$/, "");
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

  const columns = useMemo(
    () => createExpenseColumns({
      currentUser, dateSubtotals, groupByDate, setGroupByDate, originalReceiptNames,
      displayReceiptName, getEmployeeAvatarColorClass, getEmployeeInitials, formatDate,
      formatCurrency, formatAuditDateTime, openDetails, openEditForm, requestDeleteExpense, prefetchBill,
    }),
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
                  rangeBand
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
                  rangeBand
                  mode="range"
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  numberOfMonths={2}
                  fixedWeeks
                  showOutsideDays={false}
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

        {/* Desktop expense table */}
        <div className="hidden min-h-0 flex-1 md:flex md:flex-col">
          <ExpenseDataGrid
            table={table}
            recordCount={totalCount}
            isLoading={loading}
            emptyMessage={<ExpenseEmptyState hasFilters={hasFilters} onClear={clearFilters} />}
            currentPageTotal={formatCurrency(currentPageTotal)}
            totalExpensesAmount={totalExpensesAmount === null ? "—" : formatCurrency(totalExpensesAmount)}
          />
        </div>

        <ExpenseMobileList
          pullDelta={pullDelta}
          refreshing={refreshing}
          listRef={listRef}
          handleTouchStart={handleTouchStart}
          handleTouchMove={handleTouchMove}
          handleTouchEnd={handleTouchEnd}
          handleMobileScroll={handleMobileScroll}
          loading={loading}
          expenses={expenses}
          hasFilters={hasFilters}
          clearFilters={clearFilters}
          openDetails={openDetails}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          currentPageTotal={currentPageTotal}
          totalExpensesAmount={totalExpensesAmount}
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />

      </section>

      {/* Create / edit form */}
      {formOpen ? (
        <ExpenseFormDialog
          editingExpense={editingExpense}
          formValues={formValues}
          fieldErrors={fieldErrors}
          formError={formError}
          saving={saving}
          expenseDatePickerOpen={expenseDatePickerOpen}
          setExpenseDatePickerOpen={setExpenseDatePickerOpen}
          expenseCalendarMonth={expenseCalendarMonth}
          setExpenseCalendarMonth={setExpenseCalendarMonth}
          expenseCalendarDays={expenseCalendarDays}
          specialistPickerOpen={specialistPickerOpen}
          setSpecialistPickerOpen={setSpecialistPickerOpen}
          sourcingSpecialists={sourcingSpecialists}
          specialistSearch={specialistSearch}
          setSpecialistSearch={setSpecialistSearch}
          requestCloseExpenseForm={requestCloseExpenseForm}
          submitExpense={submitExpense}
          updateFormField={updateFormField}
          toggleSourcingSpecialist={toggleSourcingSpecialist}
          getEmployeeAvatarColorClass={getEmployeeAvatarColorClass}
          getEmployeeInitials={getEmployeeInitials}
          formatDate={formatDate}
          todayLocalIso={todayLocalIso}
          receiptPicker={
            <ExpenseReceiptPicker
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
          }
        />
      ) : null}

      <ExpenseDialogs
        discardDialogOpen={discardDialogOpen}
        setDiscardDialogOpen={setDiscardDialogOpen}
        discardExpenseFormChanges={discardExpenseFormChanges}
        detailsOpen={detailsOpen}
        activeExpense={activeExpense}
        activeExpenseUpdatedBy={activeExpenseUpdatedBy}
        closeDetails={() => { setDetailsOpen(false); setBillPreview(null); }}
        billPreview={billPreview}
        setBillPreview={setBillPreview}
        deleteTarget={deleteTarget}
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        setDeleteTarget={setDeleteTarget}
        deleting={deleting}
        deleteExpense={deleteExpense}
        mobileBillPreviewOpen={mobileBillPreviewOpen}
        setMobileBillPreviewOpen={setMobileBillPreviewOpen}
        displayReceiptName={displayReceiptName}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        formatAuditDateTime={formatAuditDateTime}
      />
    </div>
  );
}
