import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import {
  AlertCircle,
  ArrowDownToLine,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CirclePlus,
  ChevronRight,
  Eye,
  FileImage,
  FileText,
  LoaderCircle,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  User,
  UploadCloud,
  Users,
  X,
} from "lucide-react-native";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import { getTabBarContentPadding, getTabBarHeight } from "../constants/layout";
import { mobileApiFetch, mobileApiClient } from "../lib/api-client";
import { notifyMobile } from "../lib/notifications";
import { Card } from "../components/ui/card";
import { AtelierHeader } from "../components/layout/atelier-header";
import { createPdfPreviewHtml } from "../lib/pdf-preview";

type Expense = {
  id: number;
  expenseDate: string;
  amount: number | string;
  categoryNotes: string;
  sourcingSpecialists: SourcingSpecialist[];
  billFileName: string;
  billUrl?: string;
  createdAt?: string;
  updatedAt?: string | null;
};

type SourcingSpecialist = {
  id: number;
  firstName: string;
  lastName?: string | null;
  displayName: string;
  mobile?: string | null;
};

type ExpensePageResult = {
  items: Expense[];
  page: number;
  pageSize: number;
  totalCount: number;
};

type SelectedBill = {
  uri: string;
  name: string;
  size: number;
  type: string;
  file?: Blob;
};

type ExpenseFormValues = {
  expenseDate: string;
  amount: string;
  categoryNotes: string;
  sourcingSpecialistIds: number[];
};

type Notice = { kind: "success" | "error"; message: string };

const SPECIALIST_PALETTE = [
  { background: "#EEF2FF", foreground: "#4338CA" },
  { background: "#F0FDFA", foreground: "#0F766E" },
  { background: "#FFFBEB", foreground: "#B45309" },
  { background: "#F5F3FF", foreground: "#6D28D9" },
  { background: "#F0F9FF", foreground: "#0369A1" },
];

function specialistColor(employee: SourcingSpecialist) {
  const key = employee.id != null
    ? String(employee.id)
    : `${employee.firstName}|${employee.lastName || ""}`;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  return SPECIALIST_PALETTE[(hash >>> 0) % SPECIALIST_PALETTE.length];
}

function specialistInitials(employee: SourcingSpecialist) {
  const first = employee.firstName.trim().charAt(0);
  const last = employee.lastName?.trim().charAt(0) || "";
  return `${first}${last}`.toUpperCase();
}

function SpecialistChip({ employee }: { employee: SourcingSpecialist }) {
  const color = specialistColor(employee);
  return (
    <View
      style={[styles.specialistChip, { backgroundColor: color.background }]}
      accessibilityLabel={employee.displayName}
    >
      <Text style={[styles.specialistChipText, { color: color.foreground }]} numberOfLines={1}>
        {employee.displayName}
      </Text>
    </View>
  );
}

function setNotice(notice: Notice) {
  notifyMobile(notice.kind, notice.message);
}

type ExpenseFieldErrors = {
  expenseDate?: string;
  amount?: string;
  categoryNotes?: string;
  sourcingSpecialistIds?: string;
  bill?: string;
};

const PAGE_SIZE = 10;
const EXPENSE_CARD_GAP = 8;
const MAX_BILL_SIZE = 5 * 1024 * 1024;
const DISPLAY_RECEIPT_FILENAME = "receipt.png";
const PRIMARY = "#78070D";
const PRIMARY_MUTED = "#FBF2F3";
const TEXT = "#231E1C";
const TEXT_MUTED = "#6E6862";
const BORDER = "#E8E2D8";
const SURFACE = "#FFFFFF";
const BACKGROUND = "#FAF7F2";
const SUCCESS = "#059669";
const DANGER = "#DC2626";
const DANGER_BG = "#FEE2E2";
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function localIsoToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function displayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function money(value: number | string) {
  const amount = Number(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename?: string | null) {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toUpperCase() || "" : "";
}

function splitMiddleTruncate(filename?: string | null, endChars = 8) {
  if (!filename) return { start: "", end: "" };
  if (filename.length <= 16) {
    return { start: filename, end: "" };
  }
  const extIndex = filename.lastIndexOf(".");
  const extLen = extIndex !== -1 ? filename.length - extIndex : 0;
  const tailLen = Math.min(
    Math.max(endChars, extLen + 3),
    Math.floor(filename.length / 2)
  );
  return {
    start: filename.slice(0, filename.length - tailLen),
    end: filename.slice(filename.length - tailLen),
  };
}

function mimeFromName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "pdf") return "application/pdf";
  return "application/octet-stream";
}

function filenameFromResponse(response: Response, fallback: string) {
  const disposition = response.headers.get("content-disposition") || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const value = encoded ? decodeURIComponent(encoded) : plain;
  return value?.trim() || fallback;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (typeof navigator !== "undefined" &&
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1);

  if (isIOS) {
    const escapeHtml = (val: string) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return val.replace(/[&<>"']/g, (char) => entities[char] || char);
    };
    const page = new Blob(
      [
        `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Save bill</title><style>body{font:16px -apple-system,BlinkMacSystemFont,sans-serif;padding:24px;color:#0f172a}a{display:block;margin:16px 0;padding:14px;border-radius:12px;background:#78070D;color:white;text-align:center;text-decoration:none;font-weight:700}.hint{color:#475569;line-height:1.5}</style></head><body><h2>Save your bill</h2><p>${escapeHtml(filename)}</p><p class="hint">Tap “Open bill” if Save does not start. In the opened file, use Share and choose “Save to Files”.</p><a href="${objectUrl}" download="${escapeHtml(filename)}">Save bill</a><a href="${objectUrl}" target="_blank" rel="noopener">Open bill</a></body></html>`,
      ],
      { type: "text/html" }
    );
    const pageUrl = URL.createObjectURL(page);
    const opened = window.open(pageUrl, "_blank");
    if (!opened) window.location.href = objectUrl;
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      URL.revokeObjectURL(pageUrl);
    }, 5 * 60_000);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

async function multipartExpenseRequest(
  expenseId: number | null,
  body: FormData
) {
  const response = await mobileApiFetch(
    expenseId === null ? "/api/expenses" : `/api/expenses/${expenseId}`,
    {
      method: expenseId === null ? "POST" : "PUT",
      body,
    }
  );
  return response.json();
}

async function fetchBillResponse(expense: Expense, signal?: AbortSignal) {
  try {
    return await mobileApiFetch(`/api/expenses/${expense.id}/bill`, {
      headers: { Accept: "*/*" },
      signal,
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: number }).status === 404
    ) {
      throw new Error("No receipt was found for this expense.");
    }
    throw error instanceof Error
      ? error
      : new Error("Unable to download receipt.");
  }
}

export default function ExpenseManagementScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const debounceRef = useRef<any>(null);
  const sourcingSpecialistLoadRef = useRef<Promise<void> | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sourcingSpecialists, setSourcingSpecialists] = useState<SourcingSpecialist[]>([]);
  const [specialistsLoading, setSpecialistsLoading] = useState(true);
  const [specialistSearch, setSpecialistSearch] = useState("");
  const [specialistOptionsOpen, setSpecialistOptionsOpen] = useState(false);
  const [draftSourcingSpecialistIds, setDraftSourcingSpecialistIds] = useState<number[]>([]);
  const formScrollRef = useRef<any>(null);
  const formViewportHeightRef = useRef(0);
  const formFieldLayoutsRef = useRef<Record<string, { y: number; height: number }>>({});
  const activeFormFieldRef = useRef<string | null>(null);
  const formScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [listViewportHeight, setListViewportHeight] = useState(0);

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [formVisible, setFormVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [editing, setEditing] = useState<Expense | null>(null);
  const [formValues, setFormValues] = useState<ExpenseFormValues>({
    expenseDate: localIsoToday(),
    amount: "",
    categoryNotes: "",
    sourcingSpecialistIds: [],
  });
  const expenseFormBaselineRef = useRef<{
    values: ExpenseFormValues;
    billFileName: string;
  } | null>(null);
  const discardPromptOpenRef = useRef(false);
  const [selectedBill, setSelectedBill] = useState<SelectedBill | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickingBill, setPickingBill] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ExpenseFieldErrors>({});

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const cameraVideoRef = useRef<any>(null);
  const cameraStreamRef = useRef<any>(null);

  const [billLoading, setBillLoading] = useState(false);
  const billLoadingRef = useRef(false);
  const formReceiptPreviewRequestRef = useRef<AbortController | null>(null);
  const formReceiptPreviewObjectUrlRef = useRef<string | null>(null);
  const [formReceiptPreviewVisible, setFormReceiptPreviewVisible] = useState(false);
  const [formReceiptPreviewUrl, setFormReceiptPreviewUrl] = useState<string | null>(null);
  const [formReceiptPreviewIsPdf, setFormReceiptPreviewIsPdf] = useState(false);
  const [formReceiptPreviewPdfBase64, setFormReceiptPreviewPdfBase64] = useState<string | null>(null);
  const [formReceiptPreviewPdfImage, setFormReceiptPreviewPdfImage] = useState<string | null>(null);
  const [formReceiptPreviewLoading, setFormReceiptPreviewLoading] = useState(false);
  const [formReceiptPreviewError, setFormReceiptPreviewError] = useState("");
  const billPreviewRequestRef = useRef<AbortController | null>(null);
  const [billPreviewVisible, setBillPreviewVisible] = useState(false);
  const [billPreviewUrl, setBillPreviewUrl] = useState<string | null>(null);
  const [billPreviewIsPdf, setBillPreviewIsPdf] = useState(false);
  const [billPreviewPdfBase64, setBillPreviewPdfBase64] = useState<string | null>(null);
  const [billPreviewPdfImage, setBillPreviewPdfImage] = useState<string | null>(null);
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const expenseCardHeight = listViewportHeight
    ? Math.max(1, (listViewportHeight - getTabBarContentPadding(insets.bottom) - 2 - 5 * EXPENSE_CARD_GAP) / 6)
    : 82;

  useEffect(() => () => {
    formReceiptPreviewRequestRef.current?.abort();
    if (formReceiptPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(formReceiptPreviewObjectUrlRef.current);
    }
  }, []);

  const centerFormField = useCallback((field: string, delay = 0, animated = true) => {
    activeFormFieldRef.current = field;
    if (formScrollTimerRef.current) clearTimeout(formScrollTimerRef.current);
    formScrollTimerRef.current = setTimeout(() => {
      const layout = formFieldLayoutsRef.current[field];
      const viewportHeight = formViewportHeightRef.current;
      if (!layout || !viewportHeight) return;
      formScrollRef.current?.scrollTo({
        y: Math.max(0, layout.y + layout.height / 2 - viewportHeight / 2),
        animated,
      });
    }, delay);
  }, []);

  const loadMoreRef = useRef(false);
  const currentPageRef = useRef(1);

  // Infinite scroll: load a page and append or replace
  const loadExpenses = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setPageLoading(true);
      setLoadFailed(false);

      currentPageRef.current = 1;

      const query = new URLSearchParams({
        page: "1",
        pageSize: String(PAGE_SIZE),
      });
      if (search.trim()) query.set("search", search.trim());
      if (fromDate) query.set("fromDate", fromDate);
      if (toDate) query.set("toDate", toDate);
      try {
        const result = await mobileApiClient<ExpensePageResult | Expense[]>(
          `/api/expenses?${query.toString()}`
        );
        let newItems: Expense[];
        let newTotal: number;
        if (Array.isArray(result)) {
          newItems = result.slice(0, PAGE_SIZE);
          newTotal = result.length;
        } else {
          newItems = Array.isArray(result.items) ? result.items : [];
          newTotal = Number(result.totalCount) || 0;
        }
        setExpenses(newItems);
        setTotalCount(newTotal);
      } catch (error) {
        setLoadFailed(true);
        setExpenses([]);
        setTotalCount(0);
      } finally {
        setPageLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        loadMoreRef.current = false;
      }
    },
    [fromDate, refreshKey, search, toDate]
  );

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const loadSourcingSpecialists = useCallback(() => {
    if (sourcingSpecialistLoadRef.current) return sourcingSpecialistLoadRef.current;

    setSpecialistsLoading(true);
    const request = (async () => {
      try {
        const employees = await mobileApiClient<SourcingSpecialist[]>("/api/expenses/sourcing-specialists");
        setSourcingSpecialists(Array.isArray(employees) ? employees : []);
      } catch (error) {
        setNotice({
          kind: "error",
          message: error instanceof Error ? error.message : "Unable to load staff members.",
        });
      } finally {
        setSpecialistsLoading(false);
        sourcingSpecialistLoadRef.current = null;
      }
    })();
    sourcingSpecialistLoadRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    void loadSourcingSpecialists();
  }, [loadSourcingSpecialists]);

  useEffect(() => {
    const keyboardSubscription = Keyboard.addListener("keyboardDidShow", () => {
      if (activeFormFieldRef.current) {
        centerFormField(activeFormFieldRef.current, 50);
      }
    });
    return () => {
      keyboardSubscription.remove();
      if (formScrollTimerRef.current) clearTimeout(formScrollTimerRef.current);
    };
  }, [centerFormField]);

  // Trigger loading next page
  const loadMore = useCallback(async () => {
    if (
      loadMoreRef.current ||
      pageLoading ||
      loadingMore ||
      expenses.length >= totalCount ||
      totalCount === 0
    ) {
      return;
    }
    loadMoreRef.current = true;
    setLoadingMore(true);
    const nextPage = currentPageRef.current + 1;
    const query = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(PAGE_SIZE),
    });
    if (search.trim()) query.set("search", search.trim());
    if (fromDate) query.set("fromDate", fromDate);
    if (toDate) query.set("toDate", toDate);

    try {
      const result = await mobileApiClient<ExpensePageResult | Expense[]>(
        `/api/expenses?${query.toString()}`
      );
      let newItems: Expense[];
      let newTotal: number;
      if (Array.isArray(result)) {
        newItems = result.slice((nextPage - 1) * PAGE_SIZE, nextPage * PAGE_SIZE);
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
    } catch (err) {
      console.warn("Failed to load more expenses", err);
      setNotice({
        kind: "error",
        message: err instanceof Error ? err.message : "Could not load more expenses.",
      });
    } finally {
      setLoadingMore(false);
      loadMoreRef.current = false;
    }
  }, [expenses.length, fromDate, loadingMore, pageLoading, search, toDate, totalCount]);

  const hasFilters = Boolean(search || fromDate || toDate);
  const hasDateFilter = Boolean(fromDate && toDate);
  const calendarDaySize = Math.max(29, Math.min(34, Math.floor((windowWidth - 112) / 7)));
  const dateSheetMaxHeight = Math.min(windowHeight * 0.78, 620);
  const filteredSourcingSpecialists = useMemo(() => {
    const term = specialistSearch.trim().toLowerCase();
    return sourcingSpecialists.filter((employee) =>
      !term || employee.displayName.toLowerCase().includes(term)
    );
  }, [sourcingSpecialists, specialistSearch]);

  const toggleSourcingSpecialist = (employeeId: number) => {
    Keyboard.dismiss();
    setFormValues((current) => ({
      ...current,
      sourcingSpecialistIds: current.sourcingSpecialistIds.includes(employeeId)
        ? current.sourcingSpecialistIds.filter((id) => id !== employeeId)
        : [...current.sourcingSpecialistIds, employeeId],
    }));
    clearFieldError("sourcingSpecialistIds");
    setFormError("");
  };

  const toggleDraftSourcingSpecialist = (employeeId: number) => {
    Keyboard.dismiss();
    setDraftSourcingSpecialistIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  };

  const calendarCells = useMemo(() => {
    const first = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1
    );
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [calendarMonth]);

  const clearFieldError = (field: keyof ExpenseFieldErrors) => {
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const isExpenseFormDirty = useCallback(() => {
    const baseline = expenseFormBaselineRef.current;
    if (!baseline) return false;
    return (
      JSON.stringify(formValues) !== JSON.stringify(baseline.values) ||
      Boolean(selectedBill) ||
      (editing?.billFileName || "") !== baseline.billFileName
    );
  }, [editing?.billFileName, formValues, selectedBill]);

  const dismissExpenseForm = useCallback(() => {
    expenseFormBaselineRef.current = null;
    setFormVisible(false);
    setDatePickerVisible(false);
    setSpecialistOptionsOpen(false);
    setSpecialistSearch("");
    Keyboard.dismiss();
  }, []);

  const requestCloseExpenseForm = useCallback(() => {
    if (saving) return;
    if (!isExpenseFormDirty()) {
      dismissExpenseForm();
      return;
    }
    if (discardPromptOpenRef.current) return;
    discardPromptOpenRef.current = true;
    Alert.alert(
      "Discard changes?",
      "Your unsaved expense changes will be lost.",
      [
        {
          text: "Keep Editing",
          style: "cancel",
          onPress: () => { discardPromptOpenRef.current = false; },
        },
        {
          text: "Discard Changes",
          style: "destructive",
          onPress: () => {
            discardPromptOpenRef.current = false;
            dismissExpenseForm();
          },
        },
      ],
      { cancelable: true, onDismiss: () => { discardPromptOpenRef.current = false; } }
    );
  }, [dismissExpenseForm, isExpenseFormDirty, saving]);

  const removalGuardNavigation = useMemo(
    () => navigation as unknown as {
      addListener: (
        eventName: "beforeRemove",
        listener: (event: {
          preventDefault: () => void;
          data?: { action?: unknown };
        }) => void
      ) => () => void;
      dispatch: (action: never) => void;
    },
    [navigation]
  );

  useEffect(() => removalGuardNavigation.addListener("beforeRemove", (event) => {
    if (!formVisible || !isExpenseFormDirty() || saving) return;
    event.preventDefault();
    if (discardPromptOpenRef.current) return;
    discardPromptOpenRef.current = true;
    Alert.alert(
      "Discard changes?",
      "Your unsaved expense changes will be lost.",
      [
        {
          text: "Keep Editing",
          style: "cancel",
          onPress: () => { discardPromptOpenRef.current = false; },
        },
        {
          text: "Discard Changes",
          style: "destructive",
          onPress: () => {
            discardPromptOpenRef.current = false;
            dismissExpenseForm();
            if (event.data?.action) {
              removalGuardNavigation.dispatch(event.data.action as never);
            }
          },
        },
      ],
      { cancelable: true, onDismiss: () => { discardPromptOpenRef.current = false; } }
    );
  }), [dismissExpenseForm, formVisible, isExpenseFormDirty, removalGuardNavigation, saving]);

  const newExpense = () => {
    Keyboard.dismiss();
    setEditing(null);
    setDatePickerVisible(false);
    const initialValues: ExpenseFormValues = {
      expenseDate: localIsoToday(),
      amount: "",
      categoryNotes: "",
      sourcingSpecialistIds: [],
    };
    expenseFormBaselineRef.current = { values: initialValues, billFileName: "" };
    setFormValues(initialValues);
    setSpecialistSearch("");
    setSpecialistOptionsOpen(false);
    setSelectedBill(null);
    setFormError("");
    setFieldErrors({});
    setFormVisible(true);
  };

  const editExpense = (expense: Expense) => {
    setEditing(expense);
    setDatePickerVisible(false);
    const initialValues: ExpenseFormValues = {
      expenseDate: expense.expenseDate.slice(0, 10),
      amount: String(expense.amount),
      categoryNotes: expense.categoryNotes,
      sourcingSpecialistIds: (expense.sourcingSpecialists || []).map((employee) => employee.id),
    };
    expenseFormBaselineRef.current = {
      values: { ...initialValues, sourcingSpecialistIds: [...initialValues.sourcingSpecialistIds] },
      billFileName: expense.billFileName || "",
    };
    setFormValues(initialValues);
    setSpecialistSearch("");
    setSpecialistOptionsOpen(false);
    setSelectedBill(null);
    setFormError("");
    setFieldErrors({});
    setFormVisible(true);
  };

  // 300ms debounced search
  const handleSearchChange = (text: string) => {
    setSearchDraft(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setExpenses([]);
      setSearch(text.trim());
    }, 300);
  };

  const applySearchImmediate = () => {
    Keyboard.dismiss();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setExpenses([]);
    setSearch(searchDraft.trim());
  };

  const clearSearch = () => {
    Keyboard.dismiss();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchDraft("");
    setExpenses([]);
    setSearch("");
  };

  // Pull-to-refresh
  const handleRefresh = async () => {
    try {
      await loadExpenses(true);
    } catch {
      setNotice({ kind: "error", message: "Refresh failed. Please try again." });
    }
  };

  // Take photo (opens camera directly with viewfinder & shutter)
  const startCamera = async () => {
    if (Platform.OS === "web") {
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.mediaDevices &&
          navigator.mediaDevices.getUserMedia
        ) {
          setCameraOpen(true);
          setCameraLoading(true);
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          cameraStreamRef.current = stream;
          setCameraLoading(false);
          setTimeout(() => {
            if (cameraVideoRef.current) {
              cameraVideoRef.current.srcObject = stream;
              cameraVideoRef.current.play().catch(() => {});
            }
          }, 80);
          return;
        }
      } catch (err) {
        console.warn("Camera stream unavailable, using native camera picker", err);
        setCameraOpen(false);
        setCameraLoading(false);
      }
    }
    fallbackCameraPicker();
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      try {
        cameraStreamRef.current.getTracks().forEach((track: any) => track.stop());
      } catch {}
      cameraStreamRef.current = null;
    }
    setCameraOpen(false);
    setCameraLoading(false);
  };

  const capturePhoto = () => {
    if (Platform.OS === "web" && cameraVideoRef.current) {
      const video = cameraVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            const filename = `receipt-${Date.now()}.jpg`;
            const file =
              typeof window !== "undefined" && typeof (window as any).File !== "undefined"
                ? new (window as any).File([blob], filename, { type: "image/jpeg" })
                : blob;
            setSelectedBill({
              uri: URL.createObjectURL(blob),
              name: filename,
              size: blob.size,
              type: "image/jpeg",
              file,
            });
            clearFieldError("bill");
            setFormError("");
            stopCamera();
          },
          "image/jpeg",
          0.92
        );
        return;
      }
    }
    stopCamera();
  };

  const fallbackCameraPicker = () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.setAttribute("capture", "environment");
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > MAX_BILL_SIZE) {
          setNotice({
            kind: "error",
            message: "Receipt files must be 5 MB or smaller.",
          });
          return;
        }
        setSelectedBill({
          uri: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.type || mimeFromName(file.name),
          file,
        });
        clearFieldError("bill");
        setFormError("");
      };
      input.click();
      return;
    }

    setPickingBill(true);
    File.pickFileAsync({
      mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    })
      .then((result) => {
        if (result.canceled) return;
        const file = result.result;
        if (file.size !== null && file.size > MAX_BILL_SIZE) {
          notifyMobile("error", "Receipt files must be 5 MB or smaller.", "File too large");
          return;
        }
        setSelectedBill({
          uri: file.uri,
          name: file.name,
          size: file.size ?? 0,
          type: file.type || mimeFromName(file.name),
          file,
        });
        clearFieldError("bill");
        setFormError("");
      })
      .catch((error) => {
        notifyMobile("error", error instanceof Error ? error.message : "Please try again.", "Unable to take photo");
      })
      .finally(() => {
        setPickingBill(false);
      });
  };

  const takePhoto = async () => {
    if (Platform.OS === "web") {
      await startCamera();
      return;
    }

    setPickingBill(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        notifyMobile("warning", "Allow camera access to take a receipt photo.", "Camera permission required");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.9,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.uri) {
        throw new Error("The camera did not return a photo. Please try again.");
      }

      const fallbackExtension = asset.mimeType?.toLowerCase().includes("png") ? "png" : "jpg";
      const name = asset.fileName || `receipt-${Date.now()}.${fallbackExtension}`;
      const type = asset.mimeType || mimeFromName(name);
      const file = new File(asset.uri);
      const size = asset.fileSize ?? file.size ?? 0;
      if (size > MAX_BILL_SIZE) {
        notifyMobile("error", "Receipt files must be 5 MB or smaller.", "Photo too large");
        return;
      }

      setSelectedBill({ uri: asset.uri, name, size, type, file });
      clearFieldError("bill");
      setFormError("");
    } catch (error) {
      notifyMobile(
        "error",
        error instanceof Error ? error.message : "Please try taking the photo again.",
        "Unable to take photo"
      );
    } finally {
      setPickingBill(false);
    }
  };

  // Upload file (picker)
  const chooseBill = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
          setNotice({
            kind: "error",
            message: "Choose a JPG, PNG, or WEBP image receipt.",
          });
          return;
        }
        if (file.size > MAX_BILL_SIZE) {
          setNotice({
            kind: "error",
            message: "Receipt files must be 5 MB or smaller.",
          });
          return;
        }
        setSelectedBill({
          uri: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.type || mimeFromName(file.name),
          file,
        });
        clearFieldError("bill");
        setFormError("");
      };
      input.click();
      return;
    }

    setPickingBill(true);
    try {
      const result = await File.pickFileAsync({
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
      if (result.canceled) return;
      const file = result.result;
      const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        notifyMobile("validation", "Choose a JPG, PNG, or WEBP image receipt.", "Unsupported file");
        return;
      }
      if (file.size !== null && file.size > MAX_BILL_SIZE) {
        notifyMobile("error", "Receipt files must be 5 MB or smaller.", "File too large");
        return;
      }
      setSelectedBill({
        uri: file.uri,
        name: file.name,
        size: file.size ?? 0,
        type: file.type || mimeFromName(file.name),
        file,
      });
      clearFieldError("bill");
      setFormError("");
    } catch (error) {
      notifyMobile(
        "error",
        error instanceof Error ? error.message : "Please try choosing the file again.",
        "Unable to choose receipt"
      );
    } finally {
      setPickingBill(false);
    }
  };

  const saveExpense = async () => {
    setFormError("");

    const amount = Number(formValues.amount);
    const newErrors: ExpenseFieldErrors = {};

    if (!formValues.expenseDate) {
      newErrors.expenseDate = "Expense date is required";
    } else if (formValues.expenseDate > localIsoToday()) {
      newErrors.expenseDate = "Expense date cannot be in the future";
    }

    if (!formValues.amount.trim()) {
      newErrors.amount = "Valid amount is required";
    } else if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 9999999.99
    ) {
      newErrors.amount = "Enter a valid amount up to ₹99,99,999.99";
    } else if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) {
      newErrors.amount = "Amount can have at most 2 decimal places";
    }

    const notes = formValues.categoryNotes.trim();
    if (notes && (notes.length < 2 || notes.length > 250)) {
      newErrors.categoryNotes = "Notes must contain 2 to 250 characters";
    }

    if (formValues.sourcingSpecialistIds.length === 0) {
      newErrors.sourcingSpecialistIds = "Select at least one team member";
    }

    if (!selectedBill && !editing?.billFileName) {
      newErrors.bill = "Receipt file is required";
    } else if (selectedBill && selectedBill.size > MAX_BILL_SIZE) {
      newErrors.bill = "Receipt files must be 5 MB or smaller";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      notifyMobile("validation", "Please complete the highlighted fields.");
      return;
    }

    setFieldErrors({});
    setFormError("");

    const body = new FormData();
    body.append("expenseDate", formValues.expenseDate);
    body.append("amount", formValues.amount);
    body.append("categoryNotes", formValues.categoryNotes.trim());
    formValues.sourcingSpecialistIds.forEach((id) => body.append("sourcingSpecialistIds", String(id)));
    if (selectedBill) {
      if (selectedBill.file) {
        body.append("bill", selectedBill.file, selectedBill.name);
      } else if (Platform.OS !== "web") {
        body.append("bill", new File(selectedBill.uri), selectedBill.name);
      }
    }

    setSaving(true);
    try {
      await multipartExpenseRequest(editing?.id ?? null, body);
      dismissExpenseForm();
      setNotice({
        kind: "success",
        message: editing
          ? "Expense updated successfully."
          : "Expense added successfully.",
      });
      setExpenses([]);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save this expense."
      );
    } finally {
      setSaving(false);
    }
  };

  const closeFormReceiptPreview = () => {
    formReceiptPreviewRequestRef.current?.abort();
    formReceiptPreviewRequestRef.current = null;
    if (formReceiptPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(formReceiptPreviewObjectUrlRef.current);
      formReceiptPreviewObjectUrlRef.current = null;
    }
    setFormReceiptPreviewVisible(false);
    setFormReceiptPreviewUrl(null);
    setFormReceiptPreviewIsPdf(false);
    setFormReceiptPreviewPdfBase64(null);
    setFormReceiptPreviewPdfImage(null);
    setFormReceiptPreviewLoading(false);
    setFormReceiptPreviewError("");
  };

  const openFormReceiptPreview = async () => {
    formReceiptPreviewRequestRef.current?.abort();
    if (formReceiptPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(formReceiptPreviewObjectUrlRef.current);
      formReceiptPreviewObjectUrlRef.current = null;
    }
    setFormReceiptPreviewUrl(null);
    setFormReceiptPreviewIsPdf(false);
    setFormReceiptPreviewPdfBase64(null);
    setFormReceiptPreviewPdfImage(null);
    setFormReceiptPreviewError("");
    setFormReceiptPreviewVisible(true);
    Keyboard.dismiss();

    if (selectedBill) {
      const isPdf = selectedBill.type.toLowerCase().includes("pdf") || selectedBill.name.toLowerCase().endsWith(".pdf");
      setFormReceiptPreviewIsPdf(isPdf);
      setFormReceiptPreviewUrl(selectedBill.uri);
      return;
    }

    if (!editing?.billFileName) {
      setFormReceiptPreviewError("No receipt is attached to this expense.");
      return;
    }

    const request = new AbortController();
    formReceiptPreviewRequestRef.current = request;
    setFormReceiptPreviewLoading(true);
    try {
      const response = await fetchBillResponse(editing, request.signal);
      if (!response.ok) throw new Error("Unable to load this receipt.");
      const filename = filenameFromResponse(response, editing.billFileName);
      const contentType = response.headers.get("content-type") || mimeFromName(filename);
      const isPdf = contentType.toLowerCase().includes("application/pdf") || filename.toLowerCase().endsWith(".pdf");
      const bytes = await response.arrayBuffer();
      if (request.signal.aborted) return;
      setFormReceiptPreviewIsPdf(isPdf);

      if (Platform.OS === "web") {
        const objectUrl = URL.createObjectURL(new Blob([bytes], { type: contentType }));
        formReceiptPreviewObjectUrlRef.current = objectUrl;
        setFormReceiptPreviewUrl(objectUrl);
      } else if (isPdf) {
        const bytesView = new Uint8Array(bytes);
        let binary = "";
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytesView.length; offset += chunkSize) {
          binary += String.fromCharCode(...bytesView.subarray(offset, offset + chunkSize));
        }
        setFormReceiptPreviewPdfBase64(btoa(binary));
      } else {
        const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const previewFile = new File(Paths.cache, `expense-${editing.id}-${Date.now()}-${safeFilename}`);
        await previewFile.write(new Uint8Array(bytes));
        if (request.signal.aborted) return;
        setFormReceiptPreviewUrl(previewFile.uri);
      }
    } catch (error) {
      if (!request.signal.aborted) {
        setFormReceiptPreviewError(error instanceof Error ? error.message : "Unable to load this receipt.");
      }
    } finally {
      if (!request.signal.aborted) {
        formReceiptPreviewRequestRef.current = null;
        setFormReceiptPreviewLoading(false);
      }
    }
  };

  const downloadBill = async (expense?: Expense) => {
    if (!expense && selectedBill) {
      if (billLoadingRef.current) return;
      billLoadingRef.current = true;
      setBillLoading(true);
      try {
        if (Platform.OS === "web" && selectedBill.file) {
          triggerBrowserDownload(selectedBill.file, selectedBill.name);
        } else if (Platform.OS !== "web") {
          const canShare = await Sharing.isAvailableAsync();
          if (!canShare) {
            throw new Error("Native file sharing is not available on this device.");
          }
          await Sharing.shareAsync(selectedBill.uri, {
            mimeType: selectedBill.type,
            dialogTitle: selectedBill.name,
          });
        } else {
          throw new Error("The selected receipt file is unavailable.");
        }
        setNotice({
          kind: "success",
          message: "Receipt downloaded successfully.",
        });
      } catch (error) {
        setNotice({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to download the selected bill.",
        });
      } finally {
        billLoadingRef.current = false;
        setBillLoading(false);
      }
      return;
    }
    if (!expense) return;
    if (billLoadingRef.current) return;

    billLoadingRef.current = true;
    setBillLoading(true);
    try {
      let waitForNativeShareDismissal = false;
      const response = await fetchBillResponse(expense);
      const filename = filenameFromResponse(
        response,
        expense.billFileName || `expense-${expense.id}-bill`
      );
      const contentType =
        response.headers.get("content-type") || mimeFromName(filename);
      const bytes = await response.arrayBuffer();
      if (Platform.OS === "web") {
        const blob = new Blob([bytes], { type: contentType });
        const WebFile = globalThis.File;
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.share === "function" &&
          typeof WebFile === "function"
        ) {
          const shareFile = new WebFile([blob], filename, { type: contentType });
          if (navigator.canShare?.({ files: [shareFile] })) {
            await navigator.share({ files: [shareFile], title: filename });
          } else {
            triggerBrowserDownload(blob, filename);
          }
        } else {
          triggerBrowserDownload(blob, filename);
        }
      } else {
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const savedFile = new File(Paths.document, safeName);
        await savedFile.write(new Uint8Array(bytes));
        if (Platform.OS === "ios") {
          const result = await Share.share(
            { url: savedFile.uri },
            { dialogTitle: filename }
          );
          if (result.action === Share.dismissedAction) return;
          waitForNativeShareDismissal = true;
        } else {
          const canShare = await Sharing.isAvailableAsync();
          if (!canShare) {
            throw new Error("Native file sharing is not available on this device.");
          }
          await Sharing.shareAsync(savedFile.uri, {
            mimeType: contentType,
            dialogTitle: filename,
          });
          waitForNativeShareDismissal = true;
        }
      }
      // Let the native share sheet fully close before presenting the toast Modal.
      if (waitForNativeShareDismissal) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      setNotice({ kind: "success", message: "Receipt downloaded successfully." });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setNotice({
        kind: "error",
        message: "Failed to download receipt. Please try again.",
      });
    } finally {
      billLoadingRef.current = false;
      setBillLoading(false);
    }
  };

  const openBillPreview = async (expense: Expense) => {
    if (billLoadingRef.current) return;
    billPreviewRequestRef.current?.abort();
    const request = new AbortController();
    billPreviewRequestRef.current = request;
    billLoadingRef.current = true;
    setActiveExpense(expense);
    setDetailVisible(false);
    setBillPreviewVisible(false);
    setBillLoading(true);
    setBillPreviewUrl(null);
    setBillPreviewPdfBase64(null);
    setBillPreviewPdfImage(null);
    setBillPreviewIsPdf(false);

    try {
      if (Platform.OS !== "web") await new Promise((resolve) => setTimeout(resolve, 260));
      if (request.signal.aborted) return;
      setBillPreviewVisible(true);
      const response = await fetchBillResponse(expense, request.signal);
      if (!response.ok) throw new Error("Unable to load this receipt.");
      const filename = filenameFromResponse(response, expense.billFileName || `expense-${expense.id}-bill`);
      const contentType = response.headers.get("content-type") || mimeFromName(filename);
      const isPdf = contentType.toLowerCase().includes("application/pdf") || filename.toLowerCase().endsWith(".pdf");
      const bytes = await response.arrayBuffer();
      if (request.signal.aborted) return;
      setBillPreviewIsPdf(isPdf);

      if (Platform.OS === "web") {
        setBillPreviewUrl(URL.createObjectURL(new Blob([bytes], { type: contentType })));
      } else if (isPdf) {
        const bytesView = new Uint8Array(bytes);
        let binary = "";
        const chunkSize = 0x8000;
        for (let offset = 0; offset < bytesView.length; offset += chunkSize) {
          binary += String.fromCharCode(...bytesView.subarray(offset, offset + chunkSize));
        }
        setBillPreviewPdfBase64(btoa(binary));
      } else {
        const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const previewFile = new File(Paths.cache, `${expense.id}-${Date.now()}-${safeFilename}`);
        await previewFile.write(new Uint8Array(bytes));
        if (request.signal.aborted) return;
        setBillPreviewUrl(previewFile.uri);
      }
    } catch (error) {
      if (!request.signal.aborted) {
        setBillPreviewUrl(null);
        setNotice({
          kind: "error",
          message: error instanceof Error ? error.message : "Unable to load receipt preview.",
        });
      }
    } finally {
      if (billPreviewRequestRef.current === request) {
        billPreviewRequestRef.current = null;
        billLoadingRef.current = false;
        setBillLoading(false);
      }
    }
  };

  const closeBillPreview = () => {
    billPreviewRequestRef.current?.abort();
    billPreviewRequestRef.current = null;
    billLoadingRef.current = false;
    setBillLoading(false);
    setBillPreviewVisible(false);
    if (Platform.OS === "web" && billPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(billPreviewUrl);
    }
    setBillPreviewUrl(null);
    setBillPreviewPdfBase64(null);
    setBillPreviewPdfImage(null);
    setBillPreviewIsPdf(false);
  };

  const confirmDelete = (expense: Expense) => {
    if (deletingId !== null) return;
    requestAnimationFrame(() => setExpenseToDelete(expense));
  };

  const executeDelete = async (expense: Expense) => {
    if (deletingId !== null) return;
    setDeletingId(expense.id);
    try {
      await mobileApiFetch(
        `/api/expenses/${encodeURIComponent(String(expense.id))}`,
        { method: "DELETE" }
      );
      setExpenses((current) => current.filter((item) => item.id !== expense.id));
      setTotalCount((count) => Math.max(0, count - 1));
      void loadExpenses(true);
      setExpenseToDelete(null);
      // Close detail view if the deleted expense was being viewed
      if (activeExpense?.id === expense.id) {
        setDetailVisible(false);
        setActiveExpense(null);
      }
      setNotice({
        kind: "success",
        message: "Expense deleted successfully.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete the expense.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openDateFilter = () => {
    Keyboard.dismiss();
    setFromDraft(fromDate);
    setToDraft(toDate);
    if (fromDate) {
      const parsed = new Date(`${fromDate}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
    }
    setFiltersVisible(true);
  };

  const applyDateRange = () => {
    if (!fromDraft || !toDraft) return;
    Keyboard.dismiss();
    if (fromDraft > toDraft) {
      notifyMobile("validation", "The start date must be before the end date.", "Check date range");
      return;
    }
    setExpenses([]);
    setFromDate(fromDraft);
    setToDate(toDraft);
    setFiltersVisible(false);
  };

  const clearDateRange = () => {
    Keyboard.dismiss();
    setFromDraft("");
    setToDraft("");
    setExpenses([]);
    setFromDate("");
    setToDate("");
    setFiltersVisible(false);
  };

  const clearFilters = () => {
    Keyboard.dismiss();
    setSearchDraft("");
    setExpenses([]);
    setSearch("");
    setFromDraft("");
    setToDraft("");
    setFromDate("");
    setToDate("");
    setFiltersVisible(false);
  };

  // Open detail view for a card tap
  const openExpenseDetail = (expense: Expense) => {
    Keyboard.dismiss();
    setActiveExpense(expense);
    setBillPreviewVisible(false);
    setDetailVisible(true);
  };

  const hasFormFile = Boolean(selectedBill || (editing && editing.billFileName));
  const formFileName = selectedBill?.name || editing?.billFileName || "";
  const formFileDisplayName = hasFormFile ? DISPLAY_RECEIPT_FILENAME : "";
  const formFileIsPdf = formFileName.toLowerCase().endsWith(".pdf");
  const formFileExt = getFileExtension(formFileName) || (formFileIsPdf ? "PDF" : "IMG");
  const formFileSize = selectedBill?.size ? formatFileSize(selectedBill.size) : "";
  const formFileMeta = formFileSize
    ? `${formFileExt} · ${formFileSize}`
    : `${formFileExt} · Attached receipt`;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      {/* EXPENSE DETAIL MODAL (Opens on card tap) */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setDetailVisible(false)}
          />
          <View
            style={[
              styles.modalCard,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            ]}
          >
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.modalHeader}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>Expense details</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDetailVisible(false)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close expense details"
              >
                <X size={17} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            {activeExpense ? (
              <ScrollView
                style={{
                  maxHeight: Math.min(
                    520,
                    Math.max(180, windowHeight - insets.top - insets.bottom - 116)
                  ),
                  flexShrink: 1,
                }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 20,
                  gap: 0,
                }}
              >
                {/* ── HERO BAND ── */}
                <View
                  style={{
                    borderRadius: 18,
                    overflow: "hidden",
                    marginBottom: 10,
                    backgroundColor: "#fff5f5",
                    borderWidth: 1,
                    borderColor: "#fda4af",
                    padding: 16,
                  }}
                >
                  {/* Amount and date share one compact row. */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: PRIMARY, letterSpacing: 0.45, marginBottom: 3 }}>
                        TOTAL AMOUNT
                      </Text>
                      <Text style={{ fontSize: 29, fontWeight: "800", color: PRIMARY, letterSpacing: -0.7, lineHeight: 33 }}>
                        {money(activeExpense.amount)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: SURFACE, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "#fda4af" }}>
                      <CalendarDays size={12} color={PRIMARY} />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: TEXT }}>
                        {displayDate(activeExpense.expenseDate)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sourcingSpecialistDetail}>
                  <Text style={styles.sourcingSpecialistDetailLabel}>HANDLED BY</Text>
                  {activeExpense.sourcingSpecialists?.length ? (
                    <View style={styles.detailSpecialistChips}>
                      {activeExpense.sourcingSpecialists.map((employee) => (
                        <SpecialistChip key={employee.id} employee={employee} />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.sourcingSpecialistNoAssignment}>No staff assigned</Text>
                  )}
                </View>

                {/* ── NOTES STRIP ── */}
                {activeExpense.categoryNotes ? (
                  <View
                    style={{
                      backgroundColor: SURFACE,
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      marginBottom: 10,
                      borderLeftWidth: 3,
                      borderLeftColor: PRIMARY,
                      borderWidth: 1,
                      borderColor: BORDER,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "800", color: TEXT_MUTED, letterSpacing: 0.5, marginBottom: 4 }}>
                      NOTES / PURPOSE
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: TEXT, lineHeight: 20 }}>
                      {activeExpense.categoryNotes}
                    </Text>
                  </View>
                ) : null}

                {/* ── BILL / RECEIPT ROW ── */}
                {activeExpense.billFileName ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: SURFACE,
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: BORDER,
                      gap: 10,
                    }}
                  >
                    {/* icon */}
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center" }}>
                      {activeExpense.billFileName.toLowerCase().endsWith(".pdf") ? (
                        <FileText size={20} color={PRIMARY} />
                      ) : (
                        <FileImage size={20} color={PRIMARY} />
                      )}
                    </View>
                    {/* name + type */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: TEXT }} numberOfLines={1} ellipsizeMode="middle">
                        {DISPLAY_RECEIPT_FILENAME}
                      </Text>
                      <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 1 }}>
                        {activeExpense.billFileName.toLowerCase().endsWith(".pdf") ? "PDF Document" : "Receipt Image"}
                      </Text>
                    </View>
                    {/* View receipt — icon only */}
                    <TouchableOpacity
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFC2D5" }}
                      onPress={() => void openBillPreview(activeExpense)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel="View receipt"
                    >
                      <Eye size={16} color={PRIMARY} />
                    </TouchableOpacity>
                    {/* Download icon only — no label */}
                    <TouchableOpacity
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" }}
                      onPress={() => void downloadBill(activeExpense)}
                      disabled={billLoading}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel="Download receipt"
                    >
                      {billLoading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <ArrowDownToLine size={16} color="#ffffff" />
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: BACKGROUND, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: BORDER }}>
                    <FileText size={16} color={TEXT_MUTED} />
                    <Text style={{ fontSize: 12.5, color: TEXT_MUTED, fontStyle: "italic" }}>No receipt attached</Text>
                  </View>
                )}

                {/* Edit and delete actions are labeled on the detail page. */}
                <View style={styles.detailActionFooter}>
                  <TouchableOpacity
                    style={styles.actionIconButtonEdit}
                    onPress={() => {
                      setDetailVisible(false);
                      editExpense(activeExpense);
                    }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Edit expense"
                  >
                    <Pencil size={18} color={TEXT} />
                    <Text style={styles.detailActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionIconButtonDelete}
                    onPress={() => {
                      setDetailVisible(false);
                      confirmDelete(activeExpense);
                    }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Delete expense"
                  >
                    <Trash2 size={18} color={PRIMARY} />
                    <Text style={styles.detailActionDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* 5. BILL PREVIEW MODAL (Tapping View opens bill preview from downward) */}
      <Modal
        visible={billPreviewVisible}
        animationType="slide"
        transparent
        onRequestClose={closeBillPreview}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeBillPreview}
          />
          <View
            style={[
              styles.modalCard,
              { maxHeight: "90%", paddingBottom: Math.max(insets.bottom, 16) + 14 },
            ]}
          >
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {activeExpense?.billFileName || "Bill preview"}
                </Text>
                <Text style={styles.modalSubtitle}>Receipt preview</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeBillPreview}
                  activeOpacity={0.7}
                >
                  <X size={17} color={TEXT_MUTED} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.billPreviewContainer}>
              {billPreviewIsPdf && billPreviewPdfBase64 && Platform.OS !== "web" ? (
                <>
                  {billPreviewPdfImage ? (
                    <Image
                      source={{ uri: billPreviewPdfImage }}
                      style={styles.billPreviewImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="large" color={PRIMARY} />
                      <Text style={styles.loadingText}>Preparing PDF preview…</Text>
                    </View>
                  )}
                  <WebView
                    source={{ html: createPdfPreviewHtml(billPreviewPdfBase64) }}
                    originWhitelist={["*"]}
                    javaScriptEnabled
                    style={styles.pdfRenderWorker}
                    onMessage={(event) => {
                      const value = event.nativeEvent.data;
                      if (value.startsWith("data:image/png;base64,")) {
                        setBillPreviewPdfImage(value);
                      } else {
                        setNotice({ kind: "error", message: "Unable to render this PDF receipt." });
                      }
                    }}
                    onError={() => setNotice({ kind: "error", message: "Unable to render this PDF receipt." })}
                  />
                </>
              ) : billLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={PRIMARY} />
                  <Text style={styles.loadingText}>Loading receipt…</Text>
                </View>
              ) : billPreviewIsPdf && billPreviewPdfBase64 ? (
                Platform.OS === "web" ? (
                  billPreviewUrl ? (
                    <iframe
                      src={billPreviewUrl}
                      style={{ width: "100%", height: 360, border: "none", borderRadius: 12 }}
                      title="Receipt PDF"
                    />
                  ) : null
                ) : null
              ) : billPreviewUrl ? (
                billPreviewIsPdf ? (
                  Platform.OS === "web" ? (
                    <iframe
                      src={billPreviewUrl}
                      style={{ width: "100%", height: 360, border: "none", borderRadius: 12 }}
                      title="Receipt PDF"
                    />
                  ) : null
                ) : (
                  <Image
                    source={{ uri: billPreviewUrl }}
                    style={styles.billPreviewImage}
                    resizeMode="contain"
                  />
                )
              ) : (
                <View style={styles.pdfFallbackBox}>
                  <FileText size={48} color={PRIMARY} />
                  <Text style={styles.pdfFallbackText}>
                    {billLoading ? "Preparing receipt preview…" : "Receipt preview is unavailable."}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <>

      {/* 1. TOP APP BAR: "Expense management" title + Receipt Icon + Add (+) button (no MP profile avatar) */}
      <AtelierHeader
        title="Expenses"
        showProfile={false}
        backgroundColor="#FAF7F2"
        icon={<ReceiptText size={24} color="#78070D" strokeWidth={2.4} />}
        rightAction={
          <TouchableOpacity
            style={styles.headerAddButton}
            onPress={newExpense}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add expense"
          >
            <Plus size={20} color="#ffffff" strokeWidth={2.6} />
          </TouchableOpacity>
        }
      />

      {/* Search and date filters follow the Customer screen's two-row toolbar pattern. */}
      <View style={styles.fixedTopSection}>
        <View style={styles.toolbarRow}>
          <View style={styles.searchBox}>
            <Search size={16} color="#9AA3B5" />
            <TextInput
              style={styles.searchInput}
              value={searchDraft}
              onChangeText={handleSearchChange}
              placeholder="Search expenses..."
              placeholderTextColor="#9AA3B5"
              returnKeyType="search"
              onSubmitEditing={applySearchImmediate}
              blurOnSubmit
              accessibilityLabel="Search expenses"
            />
            {searchDraft ? (
              <TouchableOpacity
                onPress={clearSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Clear search input"
              >
                <X size={15} color={TEXT_MUTED} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.filterChipRow}>
          <TouchableOpacity
            style={[styles.dateRangeChip, hasDateFilter && styles.dateRangeChipActive]}
            onPress={openDateFilter}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Filter by date range"
          >
            <CalendarDays size={14} color={hasDateFilter ? PRIMARY : TEXT_MUTED} />
            <Text style={[styles.dateRangeChipText, hasDateFilter && styles.dateRangeChipTextActive]}>
              Date range
            </Text>
          </TouchableOpacity>

          {!pageLoading ? (
            <View style={styles.resultCountChip}>
              <Text style={styles.resultCountText}>Expenses ({totalCount})</Text>
            </View>
          ) : null}

          {hasDateFilter ? (
            <View style={styles.appliedFilterChip}>
              <CalendarDays size={13} color={PRIMARY} />
              <Text style={styles.appliedFilterText}>
                {`${displayDate(fromDate)} - ${displayDate(toDate)}`}
              </Text>
              <TouchableOpacity
                onPress={clearDateRange}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear date filter"
              >
                <X size={13} color={PRIMARY} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      {/* 2. PULL-TO-REFRESH & SCROLLABLE EXPENSE LIST with infinite scroll */}
      <View style={styles.listContainer} onLayout={(event) => setListViewportHeight(event.nativeEvent.layout.height)}>
        <FlatList
          data={pageLoading ? [] : expenses}
          keyExtractor={(expense) => String(expense.id)}
          renderItem={({ item: expense }) => (
            <TouchableOpacity
              style={[styles.compactCard, { height: expenseCardHeight }]}
              activeOpacity={0.7}
              onPress={() => openExpenseDetail(expense)}
              accessibilityRole="button"
              accessibilityLabel={`View expense. Assigned team members: ${(expense.sourcingSpecialists || []).map((employee) => employee.displayName).join(", ")}`}
            >
              <View style={styles.expenseCardContent}>
                <View style={styles.expenseCardTopRow}>
                  <View style={styles.cardDateRow}>
                    <CalendarDays size={13} color={PRIMARY} strokeWidth={2.2} />
                    <Text style={styles.cardDateText} numberOfLines={1}>
                      {displayDate(expense.expenseDate)}
                    </Text>
                  </View>
                  <View style={styles.cardAmountActionRow}>
                    <Text style={styles.cardAmountText} numberOfLines={1}>
                      {money(expense.amount)}
                    </Text>
                    <ChevronRight size={17} color={TEXT_MUTED} />
                  </View>
                </View>
                <View style={styles.expenseSourcingRow}>
                  <View style={styles.expenseSourceIconSlot}>
                    {expense.sourcingSpecialists?.length === 1 ? (
                      <User size={15} color={PRIMARY} strokeWidth={2} />
                    ) : expense.sourcingSpecialists?.length ? (
                      <Users size={15} color={PRIMARY} strokeWidth={2} />
                    ) : (
                      <Users size={15} color={PRIMARY} strokeWidth={2} />
                    )}
                  </View>
                  <View style={styles.expenseSpecialistChips}>
                    {expense.sourcingSpecialists?.slice(0, 1).map((employee) => (
                      <SpecialistChip key={employee.id} employee={employee} />
                    ))}
                    {(expense.sourcingSpecialists?.length || 0) > 1 ? (
                      <View style={styles.specialistOverflowChip}>
                        <Text style={styles.specialistOverflowText}>
                          +{(expense.sourcingSpecialists?.length || 0) - 1}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            pageLoading ? (
              <View style={styles.expenseList}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <View key={`skel-${index}`} style={[styles.skeletonCompactCard, { height: expenseCardHeight }]} />
                ))}
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            !pageLoading ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  {loadFailed ? (
                    <AlertCircle size={24} color={DANGER} />
                  ) : (
                    <Search size={24} color={PRIMARY} />
                  )}
                </View>
                <Text style={styles.emptyTitle}>{loadFailed ? "Couldn't load expenses" : "No expenses found"}</Text>
                <Text style={styles.emptyText}>
                  {loadFailed
                    ? "Check your connection and try again."
                    : hasFilters
                    ? "Try a different search or date range."
                    : "Add your first expense to get started."}
                </Text>
                {loadFailed ? (
                  <TouchableOpacity
                    style={styles.emptyAction}
                    onPress={() => void loadExpenses()}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading expenses"
                  >
                    <Text style={styles.emptyActionText}>Try again</Text>
                  </TouchableOpacity>
                ) : hasFilters ? (
                  <TouchableOpacity
                    style={styles.emptyAction}
                    onPress={clearFilters}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Clear filters"
                  >
                    <Text style={styles.emptyActionText}>Clear filters</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : undefined
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreRow}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={styles.loadMoreText}>Loading more expenses...</Text>
              </View>
            ) : undefined
          }
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: getTabBarContentPadding(insets.bottom) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={30}
          removeClippedSubviews={Platform.OS === "android"}
        />
      </View>

      </>

      {/* 4. DATE RANGE SHEET MODAL (No quick-range chips, calendar only, pinned Clear all & Apply range) */}
      <Modal
        visible={filtersVisible}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setFiltersVisible(false)}
          />
          <View style={[styles.dateSheetCard, { maxHeight: dateSheetMaxHeight }]}>
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Select date range</Text>
                <Text style={styles.dateRangeConfirmText}>
                  {fromDraft && toDraft
                    ? `${displayDate(fromDraft)} - ${displayDate(toDraft)}`
                    : fromDraft
                      ? `${displayDate(fromDraft)} - Select end date`
                      : "Choose start and end date"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFiltersVisible(false)}
                activeOpacity={0.7}
                accessibilityLabel="Close date filter"
              >
                <X size={17} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            {/* Calendar only (no quick-range chips) */}
            <View style={styles.calendarOnlyContainer}>
              <View style={styles.filterCalendar}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={styles.calendarNav}
                    activeOpacity={0.7}
                    onPress={() =>
                      setCalendarMonth(
                        (current) =>
                          new Date(
                            current.getFullYear(),
                            current.getMonth() - 1,
                            1
                          )
                      )
                    }
                    accessibilityLabel="Previous month"
                  >
                    <ChevronLeft size={16} color={TEXT} />
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthTitle}>
                    {new Intl.DateTimeFormat("en", {
                      month: "long",
                      year: "numeric",
                    }).format(calendarMonth)}
                  </Text>
                  <TouchableOpacity
                    style={styles.calendarNav}
                    activeOpacity={0.7}
                    onPress={() =>
                      setCalendarMonth(
                        (current) =>
                          new Date(
                            current.getFullYear(),
                            current.getMonth() + 1,
                            1
                          )
                      )
                    }
                    accessibilityLabel="Next month"
                  >
                    <ChevronRight size={16} color={TEXT} />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarWeekRow}>
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <Text key={day} style={[styles.calendarWeekday, { width: calendarDaySize }]}>
                      {day}
                    </Text>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {calendarCells.map((day) => {
                    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                    const selected = iso === fromDraft || iso === toDraft;
                    const inRange = Boolean(
                      fromDraft && toDraft && iso > fromDraft && iso < toDraft
                    );
                    const disabled = iso > localIsoToday();
                    return (
                      <TouchableOpacity
                        key={iso}
                        disabled={disabled}
                        activeOpacity={0.7}
                        style={[
                          styles.calendarDay,
                          { width: calendarDaySize, height: calendarDaySize },
                          day.getMonth() !== calendarMonth.getMonth() &&
                            styles.calendarDayOutside,
                          selected && styles.calendarDaySelected,
                          inRange && styles.calendarRangeDay,
                          disabled && styles.calendarDayDisabled,
                        ]}
                        onPress={() => {
                          if (!fromDraft || (fromDraft && toDraft)) {
                            setFromDraft(iso);
                            setToDraft("");
                          } else if (iso < fromDraft) {
                            setFromDraft(iso);
                          } else {
                            setToDraft(iso);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            day.getMonth() !== calendarMonth.getMonth() &&
                              styles.calendarDayOutsideText,
                            selected && styles.calendarDaySelectedText,
                            disabled && styles.calendarDayDisabledText,
                          ]}
                        >
                          {day.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Pinned Footer: Clear all + Apply range (Apply disabled until both dates chosen) */}
            <View
              style={[
                styles.dateSheetFooter,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <TouchableOpacity
                onPress={clearDateRange}
                style={styles.filterClear}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
              >
                <Text style={styles.filterClearText}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyDateRange}
                disabled={!fromDraft || !toDraft}
                style={[
                  styles.applyButton,
                  (!fromDraft || !toDraft) && styles.applyButtonDisabled,
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Apply date range"
              >
                <Text style={styles.applyButtonText}>Apply range</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. ADD / EDIT EXPENSE SHEET MODAL */}
      <Modal
        visible={formVisible}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          if (formReceiptPreviewVisible) closeFormReceiptPreview();
          else if (datePickerVisible) setDatePickerVisible(false);
          else if (specialistOptionsOpen) {
            setSpecialistOptionsOpen(false);
            setSpecialistSearch("");
          } else requestCloseExpenseForm();
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={requestCloseExpenseForm}
          />
          <View
            style={[
              styles.expenseFormModalCard,
              {
                paddingBottom: Math.max(
                  insets.bottom,
                  Platform.OS === "android" ? 20 : 12
                ),
              },
            ]}
          >
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingRow}>
                <View style={styles.modalHeadingPrefix}>
                  {editing ? (
                    <Pencil size={18} color={PRIMARY} strokeWidth={2.3} />
                  ) : (
                    <CirclePlus size={18} color={PRIMARY} strokeWidth={2.3} />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.modalTitle}>
                    {editing ? "Edit expense" : "Add expense"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={requestCloseExpenseForm}
                activeOpacity={0.7}
                accessibilityLabel="Close form"
              >
                <X size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            {formError ? (
              <View style={styles.formError}>
                <AlertCircle size={14} color={DANGER} />
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <ScrollView
              ref={formScrollRef}
              style={{ flexShrink: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              onLayout={(event) => {
                formViewportHeightRef.current = event.nativeEvent.layout.height;
              }}
              contentContainerStyle={styles.modalBody}
            >
              {/* Expense date */}
              <Text style={[styles.fieldLabel, styles.firstFieldLabel]}>
                Expense date <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.inputIconRow,
                  fieldErrors.expenseDate && styles.inputErrorRow,
                ]}
                activeOpacity={0.8}
                onLayout={(event) => {
                  formFieldLayoutsRef.current.date = {
                    y: event.nativeEvent.layout.y,
                    height: event.nativeEvent.layout.height,
                  };
                }}
                onPress={() => {
                  Keyboard.dismiss();
                  centerFormField("date");
                  if (fieldErrors.expenseDate) clearFieldError("expenseDate");
                  setFormError("");
                  const selected = formValues.expenseDate
                    ? new Date(`${formValues.expenseDate}T00:00:00`)
                    : new Date();
                  setCalendarMonth(
                    new Date(selected.getFullYear(), selected.getMonth(), 1)
                  );
                  setDatePickerVisible(true);
                }}
              >
                <CalendarDays
                  size={16}
                  color={fieldErrors.expenseDate ? DANGER : PRIMARY}
                />
                <Text
                  style={styles.textInputWithIcon}
                >
                  {formValues.expenseDate
                    ? displayDate(formValues.expenseDate)
                    : "Choose expense date"}
                </Text>
              </TouchableOpacity>
              {fieldErrors.expenseDate ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.expenseDate}</Text>
              ) : null}

              {/* Amount (INR) */}
              <Text style={styles.fieldLabel}>
                Amount (INR) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.inputIconRow,
                  fieldErrors.amount && styles.inputErrorRow,
                ]}
                onLayout={(event) => {
                  formFieldLayoutsRef.current.amount = {
                    y: event.nativeEvent.layout.y,
                    height: event.nativeEvent.layout.height,
                  };
                }}
              >
                <Text
                  style={[
                    styles.rupeeIcon,
                    fieldErrors.amount && { color: DANGER },
                  ]}
                >
                  ₹
                </Text>
                <TextInput
                  value={formValues.amount}
                  onChangeText={(amount) => {
                    setFormValues((old) => ({ ...old, amount }));
                    centerFormField("amount", 35, false);
                    clearFieldError("amount");
                    setFormError("");
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#9AA3B5"
                  style={styles.textInputWithIcon}
                  accessibilityLabel="Expense amount in rupees"
                  onFocus={() => centerFormField("amount")}
                />
              </View>
              {fieldErrors.amount ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.amount}</Text>
              ) : null}

              <Text style={styles.fieldLabel}>
                Handled by <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={[
                  styles.sourcingSpecialistPicker,
                  fieldErrors.sourcingSpecialistIds && styles.inputErrorRow,
                ]}
                onLayout={(event) => {
                  formFieldLayoutsRef.current.specialist = {
                    y: event.nativeEvent.layout.y,
                    height: event.nativeEvent.layout.height,
                  };
                }}
              >
                <TouchableOpacity
                  style={styles.sourcingSpecialistTrigger}
                  onPress={() => {
                    Keyboard.dismiss();
                    setSpecialistSearch("");
                    setDraftSourcingSpecialistIds([...formValues.sourcingSpecialistIds]);
                    void loadSourcingSpecialists();
                    setSpecialistOptionsOpen(true);
                  }}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Select who handled this expense. ${formValues.sourcingSpecialistIds.length} selected`}
                  accessibilityState={{ expanded: specialistOptionsOpen }}
                >
                  <Users size={16} color={PRIMARY} />
                  <Text style={styles.sourcingSpecialistTriggerText} numberOfLines={1}>
                    {formValues.sourcingSpecialistIds.length
                      ? `${formValues.sourcingSpecialistIds.length} staff selected`
                      : "Choose staff members"}
                  </Text>
                  <ChevronDown size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
                {formValues.sourcingSpecialistIds.length > 0 ? (
                  <View style={styles.sourcingSpecialistChips}>
                    {sourcingSpecialists
                      .filter((employee) => formValues.sourcingSpecialistIds.includes(employee.id))
                      .map((employee) => (
                        <TouchableOpacity
                          key={employee.id}
                          style={styles.sourcingSpecialistChip}
                          onPress={() => toggleSourcingSpecialist(employee.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${employee.displayName}`}
                        >
                          <Text style={styles.sourcingSpecialistChipText}>{employee.displayName}</Text>
                          <X size={13} color={PRIMARY} />
                        </TouchableOpacity>
                      ))}
                  </View>
                ) : null}

              </View>
              {fieldErrors.sourcingSpecialistIds ? (
                <Text style={styles.fieldErrorText}>
                  {fieldErrors.sourcingSpecialistIds}
                </Text>
              ) : null}

              {/* Bill / receipt: two clear options side by side ("Take photo" and "Upload file") */}
              <Text style={styles.fieldLabel}>
                Bill / receipt{" "}
                <Text style={styles.requiredStar}>*</Text>
              </Text>
              {hasFormFile ? (
                /* Single file card after file chosen: type icon, middle truncated name, size, View, Replace, Remove */
                <View
                  style={[
                    styles.formFileCard,
                    fieldErrors.bill && styles.filePickerPairError,
                  ]}
                >
                  <View style={styles.formFileCardLeft}>
                    <View style={styles.formFileCardIcon}>
                      {formFileIsPdf ? (
                        <FileText size={18} color={PRIMARY} />
                      ) : (
                        <FileImage size={18} color={PRIMARY} />
                      )}
                    </View>
                    <View style={styles.formFileCardMeta}>
                      <View style={styles.formFileCardNameContainer}>
                        <Text
                          style={styles.formFileCardNameStart}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {splitMiddleTruncate(formFileDisplayName).start}
                        </Text>
                        {splitMiddleTruncate(formFileDisplayName).end ? (
                          <Text style={styles.formFileCardNameEnd}>
                            {splitMiddleTruncate(formFileDisplayName).end}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.formFileCardSubtext} numberOfLines={1}>
                        {formFileMeta}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.formFileCardActions}>
                    <TouchableOpacity
                      style={styles.formMicroIconButton}
                        onPress={() => void openFormReceiptPreview()}
                        disabled={formReceiptPreviewLoading}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                        accessibilityLabel="Preview receipt"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Eye size={15} color={PRIMARY} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.formRemoveIconButton}
                      onPress={() => {
                        setSelectedBill(null);
                        clearFieldError("bill");
                        setFormError("");
                        if (editing) {
                          setEditing((prev) =>
                            prev ? { ...prev, billFileName: "" } : null
                          );
                        }
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Remove bill"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={16} color="#be123c" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Two clear options side by side: Camera ("Take photo") and Picker ("Upload file") */
                <View
                  style={[
                    styles.filePickerPair,
                    fieldErrors.bill && styles.filePickerPairError,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.filePickerHalf,
                      fieldErrors.bill && styles.filePickerHalfError,
                    ]}
                    onPress={() => void takePhoto()}
                    disabled={pickingBill}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Open camera to take photo of receipt"
                  >
                    <Camera size={18} color={PRIMARY} strokeWidth={2.3} />
                    <Text style={styles.filePickerHalfText}>Take photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filePickerHalf,
                      fieldErrors.bill && styles.filePickerHalfError,
                    ]}
                    onPress={() => void chooseBill()}
                    disabled={pickingBill}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Upload receipt file"
                  >
                    <UploadCloud size={18} color={PRIMARY} strokeWidth={2.3} />
                    <Text style={styles.filePickerHalfText}>Upload file</Text>
                  </TouchableOpacity>
                </View>
              )}
              {fieldErrors.bill ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.bill}</Text>
              ) : null}

              {/* Category / notes */}
              <Text style={styles.fieldLabel}>Category / notes (optional)</Text>
              <TextInput
                value={formValues.categoryNotes}
                onLayout={(event) => {
                  formFieldLayoutsRef.current.notes = {
                    y: event.nativeEvent.layout.y,
                    height: event.nativeEvent.layout.height,
                  };
                }}
                onFocus={() => centerFormField("notes")}
                onChangeText={(categoryNotes) => {
                  setFormValues((old) => ({ ...old, categoryNotes }));
                  centerFormField("notes", 35, false);
                  clearFieldError("categoryNotes");
                  setFormError("");
                }}
                placeholder="e.g. Fabric purchase, 2 Shirts order"
                placeholderTextColor="#9AA3B5"
                multiline
                maxLength={250}
                textAlignVertical="top"
                style={[
                  styles.textInput,
                  styles.notesInputCompact,
                  fieldErrors.categoryNotes && styles.inputErrorRow,
                ]}
              />
              {fieldErrors.categoryNotes ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.categoryNotes}</Text>
              ) : null}

            </ScrollView>

            {/* Fixed footer: Cancel + Create expense */}
            <View style={styles.modalButtonsCompact}>
              <TouchableOpacity
                style={styles.cancelButtonOutlineRed}
                onPress={requestCloseExpenseForm}
                disabled={saving}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <X size={14} color={DANGER} strokeWidth={2.4} />
                <Text style={styles.cancelTextOutlineRed}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButtonPrimary,
                  saving && styles.disabledButton,
                ]}
                onPress={() => void saveExpense()}
                disabled={saving}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={editing ? "Save changes" : "Create expense"}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <CheckCircle2 size={15} color="#ffffff" />
                )}
                <Text style={styles.saveButtonPrimaryText}>
                  {saving
                    ? "Saving…"
                    : editing
                      ? "Save changes"
                      : "Create expense"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {datePickerVisible ? (
            <View style={[StyleSheet.absoluteFill, styles.calendarBackdrop]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setDatePickerVisible(false)}
                accessibilityLabel="Close calendar"
                accessibilityRole="button"
              />
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={styles.calendarNav}
                    activeOpacity={0.7}
                    onPress={() =>
                      setCalendarMonth(
                        (current) =>
                          new Date(current.getFullYear(), current.getMonth() - 1, 1)
                      )
                    }
                    accessibilityLabel="Previous month"
                  >
                    <ChevronLeft size={17} color={TEXT} />
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthTitle}>
                    {new Intl.DateTimeFormat("en", {
                      month: "long",
                      year: "numeric",
                    }).format(calendarMonth)}
                  </Text>
                  <TouchableOpacity
                    style={styles.calendarNav}
                    activeOpacity={0.7}
                    onPress={() =>
                      setCalendarMonth(
                        (current) =>
                          new Date(current.getFullYear(), current.getMonth() + 1, 1)
                      )
                    }
                    accessibilityLabel="Next month"
                    disabled={
                      calendarMonth.getFullYear() === new Date().getFullYear() &&
                      calendarMonth.getMonth() >= new Date().getMonth()
                    }
                  >
                    <ChevronRight size={17} color={TEXT} />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarWeekRow}>
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <Text key={day} style={[styles.calendarWeekday, { width: calendarDaySize }]}>
                      {day}
                    </Text>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {calendarCells.map((day) => {
                    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                    const inMonth = day.getMonth() === calendarMonth.getMonth();
                    const selected = iso === formValues.expenseDate;
                    const disabled = iso > localIsoToday();
                    return (
                      <TouchableOpacity
                        key={iso}
                        disabled={disabled}
                        activeOpacity={0.7}
                        style={[
                          styles.calendarDay,
                          { width: calendarDaySize, height: calendarDaySize },
                          !inMonth && styles.calendarDayOutside,
                          selected && styles.calendarDaySelected,
                          disabled && styles.calendarDayDisabled,
                        ]}
                        onPress={() => {
                          setFormValues((old) => ({ ...old, expenseDate: iso }));
                          clearFieldError("expenseDate");
                          setFormError("");
                          setDatePickerVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            !inMonth && styles.calendarDayOutsideText,
                            selected && styles.calendarDaySelectedText,
                            disabled && styles.calendarDayDisabledText,
                          ]}
                        >
                          {day.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.calendarFooter}>
                  <TouchableOpacity
                    onPress={() => setDatePickerVisible(false)}
                    style={styles.cancelButtonOutlineRed}
                    activeOpacity={0.7}
                  >
                    <X size={14} color={DANGER} strokeWidth={2.4} />
                    <Text style={styles.cancelTextOutlineRed}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setFormValues((old) => ({
                        ...old,
                        expenseDate: localIsoToday(),
                      }));
                      clearFieldError("expenseDate");
                      setFormError("");
                      setCalendarMonth(new Date());
                      setDatePickerVisible(false);
                    }}
                    style={styles.applyButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.applyButtonText}>Today</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
          {specialistOptionsOpen ? (
            <View style={[StyleSheet.absoluteFill, styles.handledByOverlay]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  setSpecialistOptionsOpen(false);
                  setSpecialistSearch("");
                  Keyboard.dismiss();
                }}
                accessibilityLabel="Close handled by selection"
                accessibilityRole="button"
              />
              <View style={[styles.handledBySheetCard, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                <View style={styles.sheetHandleRow}>
                  <View style={styles.sheetHandle} />
                </View>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.modalTitle}>Handled by</Text>
                    <Text style={styles.handledBySubtitle}>
                      Select one or more staff members
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setSpecialistOptionsOpen(false);
                      setSpecialistSearch("");
                      Keyboard.dismiss();
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Close handled by selection"
                  >
                    <X size={17} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </View>

                <View style={styles.handledBySelectedSection}>
                  <Text style={styles.handledBySectionLabel}>
                    SELECTED ({draftSourcingSpecialistIds.length})
                  </Text>
                  {draftSourcingSpecialistIds.length ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.handledBySelectedChips}
                    >
                      {sourcingSpecialists
                        .filter((employee) => draftSourcingSpecialistIds.includes(employee.id))
                        .map((employee) => (
                          <TouchableOpacity
                            key={employee.id}
                            style={styles.sourcingSpecialistChip}
                            onPress={() => toggleDraftSourcingSpecialist(employee.id)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${employee.displayName}`}
                          >
                            <Text style={styles.sourcingSpecialistChipText} numberOfLines={1}>
                              {employee.displayName}
                            </Text>
                            <X size={13} color={PRIMARY} />
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.handledByEmptySelected}>No staff selected yet</Text>
                  )}
                </View>

                <View style={styles.handledBySearch}>
                  <Search size={17} color={TEXT_MUTED} />
                  <TextInput
                    value={specialistSearch}
                    onChangeText={setSpecialistSearch}
                    placeholder="Search staff by name"
                    placeholderTextColor="#9AA3B5"
                    style={styles.handledBySearchInput}
                    autoCorrect={false}
                    returnKeyType="search"
                    accessibilityLabel="Search staff by name"
                  />
                  {specialistSearch ? (
                    <TouchableOpacity
                      onPress={() => setSpecialistSearch("")}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Clear staff search"
                    >
                      <X size={15} color={TEXT_MUTED} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={[styles.handledBySectionLabel, styles.handledByStaffHeading]}>ALL STAFF</Text>
                <ScrollView
                  style={[
                    styles.handledByStaffList,
                    {
                      height: Math.min(
                        232,
                        Math.max(58, filteredSourcingSpecialists.length * 58),
                        Math.max(58, windowHeight * 0.34)
                      ),
                    },
                  ]}
                  contentContainerStyle={styles.handledByStaffListContent}
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="always"
                  keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                >
                  {specialistsLoading ? (
                    <View style={styles.specialistLoading}>
                      <ActivityIndicator size="small" color={PRIMARY} />
                      <Text style={styles.sourcingSpecialistEmpty}>Loading staff…</Text>
                    </View>
                  ) : filteredSourcingSpecialists.length ? filteredSourcingSpecialists.map((employee) => {
                    const selected = draftSourcingSpecialistIds.includes(employee.id);
                    const color = specialistColor(employee);
                    return (
                      <TouchableOpacity
                        key={employee.id}
                        style={styles.handledByStaffOption}
                        onPress={() => toggleDraftSourcingSpecialist(employee.id)}
                        accessibilityRole="checkbox"
                        accessibilityLabel={employee.displayName}
                        accessibilityHint={selected ? "Remove this team member" : "Add this team member"}
                        accessibilityState={{ checked: selected }}
                      >
                        <View style={[styles.handledByStaffAvatar, { backgroundColor: color.background }]}>
                          <Text style={[styles.handledByStaffAvatarText, { color: color.foreground }]}>
                            {specialistInitials(employee)}
                          </Text>
                        </View>
                        <View style={styles.handledByStaffDetails}>
                          <Text style={styles.handledByStaffName} numberOfLines={1}>
                            {employee.displayName}
                          </Text>
                          {employee.mobile ? (
                            <View style={styles.handledByStaffPhoneRow}>
                              <Phone size={12} color="#64748B" strokeWidth={2} />
                              <Text style={styles.handledByStaffMobile} numberOfLines={1}>
                                {employee.mobile}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.sourcingSpecialistCheckbox,
                            selected && styles.sourcingSpecialistCheckboxSelected,
                          ]}
                        >
                          {selected ? <Check size={13} color="#ffffff" strokeWidth={3} /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  }) : (
                    <Text style={styles.sourcingSpecialistEmpty}>No matching staff members found.</Text>
                  )}
                </ScrollView>

                <View style={styles.handledByFooter}>
                  <Text style={styles.handledByFooterCount}>
                    {draftSourcingSpecialistIds.length} selected
                  </Text>
                  <TouchableOpacity
                    style={styles.handledByDoneButton}
                    onPress={() => {
                      setFormValues((current) => ({
                        ...current,
                        sourcingSpecialistIds: [...draftSourcingSpecialistIds],
                      }));
                      setSpecialistOptionsOpen(false);
                      setSpecialistSearch("");
                      clearFieldError("sourcingSpecialistIds");
                      setFormError("");
                      Keyboard.dismiss();
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Done selecting staff members"
                  >
                    <Text style={styles.handledByDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
          {formReceiptPreviewVisible ? (
            <View style={[StyleSheet.absoluteFill, styles.formReceiptPreviewBackdrop]}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={closeFormReceiptPreview}
                accessibilityRole="button"
                accessibilityLabel="Close receipt preview"
              />
              <View
                style={[
                  styles.modalCard,
                  styles.formReceiptPreviewSheet,
                  {
                    maxHeight: "90%",
                    paddingBottom: Math.max(insets.bottom, 16) + 14,
                  },
                ]}
              >
                <View style={styles.sheetHandleRow}>
                  <View style={styles.sheetHandle} />
                </View>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeadingRow}>
                    <TouchableOpacity
                      style={styles.modalHeadingPrefix}
                      onPress={closeFormReceiptPreview}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Back to expense form"
                    >
                      <ChevronLeft size={20} color={PRIMARY} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                      <Text style={styles.modalTitle} numberOfLines={1}>
                        {DISPLAY_RECEIPT_FILENAME}
                      </Text>
                      <Text style={styles.modalSubtitle}>Receipt preview</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closeFormReceiptPreview}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Close receipt preview"
                  >
                    <X size={17} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </View>
                <View style={styles.formReceiptPreviewBody}>
                  {formReceiptPreviewLoading ? (
                    <View style={styles.formReceiptPreviewMessage}>
                      <ActivityIndicator size="large" color={PRIMARY} />
                      <Text style={styles.expenseDetailReceiptHint}>Loading receipt…</Text>
                    </View>
                  ) : formReceiptPreviewError ? (
                    <View style={styles.formReceiptPreviewMessage}>
                      <FileText size={34} color={TEXT_MUTED} />
                      <Text style={styles.expenseDetailReceiptHint}>{formReceiptPreviewError}</Text>
                    </View>
                  ) : formReceiptPreviewIsPdf && formReceiptPreviewPdfBase64 && Platform.OS !== "web" ? (
                    <>
                      {formReceiptPreviewPdfImage ? (
                        <Image
                          source={{ uri: formReceiptPreviewPdfImage }}
                          style={styles.formReceiptPreviewImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.formReceiptPreviewMessage}>
                          <ActivityIndicator size="large" color={PRIMARY} />
                          <Text style={styles.expenseDetailReceiptHint}>Preparing PDF preview…</Text>
                        </View>
                      )}
                      <WebView
                        source={{ html: createPdfPreviewHtml(formReceiptPreviewPdfBase64) }}
                        originWhitelist={["*"]}
                        javaScriptEnabled
                        style={styles.pdfRenderWorker}
                        onMessage={(event: any) => {
                          const value = event.nativeEvent.data;
                          if (value.startsWith("data:image/png;base64,")) {
                            setFormReceiptPreviewPdfImage(value);
                          } else {
                            setFormReceiptPreviewError("Unable to render this PDF receipt.");
                          }
                        }}
                        onError={() => setFormReceiptPreviewError("Unable to render this PDF receipt.")}
                      />
                    </>
                  ) : formReceiptPreviewIsPdf && formReceiptPreviewUrl && Platform.OS === "web" ? (
                    <iframe
                      src={formReceiptPreviewUrl}
                      style={{ width: "100%", height: 360, border: "none", borderRadius: 12 }}
                      title={DISPLAY_RECEIPT_FILENAME}
                    />
                  ) : formReceiptPreviewUrl ? (
                    <Image
                      source={{ uri: formReceiptPreviewUrl }}
                      style={styles.formReceiptPreviewImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.formReceiptPreviewMessage}>
                      <FileText size={34} color={TEXT_MUTED} />
                      <Text style={styles.expenseDetailReceiptHint}>Receipt preview is unavailable.</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Alert Dialog */}
      <Modal
        visible={Boolean(expenseToDelete)}
        animationType="fade"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {
          if (!deletingId) setExpenseToDelete(null);
        }}
      >
        <View style={styles.confirmBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!deletingId) setExpenseToDelete(null);
            }}
          />
          <Card style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Trash2 size={22} color={DANGER} />
            </View>
            <Text style={styles.confirmTitle}>Delete this expense?</Text>
            <Text style={styles.confirmMessage}>
              This action cannot be undone and will permanently remove this
              record and its attached bill.
            </Text>
            {expenseToDelete ? (
              <View style={styles.confirmSummaryBox}>
                <Text style={styles.confirmSummaryNote} numberOfLines={1}>
                  {expenseToDelete.categoryNotes}
                </Text>
                <Text style={styles.confirmSummaryAmount}>
                  {money(expenseToDelete.amount)}
                </Text>
              </View>
            ) : null}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setExpenseToDelete(null)}
                disabled={deletingId !== null}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel delete"
              >
                <X size={14} color={DANGER} strokeWidth={2.4} />
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteConfirmButton,
                  deletingId !== null && styles.disabledButton,
                ]}
                onPress={(event) => {
                  event.stopPropagation?.();
                  if (expenseToDelete) void executeDelete(expenseToDelete);
                }}
                disabled={!expenseToDelete || deletingId !== null}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Confirm delete"
              >
                {deletingId !== null ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Trash2 size={15} color="#FFFFFF" />
                )}
                <Text style={styles.deleteConfirmText}>
                  {deletingId !== null ? "Deleting…" : "Delete expense"}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Live Camera Viewfinder Modal */}
      <Modal
        visible={cameraOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={stopCamera}
      >
        <View style={styles.cameraBackdrop}>
          <View style={styles.cameraContainer}>
            <View style={styles.cameraHeader}>
              <Text style={styles.cameraHeaderText}>Take Receipt Photo</Text>
              <TouchableOpacity
                style={styles.cameraCloseBtn}
                onPress={stopCamera}
                accessibilityRole="button"
                accessibilityLabel="Close camera"
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraViewfinder}>
              {cameraLoading ? (
                <ActivityIndicator size="large" color="#ffffff" />
              ) : Platform.OS === "web" ? (
                // @ts-ignore
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: 16,
                  }}
                />
              ) : null}
              <View style={styles.cameraGuideBorder} pointerEvents="none" />
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.cameraCancelBtn}
                onPress={stopCamera}
              >
                <X size={14} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.cameraCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cameraShutterOuter}
                onPress={capturePhoto}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Capture photo"
              >
                <View style={styles.cameraShutterInner} />
              </TouchableOpacity>

              <View style={{ width: 60 }} />
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  expenseDetailScreen: {
    flex: 1,
    minHeight: 0,
    backgroundColor: BACKGROUND,
  },
  expenseDetailContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    minHeight: 0,
  },
  expenseDetailHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  expenseDetailHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  expenseDetailDeleteButton: {
    backgroundColor: "#FFF5F5",
    borderColor: "#FECACA",
  },
  expenseDetailSummaryCard: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  expenseDetailDateGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  expenseDetailDateIcon: {
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius: 10,
    backgroundColor: PRIMARY_MUTED,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseDetailDateCopy: {
    flex: 1,
    minWidth: 0,
  },
  expenseDetailMetaLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.55,
    marginBottom: 4,
  },
  expenseDetailDateValue: {
    color: PRIMARY,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "700",
  },
  expenseDetailSummaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 38,
    backgroundColor: BORDER,
    marginHorizontal: 10,
  },
  expenseDetailAmountGroup: {
    maxWidth: "42%",
    alignItems: "flex-end",
  },
  expenseDetailAmountValue: {
    color: PRIMARY,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  expenseDetailReceiptAction: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseDetailDownloadAction: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  expenseDetailReceiptCard: {
    flex: 1,
    minHeight: 0,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    gap: 10,
    marginBottom: 0,
  },
  expenseDetailReceiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  expenseDetailReceiptIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 12,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
  },
  expenseDetailReceiptCopy: {
    flex: 1,
    minWidth: 0,
  },
  expenseDetailReceiptName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },
  expenseDetailReceiptType: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 1,
  },
  expenseDetailReceiptPreview: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FCFAF7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  expenseDetailReceiptImage: {
    width: "100%",
    height: "100%",
  },
  expenseDetailReceiptLoading: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  expenseDetailReceiptHint: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: "center",
  },
  headerAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  fixedTopSection: {
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  toolbarRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E9EAF1",
    backgroundColor: SURFACE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: TEXT,
    height: 44,
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
    }),
  },
  filterChipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  dateRangeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8E2D8",
    backgroundColor: SURFACE,
  },
  dateRangeChipActive: {
    backgroundColor: "#FBF2F3",
    borderColor: "#C69596",
  },
  dateRangeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  dateRangeChipTextActive: {
    color: PRIMARY,
    fontWeight: "700",
  },
  appliedFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 20,
    backgroundColor: "#FBF2F3",
    borderWidth: 1,
    borderColor: "#C69596",
  },
  appliedFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },
  resultCountChip: {
    alignSelf: "flex-start",
    minHeight: 31,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  resultCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 8,
    gap: EXPENSE_CARD_GAP,
  },
  listHeadingRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 5,
    paddingBottom: 10,
  },
  listHeadingCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  listHeadingTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
    color: TEXT,
    letterSpacing: -0.35,
  },
  listHeadingSubtitle: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: "500",
    color: TEXT_MUTED,
  },
  clearFiltersPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#FFF0F5",
    borderWidth: 1,
    borderColor: "#FFC2D5",
  },
  clearFiltersPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: PRIMARY,
  },
  expenseList: {
    gap: EXPENSE_CARD_GAP,
  },
  compactCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 3px rgba(0,0,0,0.03)" },
    }),
  },
  expenseCardContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 5,
  },
  expenseCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardAmountActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  expenseSourceIconSlot: {
    width: 15,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  expenseSourcingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  expenseSpecialistChips: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 6,
  },
  specialistChip: {
    minWidth: 0,
    maxWidth: "48%",
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  specialistChipText: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  specialistOverflowChip: {
    minHeight: 26,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  specialistOverflowText: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  detailSpecialistChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  expenseCategoryIcon: {
    width: 26,
    height: 26,
    flexShrink: 0,
    borderRadius: 9,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardLeftColumn: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
    justifyContent: "center",
    gap: 4,
  },
  cardDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  cardDateText: {
    fontSize: 14,
    lineHeight: 18,
    color: TEXT,
    fontWeight: "700",
    letterSpacing: 0,
  },
  cardRightColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    flexShrink: 0,
  },
  cardAmountText: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: -0.55,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
    flexShrink: 0,
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  microActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  microDeleteActionButton: {
    backgroundColor: "#FFF0F5",
    borderColor: "#ffe4e6",
  },
  skeletonCompactCard: {
    height: 64,
    borderRadius: 16,
    backgroundColor: "#EFEBE4",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 44,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FBF2F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: TEXT_MUTED,
    textAlign: "center",
    maxWidth: 260,
  },
  emptyAction: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "#E2DDD5",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
      web: { boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
    }),
  },
  emptyActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY,
  },
  loadMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  loadMoreText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  infiniteCountText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: TEXT_MUTED,
    textAlign: "center",
    paddingVertical: 10,
    letterSpacing: 0.2,
  },
  // DETAIL MODAL STYLES
  detailHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF0F5",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FFC2D5",
  },
  detailAmountLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: 0.5,
  },
  detailHeroAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: PRIMARY,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  detailDatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: SURFACE,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFC2D5",
  },
  detailDatePillText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: TEXT,
  },
  detailSection: {
    gap: 6,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.4,
  },
  detailNotesBox: {
    backgroundColor: BACKGROUND,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  detailNotesText: {
    fontSize: 13.5,
    color: TEXT,
    lineHeight: 20,
    fontWeight: "500",
  },
  detailBillCard: {
    backgroundColor: BACKGROUND,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  detailBillHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailBillIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
  },
  detailBillFileName: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
  },
  detailBillSubtext: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  detailBillActions: {
    flexDirection: "row",
    gap: 10,
  },
  detailViewButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: "#FFF0F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  detailViewButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: PRIMARY,
  },
  detailDownloadButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  detailDownloadButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  detailNoBillBox: {
    backgroundColor: BACKGROUND,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  detailNoBillText: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    fontStyle: "italic",
  },
  detailFooterActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  detailEditButton: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  detailEditButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
  },
  detailDeleteButton: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF0F5",
    borderWidth: 1,
    borderColor: "#ffe4e6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  detailDeleteButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#be123c",
  },
  fixedBottomSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: BACKGROUND,
  },
  countOnlySection: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: "center",
    backgroundColor: BACKGROUND,
  },
  countOnlyText: {
    fontSize: 11,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  paginationCardSlim: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  paginationLabelSlim: {
    fontSize: 11.5,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  pageButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  pageButtonDisabled: {
    opacity: 0.35,
  },
  pageIndicator: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
    margin: 0,
    padding: 0,
  },
  dateSheetCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  modalCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    maxHeight: "92%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  formReceiptPreviewBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    justifyContent: "flex-end",
  },
  formReceiptPreviewSheet: {
    width: "100%",
  },
  formReceiptPreviewBody: {
    padding: 16,
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
  },
  formReceiptPreviewImage: {
    width: "100%",
    height: 350,
    borderRadius: 12,
  },
  formReceiptPreviewMessage: {
    width: "100%",
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 10,
  },
  expenseFormModalCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetHandleRow: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
  },
  sheetHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: "#D4CEC6",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EAE5DC",
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    marginTop: 1.5,
  },
  modalHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  modalHeadingPrefix: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FBF2F3",
    borderWidth: 1,
    borderColor: "rgba(120, 7, 13, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  dateRangeConfirmText: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "600",
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarOnlyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  filterCalendar: {
    backgroundColor: BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  calendarNav: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  calendarMonthTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: TEXT,
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 4,
  },
  calendarWeekday: {
    width: 34,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 1,
  },
  calendarDayOutside: {
    opacity: 0.3,
  },
  calendarDaySelected: {
    backgroundColor: PRIMARY,
  },
  calendarRangeDay: {
    backgroundColor: "#ffe4e6",
    borderRadius: 0,
  },
  calendarDayDisabled: {
    opacity: 0.2,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT,
  },
  calendarDayOutsideText: {
    color: TEXT_MUTED,
  },
  calendarDaySelectedText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  calendarDayDisabledText: {
    color: TEXT_MUTED,
  },
  dateSheetFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EAE5DC",
    backgroundColor: SURFACE,
  },
  filterClear: {
    paddingHorizontal: 14,
    minWidth: 90,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E2DDD5",
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
  },
  filterClearText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  applyButton: {
    paddingHorizontal: 16,
    minWidth: 110,
    height: 38,
    borderRadius: 19,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#ffffff",
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 5,
    marginTop: 10,
  },
  firstFieldLabel: {
    marginTop: 0,
  },
  requiredStar: {
    color: DANGER,
    fontWeight: "800",
  },
  optionalBadge: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "400",
  },
  inputErrorRow: {
    borderColor: DANGER,
    backgroundColor: "#FFF5F5",
  },
  fieldErrorText: {
    color: DANGER,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  inputIconRow: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DFD9D0",
    backgroundColor: "#FCFAF7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  textInputWithIcon: {
    flex: 1,
    fontSize: 13.5,
    color: TEXT,
  },
  rupeeIcon: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DFD9D0",
    backgroundColor: "#FCFAF7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: TEXT,
  },
  notesInputCompact: {
    height: 72,
    lineHeight: 18,
  },
  filePickerPair: {
    flexDirection: "row",
    gap: 10,
  },
  filePickerPairError: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: DANGER,
    padding: 2,
    backgroundColor: DANGER_BG,
  },
  filePickerHalfError: {
    borderColor: DANGER,
    backgroundColor: "#FFF5F5",
  },
  filePickerHalf: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: BORDER,
    backgroundColor: BACKGROUND,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  filePickerHalfText: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT,
  },
  formFileCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFC2D5",
    backgroundColor: "#FFF0F5",
    gap: 8,
  },
  formFileCardLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  formFileCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#ffe4e6",
    alignItems: "center",
    justifyContent: "center",
  },
  formFileCardMeta: {
    flex: 1,
    minWidth: 0,
  },
  formFileCardNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  formFileCardNameStart: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  formFileCardNameEnd: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 0,
  },
  formFileCardSubtext: {
    color: "#9f1239",
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 2,
  },
  formFileCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  formMicroIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#FFC2D5",
  },
  formReplaceButton: {
    paddingHorizontal: 8,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#FFC2D5",
    alignItems: "center",
    justifyContent: "center",
  },
  formReplaceButtonText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "700",
  },
  formRemoveIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#FFC2D5",
    alignItems: "center",
    justifyContent: "center",
  },
  formError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 18,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: DANGER_BG,
  },
  formErrorText: {
    flex: 1,
    fontSize: 12,
    color: DANGER,
    fontWeight: "600",
  },
  modalButtonsCompact: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 0,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: "#EAE5DC",
    backgroundColor: SURFACE,
  },
  cancelButtonOutlineRed: {
    flexDirection: "row",
    gap: 5,
    minWidth: 96,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1.2,
    borderColor: "rgba(220, 38, 38, 0.55)",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelTextOutlineRed: {
    color: DANGER,
    fontSize: 12.5,
    fontWeight: "600",
  },
  saveButtonPrimary: {
    minWidth: 140,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: SUCCESS,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    ...Platform.select({
      ios: {
        shadowColor: SUCCESS,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      default: {
        elevation: 2,
      },
    }),
  },
  saveButtonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E2DDD5",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BACKGROUND,
  },
  cancelText: {
    color: "#5C554F",
    fontSize: 13,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1.15,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
  calendarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  calendarCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  calendarFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  pdfRenderWorker: {
    position: "absolute",
    width: 2,
    height: 2,
    opacity: 0.01,
    left: 0,
    top: 0,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(35, 30, 28, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#231E1C",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
      },
      default: {
        elevation: 8,
      },
    }),
  },
  confirmIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DANGER_BG,
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  confirmMessage: {
    fontSize: 12.5,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  confirmSummaryBox: {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
  },
  confirmSummaryNote: {
    fontSize: 12.5,
    fontWeight: "700",
    color: TEXT,
  },
  confirmSummaryAmount: {
    fontSize: 11.5,
    fontWeight: "600",
    color: PRIMARY,
    marginTop: 2,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  deleteConfirmButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: DANGER,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: DANGER,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      default: {
        elevation: 2,
      },
    }),
  },
  deleteConfirmText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  modernToastContainer: {
    position: "absolute",
    top: 54,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
      },
      default: {
        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.14), 0 8px 10px -6px rgba(15, 23, 42, 0.08)",
      },
    }),
  },
  toastSuccessBorder: {
    borderColor: "rgba(22, 163, 74, 0.3)",
  },
  toastErrorBorder: {
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  toastIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  toastSuccessBadge: {
    backgroundColor: "#16a34a",
  },
  toastErrorBadge: {
    backgroundColor: "#ef4444",
  },
  toastTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  toastTitleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  toastMessageText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
    marginTop: 1,
  },
  toastCloseBtn: {
    padding: 4,
    borderRadius: 12,
  },
  noticeToast: {
    position: "absolute",
    top: 60,
    right: 16,
    left: 16,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      default: {
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
      },
    }),
  },
  noticeSuccess: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  noticeError: {
    backgroundColor: "#FFF0F5",
    borderColor: "#FFC2D5",
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  noticeSuccessText: {
    color: "#047857",
  },
  noticeErrorText: {
    color: "#be123c",
  },
  // LIVE CAMERA VIEWFINDER MODAL STYLES
  cameraBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  cameraContainer: {
    width: "100%",
    maxWidth: 420,
    height: "85%",
    backgroundColor: "#000000",
    borderRadius: 24,
    overflow: "hidden",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  cameraHeader: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  cameraHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  cameraCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraViewfinder: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cameraGuideBorder: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: 16,
    borderStyle: "dashed",
    margin: 12,
  },
  cameraControls: {
    height: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    backgroundColor: "#000000",
  },
  cameraShutterOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  cameraShutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
  },
  cameraCancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cameraCancelText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  handledByOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  handledBySheetCard: {
    width: "100%",
    flexShrink: 1,
    marginTop: Platform.OS === "web" ? 18 : 0,
    maxHeight: "90%",
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  handledBySubtitle: {
    marginTop: 3,
    color: TEXT_MUTED,
    fontSize: 12,
  },
  handledBySelectedSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  handledBySectionLabel: {
    marginBottom: 9,
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  handledByStaffHeading: {
    marginHorizontal: 20,
  },
  handledBySelectedChips: {
    alignItems: "center",
    gap: 7,
    paddingRight: 4,
  },
  handledByEmptySelected: {
    paddingVertical: 7,
    color: TEXT_MUTED,
    fontSize: 13,
  },
  handledBySearch: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: "#FCFAF7",
    borderWidth: 1,
    borderColor: "#DFD9D0",
  },
  handledBySearchInput: {
    flex: 1,
    height: 44,
    fontSize: 13.5,
    color: TEXT,
  },
  handledByStaffList: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
    maxHeight: 232,
    paddingHorizontal: 16,
  },
  handledByStaffListContent: {
    paddingBottom: 0,
  },
  handledByStaffOption: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 3,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: BACKGROUND,
  },
  handledByStaffAvatar: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  handledByStaffAvatarText: {
    fontSize: 12,
    fontWeight: "700",
  },
  handledByStaffName: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
  },
  handledByStaffDetails: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  handledByStaffMobile: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  handledByStaffPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  handledByFooter: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#EAE5DC",
  },
  handledByFooterCount: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  handledByDoneButton: {
    minWidth: 96,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: PRIMARY,
  },
  handledByDoneText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "600",
  },
  sourcingSpecialistPicker: {
    borderWidth: 1,
    borderColor: "#DFD9D0",
    borderRadius: 14,
    backgroundColor: "#FCFAF7",
    overflow: "hidden",
  },
  sourcingSpecialistTrigger: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
  },
  sourcingSpecialistTriggerText: {
    flex: 1,
    fontSize: 13,
    color: TEXT,
  },
  sourcingSpecialistChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  sourcingSpecialistChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 14,
    backgroundColor: "#FFF0F5",
    borderWidth: 1,
    borderColor: "#FFC2D5",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sourcingSpecialistChipText: {
    maxWidth: 180,
    fontSize: 11,
    color: TEXT,
    fontWeight: "600",
  },
  specialistLoading: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sourcingSpecialistCheckbox: {
    width: 20,
    height: 20,
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  sourcingSpecialistCheckboxSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
  },
  sourcingSpecialistEmpty: {
    paddingHorizontal: 6,
    paddingVertical: 12,
    color: TEXT_MUTED,
    fontSize: 12,
  },
  detailActionFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  actionIconButtonEdit: {
    minWidth: 88,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: "#D8DCE7",
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionIconButtonDelete: {
    minWidth: 100,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 19,
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  detailActionText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  detailActionDeleteText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "700",
  },
  billPreviewContainer: {
    padding: 16,
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
  },
  billPreviewImage: {
    width: "100%",
    height: 350,
    borderRadius: 12,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  pdfFallbackBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 10,
  },
  pdfFallbackText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  sourcingSpecialistDetail: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sourcingSpecialistDetailLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sourcingSpecialistDetailText: {
    fontSize: 13,
    lineHeight: 19,
    color: TEXT,
    fontWeight: "600",
  },
  sourcingSpecialistNoAssignment: {
    color: TEXT_MUTED,
    fontSize: 12,
    lineHeight: 18,
  },
});
