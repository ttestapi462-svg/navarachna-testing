import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import type { ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertCircle,
  ArrowDownToLine,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileImage,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Receipt,
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
import { getTabBarContentPadding } from "../constants/layout";
import { mobileApiFetch, mobileApiClient } from "../lib/api-client";
import { notifyMobile } from "../lib/notifications";
import { Card } from "../components/ui/card";
import { AtelierHeader } from "../components/layout/atelier-header";

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
  const first = employee.firstName?.trim().charAt(0) || "";
  const last = employee.lastName?.trim().split(/\s+/)[0]?.charAt(0) || "";
  return `${first}${last}`.toUpperCase() || "?";
}

function expenseNotesPreview(notes?: string) {
  const value = notes?.trim() || "";
  return value.length > 32 ? `${value.slice(0, 29).trimEnd()}…` : value;
}

function SpecialistChip({ employee }: { employee: SourcingSpecialist }) {
  const color = specialistColor(employee);
  return (
    <View
      style={[styles.specialistChip, { backgroundColor: color.background }]}
      accessibilityLabel={employee.displayName}
    >
      <View style={[styles.specialistAvatar, { backgroundColor: "rgba(255,255,255,0.78)" }]}>
        <Text style={[styles.specialistInitials, { color: color.foreground }]}>
          {specialistInitials(employee)}
        </Text>
      </View>
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
const MAX_BILL_SIZE = 5 * 1024 * 1024;
const PRIMARY = "#e11d48";
const TEXT = "#17172B";
const TEXT_MUTED = "#7B8497";
const BORDER = "#E9EAF1";
const SURFACE = "#FFFFFF";
const BACKGROUND = "#F7F7FB";
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

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
        `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Save bill</title><style>body{font:16px -apple-system,BlinkMacSystemFont,sans-serif;padding:24px;color:#0f172a}a{display:block;margin:16px 0;padding:14px;border-radius:12px;background:#e11d48;color:white;text-align:center;text-decoration:none;font-weight:700}.hint{color:#475569;line-height:1.5}</style></head><body><h2>Save your bill</h2><p>${escapeHtml(filename)}</p><p class="hint">Tap “Open bill” if Save does not start. In the opened file, use Share and choose “Save to Files”.</p><a href="${objectUrl}" download="${escapeHtml(filename)}">Save bill</a><a href="${objectUrl}" target="_blank" rel="noopener">Open bill</a></body></html>`,
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

async function fetchBillResponse(expense: Expense) {
  try {
    return await mobileApiFetch(`/api/expenses/${expense.id}/bill`, {
      headers: { Accept: "*/*" },
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
  const { height: windowHeight } = useWindowDimensions();
  const debounceRef = useRef<any>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sourcingSpecialists, setSourcingSpecialists] = useState<SourcingSpecialist[]>([]);
  const [specialistsLoading, setSpecialistsLoading] = useState(true);
  const [specialistSearch, setSpecialistSearch] = useState("");
  const [specialistOptionsOpen, setSpecialistOptionsOpen] = useState(false);
  const formScrollRef = useRef<ScrollViewInstance | null>(null);
  const formViewportHeightRef = useRef(0);
  const formFieldLayoutsRef = useRef<Record<string, { y: number; height: number }>>({});
  const activeFormFieldRef = useRef<string | null>(null);
  const formScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
  const [billPreviewVisible, setBillPreviewVisible] = useState(false);
  const [billPreviewUrl, setBillPreviewUrl] = useState<string | null>(null);
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
          newItems = result;
          newTotal = result.length;
        } else {
          newItems = Array.isArray(result.items) ? result.items : [];
          newTotal = Number(result.totalCount) || 0;
        }
        setExpenses(newItems);
        setTotalCount(newTotal);
        setPage(1);
      } catch (error) {
        setNotice({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load expenses.",
        });
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

  useEffect(() => {
    let mounted = true;
    void mobileApiClient<SourcingSpecialist[]>("/api/expenses/sourcing-specialists")
      .then((employees) => {
        if (mounted) setSourcingSpecialists(Array.isArray(employees) ? employees : []);
      })
      .catch((error) => {
        if (mounted) {
          setNotice({
            kind: "error",
            message: error instanceof Error ? error.message : "Unable to load active Sourcing Specialists.",
          });
        }
      })
      .finally(() => {
        if (mounted) setSpecialistsLoading(false);
      });
    return () => { mounted = false; };
  }, []);

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
      const request = mobileApiClient<ExpensePageResult | Expense[]>(
        `/api/expenses?${query.toString()}`
      ).then(
        (result) => ({ ok: true as const, result }),
        (error: unknown) => ({ ok: false as const, error })
      );
      const [response] = await Promise.all([
        request,
        new Promise<void>((resolve) => setTimeout(resolve, 4000)),
      ]);
      if (!response.ok) throw response.error;
      const result = response.result;
      let newItems: Expense[];
      let newTotal: number;
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
      setPage(nextPage);
    } catch (err) {
      console.warn("Failed to load more expenses", err);
    } finally {
      setLoadingMore(false);
      loadMoreRef.current = false;
    }
  }, [expenses.length, fromDate, loadingMore, pageLoading, search, toDate, totalCount]);

  const hasFilters = Boolean(search || fromDate || toDate);
  const hasDateFilter = Boolean(fromDate && toDate);
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

  const newExpense = () => {
    Keyboard.dismiss();
    setEditing(null);
    setDatePickerVisible(false);
    setFormValues({
      expenseDate: localIsoToday(),
      amount: "",
      categoryNotes: "",
      sourcingSpecialistIds: [],
    });
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
    setFormValues({
      expenseDate: expense.expenseDate.slice(0, 10),
      amount: String(expense.amount),
      categoryNotes: expense.categoryNotes,
      sourcingSpecialistIds: (expense.sourcingSpecialists || []).map((employee) => employee.id),
    });
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
      setPage(1);
    }, 300);
  };

  const applySearchImmediate = () => {
    Keyboard.dismiss();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setExpenses([]);
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const clearSearch = () => {
    Keyboard.dismiss();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchDraft("");
    setExpenses([]);
    setSearch("");
    setPage(1);
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
      input.accept =
        ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
          setNotice({
            kind: "error",
            message: "Choose a JPG, PNG, WEBP or PDF receipt.",
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
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      });
      if (result.canceled) return;
      const file = result.result;
      const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        notifyMobile("validation", "Choose a JPG, PNG, WEBP or PDF receipt.", "Unsupported file");
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
      newErrors.sourcingSpecialistIds = "Select at least one Sourcing Specialist";
    }

    if (!editing && !selectedBill) {
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
      setFormVisible(false);
      setNotice({
        kind: "success",
        message: editing
          ? "Expense updated successfully."
          : "Expense added successfully.",
      });
      setExpenses([]);
      setPage(1);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to save this expense."
      );
    } finally {
      setSaving(false);
    }
  };

  // Card tap opens bill preview with Download button inside
  const openBillPreview = async (expense: Expense) => {
    if (billLoadingRef.current) return;
    billLoadingRef.current = true;
    setActiveExpense(expense);
    // Avoid stacking two native Modal windows. On iOS/Expo Go the detail sheet
    // can remain the active presentation and intercept touches on the preview.
    setDetailVisible(false);
    setBillPreviewVisible(false);
    setBillLoading(true);
    setBillPreviewUrl(null);
    try {
      if (Platform.OS !== "web") {
        await new Promise((resolve) => setTimeout(resolve, 260));
      }
      setBillPreviewVisible(true);
      const response = await fetchBillResponse(expense);
      const filename = filenameFromResponse(
        response,
        expense.billFileName || `expense-${expense.id}-bill`
      );
      const contentType =
        response.headers.get("content-type") || mimeFromName(filename);
      const bytes = await response.arrayBuffer();
      if (Platform.OS === "web") {
        setBillPreviewUrl(
          URL.createObjectURL(new Blob([bytes], { type: contentType }))
        );
      } else {
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const previewFile = new File(
          Paths.cache,
          `${expense.id}-${Date.now()}-${safeName}`
        );
        await previewFile.write(new Uint8Array(bytes));
        setBillPreviewUrl(previewFile.uri);
      }
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Unable to load bill preview.",
      });
    } finally {
      billLoadingRef.current = false;
      setBillLoading(false);
    }
  };

  const viewBill = async (expense?: Expense) => {
    if (!expense && selectedBill) {
      try {
        if (Platform.OS === "web") {
          const opened = window.open(
            selectedBill.uri,
            "_blank",
            "noopener,noreferrer"
          );
          if (!opened)
            setNotice({
              kind: "error",
              message:
                "Your browser blocked the preview. Use Download bill instead.",
            });
        } else {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(selectedBill.uri, {
              mimeType: selectedBill.type,
              dialogTitle: selectedBill.name,
            });
          }
        }
      } catch (error) {
        setNotice({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to view the selected bill.",
        });
      }
      return;
    }
    if (!expense) return;
    if (billLoadingRef.current) return;

    billLoadingRef.current = true;
    setBillLoading(true);
    const previewWindow =
      Platform.OS === "web" ? window.open("about:blank", "_blank") : null;
    try {
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
        const objectUrl = URL.createObjectURL(blob);
        if (previewWindow) previewWindow.location.href = objectUrl;
        else {
          triggerBrowserDownload(blob, filename);
          setNotice({
            kind: "success",
            message: "Preview was blocked; the bill download was started.",
          });
        }
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      } else {
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const savedFile = new File(Paths.cache, safeName);
        await savedFile.write(new Uint8Array(bytes));
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          throw new Error("Native file sharing is not available on this device.");
        }
        await Sharing.shareAsync(savedFile.uri, {
          mimeType: contentType,
          dialogTitle: filename,
        });
      }
    } catch (error) {
      previewWindow?.close();
      setNotice({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Unable to view the bill.",
      });
    } finally {
      billLoadingRef.current = false;
      setBillLoading(false);
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
    setPage(1);
    setFiltersVisible(false);
  };

  const clearDateRange = () => {
    Keyboard.dismiss();
    setFromDraft("");
    setToDraft("");
    setExpenses([]);
    setFromDate("");
    setToDate("");
    setPage(1);
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
    setPage(1);
    setFiltersVisible(false);
  };

  // Open detail view for a card tap
  const openExpenseDetail = (expense: Expense) => {
    Keyboard.dismiss();
    setActiveExpense(expense);
    setDetailVisible(true);
    setBillPreviewUrl(null);
  };

  const hasFormFile = Boolean(selectedBill || (editing && editing.billFileName));
  const formFileName = selectedBill?.name || editing?.billFileName || "";
  const formFileIsPdf = formFileName.toLowerCase().endsWith(".pdf");
  const formFileExt = getFileExtension(formFileName) || (formFileIsPdf ? "PDF" : "IMG");
  const formFileSize = selectedBill?.size ? formatFileSize(selectedBill.size) : "";
  const formFileMeta = formFileSize
    ? `${formFileExt} · ${formFileSize}`
    : `${formFileExt} · Attached receipt`;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      {/* 1. TOP APP BAR: "Expense management" title + Receipt Icon + Add (+) button (no MP profile avatar) */}
      <AtelierHeader
        title="Expense management"
        showProfile={false}
        compactBrand
        backgroundColor="#F9D2DC"
        icon={<Receipt size={18} color="#ffffff" strokeWidth={2.4} />}
        rightAction={
          <TouchableOpacity
            style={styles.headerAddButton}
            onPress={newExpense}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add expense"
          >
            <Plus size={20} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        }
      />

      {/* FIXED TOP SECTION (No separate title row, no Refresh button - search sits directly under app bar with 8px gap) */}
      <View style={styles.fixedTopSection}>
        {/* 3. SEARCH ROW (44px tall, magnifier hint, 300ms debounce, enter key, clear x icon) */}
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

          {/* Calendar icon button: 44px, dot when active, opens date sheet */}
          <TouchableOpacity
            style={[
              styles.iconButtonFilter,
              hasDateFilter && styles.iconButtonFilterActive,
            ]}
            onPress={openDateFilter}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Filter by date range"
          >
            <View style={styles.filterIconWrapper}>
              <CalendarDays
                size={18}
                color={hasDateFilter ? PRIMARY : TEXT_MUTED}
              />
              {hasDateFilter && <View style={styles.activeFilterDot} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. DATE FILTER: Removable chip under search row when active */}
        {hasDateFilter ? (
          <View style={styles.appliedFilterRow}>
            <View style={styles.appliedFilterChip}>
              <CalendarDays size={13} color={PRIMARY} />
              <Text style={styles.appliedFilterText}>
                {`${displayDate(fromDate)} - ${displayDate(toDate)}`}
              </Text>
              <TouchableOpacity
                onPress={clearDateRange}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Clear date filter"
              >
                <X size={13} color={PRIMARY} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      {/* 2. PULL-TO-REFRESH & SCROLLABLE EXPENSE LIST with infinite scroll */}
      <View style={styles.listContainer}>
        <FlatList
          data={pageLoading ? [] : expenses}
          keyExtractor={(expense) => String(expense.id)}
          renderItem={({ item: expense }) => (
            <TouchableOpacity
              style={styles.compactCard}
              activeOpacity={0.7}
              onPress={() => openExpenseDetail(expense)}
              accessibilityRole="button"
              accessibilityLabel={`View expense: ${expense.categoryNotes}. Sourcing Specialists: ${(expense.sourcingSpecialists || []).map((employee) => employee.displayName).join(", ")}`}
            >
              <View style={styles.expenseCardContent}>
                <View style={styles.expenseCardTopRow}>
                  <View style={styles.cardDateRow}>
                    <CalendarDays size={13} color={PRIMARY} strokeWidth={2.2} />
                    <Text style={styles.cardDateText} numberOfLines={1}>
                      {displayDate(expense.expenseDate)}
                    </Text>
                  </View>
                  <Text style={styles.cardAmountText} numberOfLines={1}>
                    {money(expense.amount)}
                  </Text>
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
                    {expense.sourcingSpecialists?.slice(0, 2).map((employee) => (
                      <SpecialistChip key={employee.id} employee={employee} />
                    ))}
                    {(expense.sourcingSpecialists?.length || 0) > 2 ? (
                      <View style={styles.specialistOverflowChip}>
                        <Text style={styles.specialistOverflowText}>
                          +{(expense.sourcingSpecialists?.length || 0) - 2}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.expenseCardBottomRow}>
                  <View style={styles.expenseNotesIconSlot}>
                    <FileText size={14} color={PRIMARY} strokeWidth={2} />
                  </View>
                  <Text
                    style={styles.cardTitleText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {expenseNotesPreview(expense.categoryNotes) || " "}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            pageLoading ? (
              <View style={styles.expenseList}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <View key={`skel-${index}`} style={styles.skeletonCompactCard} />
                ))}
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            !pageLoading ? (
              <Card style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Search size={24} color={PRIMARY} />
                </View>
                <Text style={styles.emptyTitle}>No expenses found</Text>
                <Text style={styles.emptyText}>
                  {hasFilters
                    ? "Try a different search or date range."
                    : "Add your first expense to get started."}
                </Text>
                {hasFilters ? (
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
              </Card>
            ) : undefined
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreRow}>
                <ActivityIndicator size="large" color={PRIMARY} />
              </View>
            ) : undefined
          }
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: getTabBarContentPadding(insets.bottom) + 13 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
          progressViewOffset={8}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.8}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={30}
          removeClippedSubviews={Platform.OS === "android"}
        />
      </View>

      {/* 4. DATE RANGE SHEET MODAL (No quick-range chips, calendar only, pinned Clear all & Apply range) */}
      <Modal
        visible={filtersVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setFiltersVisible(false)}
          />
          <View style={styles.dateSheetCard}>
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
                    <Text key={day} style={styles.calendarWeekday}>
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
        onRequestClose={() => {
          if (datePickerVisible) setDatePickerVisible(false);
          else if (!saving) setFormVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!saving) setFormVisible(false);
            }}
          />
          <View
            style={[
              styles.modalCard,
              { paddingBottom: Math.max(insets.bottom, 16) + 14 },
            ]}
          >
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingRow}>
                <View style={styles.modalHeadingPrefix}>
                  <Receipt size={18} color={PRIMARY} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.modalTitle}>
                    {editing ? "Edit expense" : "Add expense"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => !saving && setFormVisible(false)}
                activeOpacity={0.7}
                accessibilityLabel="Close form"
              >
                <X size={17} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

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
              <Text style={styles.fieldLabel}>
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
                  color={fieldErrors.expenseDate ? "#ef4444" : PRIMARY}
                />
                <Text
                  style={[
                    styles.textInputWithIcon,
                    fieldErrors.expenseDate && styles.textInputError,
                  ]}
                >
                  {formValues.expenseDate
                    ? displayDate(formValues.expenseDate)
                    : "Choose expense date"}
                </Text>
              </TouchableOpacity>
              {fieldErrors.expenseDate ? (
                <View style={styles.fieldErrorBanner}>
                  <AlertCircle size={13} color="#ef4444" />
                  <Text style={styles.fieldErrorText}>
                    {fieldErrors.expenseDate}
                  </Text>
                </View>
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
                    fieldErrors.amount && { color: "#ef4444" },
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
                  style={[
                    styles.textInputWithIcon,
                    fieldErrors.amount && styles.textInputError,
                  ]}
                  accessibilityLabel="Expense amount in rupees"
                  onFocus={() => centerFormField("amount")}
                />
              </View>
              {fieldErrors.amount ? (
                <View style={styles.fieldErrorBanner}>
                  <AlertCircle size={13} color="#ef4444" />
                  <Text style={styles.fieldErrorText}>{fieldErrors.amount}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>
                Sourcing Specialist <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View
                style={styles.sourcingSpecialistPicker}
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
                    const nextOpen = !specialistOptionsOpen;
                    setSpecialistOptionsOpen(nextOpen);
                    if (nextOpen) {
                      centerFormField("specialist", 180);
                    } else {
                      setSpecialistSearch("");
                    }
                  }}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Select Sourcing Specialists. ${formValues.sourcingSpecialistIds.length} selected`}
                  accessibilityState={{ expanded: specialistOptionsOpen }}
                >
                  <Users size={16} color={PRIMARY} />
                  <Text style={styles.sourcingSpecialistTriggerText} numberOfLines={1}>
                    {formValues.sourcingSpecialistIds.length
                      ? `${formValues.sourcingSpecialistIds.length} selected`
                      : "Choose one or more employees"}
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
                {specialistOptionsOpen ? (
                  <View style={styles.sourcingSpecialistOptions}>
                    <View style={styles.sourcingSpecialistSearch}>
                      <Search size={15} color={TEXT_MUTED} />
                      <TextInput
                        value={specialistSearch}
                        onChangeText={(value) => {
                          setSpecialistSearch(value);
                          centerFormField("specialist", 35, false);
                        }}
                        placeholder="Search employees"
                        placeholderTextColor="#9AA3B5"
                        style={styles.sourcingSpecialistSearchInput}
                        autoCorrect={false}
                        returnKeyType="search"
                        accessibilityLabel="Search Sourcing Specialists"
                        onFocus={() => centerFormField("specialist", 50)}
                      />
                    </View>
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      keyboardShouldPersistTaps="always"
                      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                      style={[
                        styles.sourcingSpecialistList,
                        { maxHeight: Math.min(240, Math.max(120, windowHeight * 0.3)) },
                      ]}
                    >
                      {specialistsLoading ? (
                        <View style={styles.specialistLoading}>
                          <ActivityIndicator size="small" color={PRIMARY} />
                          <Text style={styles.sourcingSpecialistEmpty}>Loading employees…</Text>
                        </View>
                      ) : filteredSourcingSpecialists.length ? filteredSourcingSpecialists.map((employee) => {
                        const selected = formValues.sourcingSpecialistIds.includes(employee.id);
                        return (
                          <TouchableOpacity
                            key={employee.id}
                            style={styles.sourcingSpecialistOption}
                            onPress={() => toggleSourcingSpecialist(employee.id)}
                            accessibilityRole="checkbox"
                            accessibilityLabel={employee.displayName}
                            accessibilityHint={selected ? "Remove this specialist" : "Add this specialist"}
                            accessibilityState={{ checked: selected }}
                          >
                            <View style={[styles.sourcingSpecialistCheckbox, selected && styles.sourcingSpecialistCheckboxSelected]}>
                              {selected ? <CheckCircle2 size={15} color="#ffffff" /> : null}
                            </View>
                            <Text style={styles.sourcingSpecialistOptionText}>{employee.displayName}</Text>
                          </TouchableOpacity>
                        );
                      }) : (
                        <Text style={styles.sourcingSpecialistEmpty}>No active employees found.</Text>
                      )}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
              {fieldErrors.sourcingSpecialistIds ? (
                <View style={styles.fieldErrorBanner}>
                  <AlertCircle size={13} color="#ef4444" />
                  <Text style={styles.fieldErrorText}>{fieldErrors.sourcingSpecialistIds}</Text>
                </View>
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
                  fieldErrors.categoryNotes && styles.textInputError,
                ]}
              />
              {fieldErrors.categoryNotes ? (
                <View style={styles.fieldErrorBanner}>
                  <AlertCircle size={13} color="#ef4444" />
                  <Text style={styles.fieldErrorText}>
                    {fieldErrors.categoryNotes}
                  </Text>
                </View>
              ) : null}

              {/* Bill / receipt: two clear options side by side ("Take photo" and "Upload file") */}
              <Text style={styles.fieldLabel}>
                Bill / receipt{" "}
                {editing ? (
                  <Text style={styles.optionalBadge}>(optional)</Text>
                ) : (
                  <Text style={styles.requiredStar}>*</Text>
                )}
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
                          {splitMiddleTruncate(formFileName).start}
                        </Text>
                        {splitMiddleTruncate(formFileName).end ? (
                          <Text style={styles.formFileCardNameEnd}>
                            {splitMiddleTruncate(formFileName).end}
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
                      onPress={() =>
                        void (selectedBill
                          ? viewBill()
                          : viewBill(editing || undefined))
                      }
                      disabled={billLoading}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="View bill"
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
                <View style={styles.fieldErrorBanner}>
                  <AlertCircle size={13} color="#ef4444" />
                  <Text style={styles.fieldErrorText}>{fieldErrors.bill}</Text>
                </View>
              ) : null}

              {formError ? (
                <View style={styles.formError}>
                  <AlertCircle size={15} color="#be123c" />
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              ) : null}
            </ScrollView>

            {/* Fixed footer: Cancel + Create expense */}
            <View style={styles.modalButtonsCompact}>
              <TouchableOpacity
                style={styles.cancelButtonOutlineRed}
                onPress={() => setFormVisible(false)}
                disabled={saving}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
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
                    <Text key={day} style={styles.calendarWeekday}>
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
                    style={styles.filterClear}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterClearText}>Cancel</Text>
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
        </KeyboardAvoidingView>
      </Modal>

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
                    marginBottom: 16,
                    backgroundColor: "#fff5f5",
                    borderWidth: 1,
                    borderColor: "#fda4af",
                    padding: 20,
                  }}
                >
                  {/* Date pill; expense IDs are kept internal and not shown in the UI. */}
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: SURFACE, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "#fda4af" }}>
                      <CalendarDays size={12} color={PRIMARY} />
                      <Text style={{ fontSize: 12, fontWeight: "600", color: TEXT }}>
                        {displayDate(activeExpense.expenseDate)}
                      </Text>
                    </View>
                  </View>
                  {/* Total amount */}
                  <Text style={{ fontSize: 11, fontWeight: "700", color: PRIMARY, letterSpacing: 0.45, marginBottom: 3 }}>
                    TOTAL AMOUNT
                  </Text>
                  <Text style={{ fontSize: 29, fontWeight: "800", color: PRIMARY, letterSpacing: -0.7, lineHeight: 33 }}>
                    {money(activeExpense.amount)}
                  </Text>
                </View>

                {/* ── NOTES STRIP ── */}
                {activeExpense.categoryNotes ? (
                  <View
                    style={{
                      backgroundColor: SURFACE,
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 16,
                      marginBottom: 14,
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

                <View style={styles.sourcingSpecialistDetail}>
                  <Text style={styles.sourcingSpecialistDetailLabel}>SOURCING SPECIALIST</Text>
                  {activeExpense.sourcingSpecialists?.length ? (
                    <View style={styles.detailSpecialistChips}>
                      {activeExpense.sourcingSpecialists.map((employee) => (
                        <SpecialistChip key={employee.id} employee={employee} />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.sourcingSpecialistNoAssignment}>No specialists assigned</Text>
                  )}
                </View>

                {/* ── BILL / RECEIPT ROW ── */}
                {activeExpense.billFileName ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: SURFACE,
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 14,
                      marginBottom: 18,
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
                        {activeExpense.billFileName}
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
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: BACKGROUND, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 18, borderWidth: 1, borderColor: BORDER }}>
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
        onRequestClose={() => setBillPreviewVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setBillPreviewVisible(false)}
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
                  onPress={() => setBillPreviewVisible(false)}
                  activeOpacity={0.7}
                >
                  <X size={17} color={TEXT_MUTED} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.billPreviewContainer}>
              {billLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={PRIMARY} />
                  <Text style={styles.loadingText}>Loading receipt…</Text>
                </View>
              ) : billPreviewUrl ? (
                activeExpense?.billFileName?.toLowerCase().endsWith(".pdf") ? (
                  Platform.OS === "web" ? (
                    <iframe
                      src={billPreviewUrl}
                      style={{ width: "100%", height: 360, border: "none", borderRadius: 12 }}
                      title="Receipt PDF"
                    />
                  ) : (
                    <View style={styles.pdfFallbackBox}>
                      <FileText size={48} color={PRIMARY} />
                      <Text style={styles.pdfFallbackText}>PDF ready to download</Text>
                    </View>
                  )
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
                  <Text style={styles.pdfFallbackText}>Tap Download to save copy</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Alert Dialog */}
      <Modal
        visible={Boolean(expenseToDelete)}
        animationType="fade"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
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
              <Trash2 size={22} color={PRIMARY} />
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
                  <ActivityIndicator size="small" color={PRIMARY} />
                ) : (
                  <Trash2 size={15} color={PRIMARY} />
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
    height: "100%",
    backgroundColor: BACKGROUND,
    overflow: "hidden",
  },
  headerAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      default: {
        boxShadow: "0 2px 6px rgba(225, 29, 72, 0.3)",
      },
    }),
  },
  fixedTopSection: {
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  toolbarRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
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
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    height: 44,
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
    }),
  },
  iconButtonFilter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E9EAF1",
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonFilterActive: {
    borderColor: "#FFC2D5",
    backgroundColor: "#FFF0F5",
  },
  filterIconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  activeFilterDot: {
    position: "absolute",
    top: -2,
    right: -3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: PRIMARY,
    borderWidth: 1.5,
    borderColor: SURFACE,
  },
  appliedFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  appliedFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#FFF0F5",
    borderWidth: 1,
    borderColor: "#FFC2D5",
  },
  appliedFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
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
    paddingBottom: 8,
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
    gap: 9,
    paddingBottom: 6,
  },
  compactCard: {
    minHeight: 112,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9EAF1",
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#292524",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.055,
        shadowRadius: 7,
      },
      android: { elevation: 1 },
      web: { boxShadow: "0 3px 10px rgba(41, 37, 36, 0.055)" },
    }),
  },
  expenseCardContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: "space-between",
    gap: 7,
  },
  expenseCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  expenseCardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    minHeight: 17,
  },
  expenseSourceIconSlot: {
    width: 15,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  expenseNotesIconSlot: {
    width: 15,
    height: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  expenseSourcingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  specialistAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  specialistInitials: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "800",
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
    fontSize: 13,
    lineHeight: 16,
    color: TEXT,
    fontWeight: "700",
    letterSpacing: 0,
  },
  cardTitleText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  cardRightColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
    flexShrink: 0,
  },
  cardAmountText: {
    maxWidth: "58%",
    fontSize: 20,
    lineHeight: 23,
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
    height: 82,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    borderLeftWidth: 4,
    borderLeftColor: "#E9EAF1",
    opacity: 0.7,
    marginBottom: 10,
  },
  emptyCard: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
  },
  emptyText: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
  },
  emptyAction: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#FFF0F5",
  },
  emptyActionText: {
    fontSize: 12,
    fontWeight: "700",
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
    fontWeight: "600",
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
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  dateSheetCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
  },
  modalCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: Platform.OS === "web" ? "92%" : "94%",
    overflow: "hidden",
  },
  sheetHandleRow: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D8DCE7",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  modalHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  modalHeadingPrefix: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFF0F5",
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
    paddingVertical: 14,
  },
  filterCalendar: {
    backgroundColor: BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
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
    marginBottom: 6,
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
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
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
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: SURFACE,
  },
  filterClear: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterClearText: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  applyButton: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonDisabled: {
    opacity: 0.4,
  },
  applyButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 6,
    marginTop: 8,
  },
  requiredStar: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "700",
  },
  optionalBadge: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "400",
  },
  inputErrorRow: {
    borderColor: "#f87171",
    borderWidth: 1.5,
    backgroundColor: "#fef2f2",
  },
  textInputError: {
    color: "#991b1b",
  },
  fieldErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  fieldErrorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  inputIconRow: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  textInputWithIcon: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
  },
  rupeeIcon: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#f87171",
    padding: 2,
    backgroundColor: "#fef2f2",
  },
  filePickerHalfError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  filePickerHalf: {
    flex: 1,
    height: 44,
    borderRadius: 12,
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
    borderRadius: 12,
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
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#FFC2D5",
  },
  formReplaceButton: {
    paddingHorizontal: 8,
    height: 30,
    borderRadius: 8,
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
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#FFC2D5",
    alignItems: "center",
    justifyContent: "center",
  },
  formError: {
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#FFF0F5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FFC2D5",
  },
  formErrorText: {
    flex: 1,
    color: PRIMARY,
    fontSize: 11.5,
  },
  modalButtonsCompact: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  cancelButtonOutlineRed: {
    minWidth: 82,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelTextOutlineRed: {
    color: PRIMARY,
    fontSize: 12.5,
    fontWeight: "600",
  },
  saveButtonPrimary: {
    minWidth: 126,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#16a34a",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  saveButtonPrimaryText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "600",
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
    gap: 7,
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
    gap: 7,
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
  cancelButton: {
    flex: 0.85,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#D8DCE7",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SURFACE,
  },
  cancelText: {
    color: TEXT,
    fontSize: 12.5,
    fontWeight: "800",
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
    opacity: 0.5,
  },
  calendarBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
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
  billPreviewContainer: {
    padding: 16,
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
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
  billPreviewImage: {
    width: "100%",
    height: 350,
    borderRadius: 12,
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
  previewDownloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: PRIMARY,
  },
  previewDownloadText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF0F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
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
    flex: 1.15,
    height: 42,
    borderRadius: 21,
    backgroundColor: SURFACE,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  deleteConfirmText: {
    color: PRIMARY,
    fontSize: 12.5,
    fontWeight: "800",
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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cameraCancelText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  sourcingSpecialistPicker: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    backgroundColor: SURFACE,
    overflow: "hidden",
  },
  sourcingSpecialistTrigger: {
    minHeight: 46,
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
  sourcingSpecialistOptions: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 8,
    gap: 6,
  },
  sourcingSpecialistSearch: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: BACKGROUND,
  },
  sourcingSpecialistSearchInput: {
    flex: 1,
    height: 38,
    fontSize: 12,
    color: TEXT,
  },
  sourcingSpecialistList: {
    maxHeight: 150,
  },
  specialistLoading: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sourcingSpecialistOption: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 6,
  },
  sourcingSpecialistCheckbox: {
    width: 19,
    height: 19,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sourcingSpecialistCheckboxSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
  },
  sourcingSpecialistOptionText: {
    flex: 1,
    fontSize: 13,
    color: TEXT,
  },
  sourcingSpecialistEmpty: {
    paddingHorizontal: 6,
    paddingVertical: 12,
    color: TEXT_MUTED,
    fontSize: 12,
  },
  sourcingSpecialistDetail: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
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
