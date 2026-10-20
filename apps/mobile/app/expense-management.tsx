import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  CalendarDays,
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
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react-native";
import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import { getApiBaseUrl, getAuthToken, mobileApiClient } from "../lib/api-client";
import * as Sharing from "expo-sharing";

type Expense = {
  id: number;
  expenseDate: string;
  amount: number | string;
  categoryNotes: string;
  billFileName: string;
  billUrl?: string;
  createdAt?: string;
  updatedAt?: string | null;
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
};

type ExpenseFormValues = {
  expenseDate: string;
  amount: string;
  categoryNotes: string;
};

type Notice = { kind: "success" | "error"; message: string };

const PAGE_SIZE = 10;
const MAX_BILL_SIZE = 5 * 1024 * 1024;
const PRIMARY = "#e11d48";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const SURFACE = "#ffffff";
const BACKGROUND = "#f8fafc";
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

function localIsoToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function displayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
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

function mimeFromName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "pdf") return "application/pdf";
  return "application/octet-stream";
}

async function multipartExpenseRequest(expenseId: number | null, body: FormData) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const token = await getAuthToken();
  const response = await fetch(`${baseUrl}${expenseId === null ? "/api/expenses" : `/api/expenses/${expenseId}`}`, {
    method: expenseId === null ? "POST" : "PUT",
    headers: token ? { Accept: "application/json", Authorization: `Bearer ${token}` } : { Accept: "application/json" },
    body,
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const bodyJson = await response.json();
      const validationMessage = bodyJson.errors ? Object.values(bodyJson.errors).flat().join(" ") : "";
      message = validationMessage || bodyJson.message || bodyJson.detail || bodyJson.title || message;
    } catch {
      // Keep the HTTP fallback message for non-JSON error responses.
    }
    throw new Error(message);
  }
  return response.json();
}

async function fetchBillResponse(expense: Expense) {
  const token = await getAuthToken();
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/expenses/${expense.id}/bill`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "No receipt was found for this expense." : `Unable to download receipt (${response.status}).`);
  }
  return response;
}


async function openBillInNativeViewer(expense: Expense) {
  const response = await fetchBillResponse(expense);

  const contentType =
    response.headers.get("content-type") ||
    mimeFromName(expense.billFileName);

  const safeName = (
    expense.billFileName || `expense-${expense.id}-bill`
  ).replace(/[^a-zA-Z0-9._-]/g, "_");

  const previewFile = new File(
    Paths.cache,
    `${expense.id}-${Date.now()}-${safeName}`
  );

  await previewFile.write(
    new Uint8Array(await response.arrayBuffer())
  );

  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error(
      "Native file sharing is not available on this device."
    );
  }

  await Sharing.shareAsync(previewFile.uri, {
    mimeType: contentType,
    dialogTitle: safeName,
  });
}


async function openBillInBrowser(expense: Expense) {
  const response = await fetchBillResponse(expense);
  const objectUrl = URL.createObjectURL(await response.blob());
  await Linking.openURL(objectUrl);
  // Keep the temporary URL alive long enough for the browser tab to read it.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export default function ExpenseManagementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);

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
  const [formValues, setFormValues] = useState<ExpenseFormValues>({ expenseDate: localIsoToday(), amount: "", categoryNotes: "" });
  const [selectedBill, setSelectedBill] = useState<SelectedBill | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickingBill, setPickingBill] = useState(false);
  const [formError, setFormError] = useState("");

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [activeExpense, setActiveExpense] = useState<Expense | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [billLoading, setBillLoading] = useState(false);

  const loadExpenses = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setPageLoading(true);
    const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) query.set("search", search.trim());
    if (fromDate) query.set("fromDate", fromDate);
    if (toDate) query.set("toDate", toDate);
    try {
      const result = await mobileApiClient<ExpensePageResult | Expense[]>(`/api/expenses?${query.toString()}`);
      if (Array.isArray(result)) {
        setExpenses(result);
        setTotalCount(result.length);
      } else {
        setExpenses(Array.isArray(result.items) ? result.items : []);
        setTotalCount(Number(result.totalCount) || 0);
      }
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Unable to load expenses." });
      setExpenses([]);
      setTotalCount(0);
    } finally {
      setPageLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, page, refreshKey, search, toDate]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  const visibleSpend = useMemo(() => expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0), [expenses]);
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilters = Boolean(search || fromDate || toDate);
  const calendarCells = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [calendarMonth]);

  const newExpense = () => {
    setEditing(null);
    setFormValues({ expenseDate: localIsoToday(), amount: "", categoryNotes: "" });
    setSelectedBill(null);
    setFormError("");
    setFormVisible(true);
  };

  const editExpense = (expense: Expense) => {
    setEditing(expense);
    setFormValues({ expenseDate: expense.expenseDate.slice(0, 10), amount: String(expense.amount), categoryNotes: expense.categoryNotes });
    setSelectedBill(null);
    setFormError("");
    setFormVisible(true);
  };

  const chooseBill = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Choose receipt", "Use the web app at /expenses to upload a receipt from your browser.");
      return;
    }
    setPickingBill(true);
    try {
      const result = await File.pickFileAsync({ mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"] });
      if (result.canceled) return;
      const file = result.result;
      const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        Alert.alert("Unsupported file", "Choose a JPG, PNG, WEBP or PDF receipt.");
        return;
      }
      if (file.size !== null && file.size > MAX_BILL_SIZE) {
        Alert.alert("File too large", "Receipt files must be 5 MB or smaller.");
        return;
      }
      setSelectedBill({ uri: file.uri, name: file.name, size: file.size ?? 0, type: file.type || mimeFromName(file.name) });
    } catch (error) {
      Alert.alert("Unable to choose receipt", error instanceof Error ? error.message : "Please try choosing the file again.");
    } finally {
      setPickingBill(false);
    }
  };

  const saveExpense = async () => {
    setFormError("");
    const amount = Number(formValues.amount);
    if (!formValues.expenseDate) return setFormError("Choose the expense date.");
    if (formValues.expenseDate > localIsoToday()) return setFormError("Expense date cannot be in the future.");
    if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999.99) return setFormError("Enter a valid amount up to ₹99,99,999.99.");
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) return setFormError("Amount can have at most 2 decimal places.");
    if (formValues.categoryNotes.trim().length < 2 || formValues.categoryNotes.trim().length > 250) return setFormError("Notes must contain 2 to 250 characters.");
    if (!editing && !selectedBill) return setFormError("Attach a bill or receipt before creating the expense.");
    if (selectedBill && selectedBill.size > MAX_BILL_SIZE) return setFormError("Receipt files must be 5 MB or smaller.");

    const body = new FormData();
    body.append("expenseDate", formValues.expenseDate);
    body.append("amount", formValues.amount);
    body.append("categoryNotes", formValues.categoryNotes.trim());
    if (selectedBill) {
      body.append("bill", {
        uri: selectedBill.uri,
        name: selectedBill.name,
        type: selectedBill.type,
      } as unknown as Blob);
    }

    setSaving(true);
    try {
      await multipartExpenseRequest(editing?.id ?? null, body);
      setFormVisible(false);
      setNotice({ kind: "success", message: editing ? "Expense updated successfully." : "Expense added successfully." });
      setPage(1);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save this expense.");
    } finally {
      setSaving(false);
    }
  };

  const showDetails = async (expense: Expense) => {
    setActiveExpense(expense);
    setDetailsVisible(true);
    setDetailsLoading(true);
    try {
      const result = await mobileApiClient<Expense>(`/api/expenses/${expense.id}`);
      setActiveExpense(result);
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Unable to load expense details." });
    } finally {
      setDetailsLoading(false);
    }
  };

  const viewBill = async (expense: Expense) => {
    setBillLoading(true);
    try {
      if (Platform.OS === "web") {
        await openBillInBrowser(expense);
      } else {
        await openBillInNativeViewer(expense);
      }
    } catch (error) {
      Alert.alert("Unable to open receipt", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBillLoading(false);
    }
  };

  const executeDelete = async (expense: Expense) => {
    try {
      await mobileApiClient(`/api/expenses/${expense.id}`, { method: "DELETE" });
      setNotice({ kind: "success", message: `Expense #${expense.id} deleted successfully.` });
      if (detailsVisible && activeExpense?.id === expense.id) setDetailsVisible(false);
      if (expenses.length === 1 && page > 1) setPage((current) => current - 1);
      else setRefreshKey((key) => key + 1);
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "Unable to delete the expense." });
    }
  };

  const confirmDelete = (expense: Expense) => {
    Alert.alert("Delete expense?", `Expense #${expense.id} · ${expense.categoryNotes}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void executeDelete(expense) },
    ]);
  };

  const applySearchAndDates = () => {
    if (fromDraft && toDraft && fromDraft > toDraft) {
      Alert.alert("Check date range", "The start date must be before the end date.");
      return;
    }
    if ((fromDraft && !/^\d{4}-\d{2}-\d{2}$/.test(fromDraft)) || (toDraft && !/^\d{4}-\d{2}-\d{2}$/.test(toDraft))) {
      Alert.alert("Check date format", "Enter dates as YYYY-MM-DD.");
      return;
    }
    setSearch(searchDraft.trim());
    setFromDate(fromDraft);
    setToDate(toDraft);
    setPage(1);
    setFiltersVisible(false);
  };

  const clearFilters = () => {
    setSearchDraft("");
    setSearch("");
    setFromDraft("");
    setToDraft("");
    setFromDate("");
    setToDate("");
    setPage(1);
    setFiltersVisible(false);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 18) + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadExpenses(true)} tintColor={PRIMARY} colors={[PRIMARY]} />}
      >
        <View style={styles.headingRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/expense")} accessibilityLabel="Back to app">
            <ArrowLeft size={17} color={TEXT} />
          </TouchableOpacity>
          <View style={styles.headingIcon}><Receipt size={19} color={PRIMARY} /></View>
          <View style={styles.headingTextWrap}>
            <Text style={styles.title}>Expense management</Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => void loadExpenses(true)} disabled={refreshing || pageLoading}>
            {refreshing ? <ActivityIndicator size="small" color={MUTED} /> : <RefreshCw size={15} color={MUTED} />}
            <Text style={styles.secondaryButtonText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={newExpense}>
            <Plus size={17} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Add expense</Text>
          </TouchableOpacity>
        </View>

        {notice ? (
          <View style={[styles.notice, notice.kind === "success" ? styles.noticeSuccess : styles.noticeError]}>
            {notice.kind === "success" ? <CheckCircle2 size={17} color="#047857" /> : <AlertCircle size={17} color="#be123c" />}
            <Text style={[styles.noticeText, notice.kind === "success" ? styles.noticeSuccessText : styles.noticeErrorText]}>{notice.message}</Text>
            <TouchableOpacity onPress={() => setNotice(null)} accessibilityLabel="Dismiss message"><X size={16} color={notice.kind === "success" ? "#047857" : "#be123c"} /></TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.listHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Expense records</Text>
            <Text style={styles.sectionHint}>Search entries and manage receipts.</Text>
          </View>
          <TouchableOpacity style={[styles.filterButton, filtersVisible && styles.filterButtonActive]} onPress={() => setFiltersVisible((visible) => !visible)}>
            <CalendarDays size={15} color={filtersVisible ? PRIMARY : MUTED} />
            <Text style={[styles.filterButtonText, filtersVisible && styles.filterButtonTextActive]}>Date range</Text>
            <ChevronDown size={14} color={filtersVisible ? PRIMARY : MUTED} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={17} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              value={searchDraft}
              onChangeText={setSearchDraft}
              placeholder="Search expenses..."
              placeholderTextColor="#94a3b8"
              returnKeyType="search"
              onSubmitEditing={applySearchAndDates}
              accessibilityLabel="Search expenses"
            />
            {searchDraft ? <TouchableOpacity onPress={() => setSearchDraft("")} accessibilityLabel="Clear search input"><X size={15} color={MUTED} /></TouchableOpacity> : null}
          </View>
          <TouchableOpacity style={styles.searchSubmit} onPress={applySearchAndDates}><Text style={styles.searchSubmitText}>Go</Text></TouchableOpacity>
        </View>

        {filtersVisible ? (
          <View style={styles.filterPanel}>
            <Text style={styles.fieldLabel}>Quick ranges</Text>
            <View style={styles.datePresetGrid}>
              {["Today", "Yesterday", "Last 7 days", "Last 30 days", "Month to date", "Last month", "Year to date", "Last year"].map((preset) => (
                <TouchableOpacity key={preset} style={styles.datePreset} onPress={() => {
                  const today = new Date(); const start = new Date(today); const end = new Date(today);
                  if (preset === "Yesterday") { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
                  else if (preset === "Last 7 days") start.setDate(start.getDate() - 6);
                  else if (preset === "Last 30 days") start.setDate(start.getDate() - 29);
                  else if (preset === "Month to date") start.setDate(1);
                  else if (preset === "Last month") { start.setMonth(start.getMonth() - 1, 1); end.setDate(0); }
                  else if (preset === "Year to date") start.setMonth(0, 1);
                  else if (preset === "Last year") { start.setFullYear(start.getFullYear() - 1, 0, 1); end.setFullYear(end.getFullYear() - 1, 11, 31); }
                  const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                  setFromDraft(iso(start)); setToDraft(iso(end)); setFromDate(iso(start)); setToDate(iso(end)); setPage(1); setFiltersVisible(false);
                }}><Text style={styles.datePresetText}>{preset}</Text></TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterCalendar}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity style={styles.calendarNav} onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft size={16} color={TEXT} /></TouchableOpacity>
                <Text style={styles.calendarMonthTitle}>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(calendarMonth)}</Text>
                <TouchableOpacity style={styles.calendarNav} onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight size={16} color={TEXT} /></TouchableOpacity>
              </View>
              <View style={styles.calendarWeekRow}>{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <Text key={day} style={styles.calendarWeekday}>{day}</Text>)}</View>
              <View style={styles.calendarGrid}>{calendarCells.map((day) => {
                const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                const selected = iso === fromDraft || iso === toDraft;
                const inRange = Boolean(fromDraft && toDraft && iso > fromDraft && iso < toDraft);
                const disabled = iso > localIsoToday();
                return <TouchableOpacity key={iso} disabled={disabled} style={[styles.calendarDay, day.getMonth() !== calendarMonth.getMonth() && styles.calendarDayOutside, selected && styles.calendarDaySelected, inRange && styles.calendarRangeDay, disabled && styles.calendarDayDisabled]} onPress={() => { if (!fromDraft || (fromDraft && toDraft)) { setFromDraft(iso); setToDraft(""); } else if (iso < fromDraft) setFromDraft(iso); else setToDraft(iso); }}><Text style={[styles.calendarDayText, day.getMonth() !== calendarMonth.getMonth() && styles.calendarDayOutsideText, selected && styles.calendarDaySelectedText, disabled && styles.calendarDayDisabledText]}>{day.getDate()}</Text></TouchableOpacity>;
              })}</View>
            </View>
            <Text style={styles.fieldLabel}>Custom range · YYYY-MM-DD</Text>
            <TextInput value={fromDraft} onChangeText={setFromDraft} placeholder="From date" placeholderTextColor="#94a3b8" style={styles.filterInput} autoCapitalize="none" />
            <TextInput value={toDraft} onChangeText={setToDraft} placeholder="To date" placeholderTextColor="#94a3b8" style={styles.filterInput} autoCapitalize="none" />
            <View style={styles.filterActions}>
              <TouchableOpacity onPress={clearFilters} style={styles.filterClear}><Text style={styles.filterClearText}>Clear all</Text></TouchableOpacity>
              <TouchableOpacity onPress={applySearchAndDates} style={styles.applyButton}><Text style={styles.applyButtonText}>Apply range</Text></TouchableOpacity>
            </View>
          </View>
        ) : null}

        {pageLoading ? (
          <View style={styles.loadingBox}><ActivityIndicator size="large" color={PRIMARY} /><Text style={styles.loadingText}>Loading expense records…</Text></View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIcon}><Receipt size={25} color={PRIMARY} /></View>
            <Text style={styles.emptyTitle}>{hasFilters ? "No matching expenses" : "Your expense list is empty"}</Text>
            <Text style={styles.emptyText}>{hasFilters ? "Try a different search or date range." : "Add your first expense and attach its receipt."}</Text>
            {hasFilters ? <TouchableOpacity style={styles.emptyAction} onPress={clearFilters}><Text style={styles.emptyActionText}>Clear filters</Text></TouchableOpacity> : null}
          </View>
        ) : (
          <View style={styles.expenseList}>
            {expenses.map((expense) => (
              <View key={expense.id} style={styles.expenseCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.receiptIcon}><Receipt size={19} color={PRIMARY} /></View>
                  <View style={styles.expenseMain}>
                    <Text style={styles.expenseName}>{expense.categoryNotes}</Text>
                    <Text style={styles.expenseMeta}>#{expense.id}  ·  {displayDate(expense.expenseDate)}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>{money(expense.amount)}</Text>
                </View>
                <TouchableOpacity style={styles.billLine} onPress={() => void showDetails(expense)}>
                  {expense.billFileName?.toLowerCase().endsWith(".pdf") ? <FileText size={15} color={PRIMARY} /> : <FileImage size={15} color={PRIMARY} />}
                  <Text style={styles.billName} numberOfLines={1}>{expense.billFileName || "View attached receipt"}</Text>
                  <Eye size={15} color={PRIMARY} />
                </TouchableOpacity>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.cardActionButton} onPress={() => void showDetails(expense)}><Eye size={15} color={MUTED} /><Text style={styles.cardActionText}>View</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.cardActionButton} onPress={() => editExpense(expense)}><Pencil size={15} color={MUTED} /><Text style={styles.cardActionText}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.cardActionButton} onPress={() => confirmDelete(expense)}><Trash2 size={15} color="#be123c" /><Text style={[styles.cardActionText, { color: "#be123c" }]}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.pagination}>
          <Text style={styles.paginationLabel}>{totalCount === 0 ? "No records" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount}`}</Text>
          <View style={styles.pageButtons}>
            <TouchableOpacity style={[styles.pageButton, (page <= 1 || pageLoading) && styles.pageButtonDisabled]} disabled={page <= 1 || pageLoading} onPress={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={17} color={page <= 1 ? "#cbd5e1" : TEXT} /></TouchableOpacity>
            <Text style={styles.pageIndicator}>{page} / {pageCount}</Text>
            <TouchableOpacity style={[styles.pageButton, (page >= pageCount || pageLoading) && styles.pageButtonDisabled]} disabled={page >= pageCount || pageLoading} onPress={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight size={17} color={page >= pageCount ? "#cbd5e1" : TEXT} /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.tipBox}><Sparkles size={16} color={PRIMARY} /><Text style={styles.tipText}>Receipts are saved with each expense. Replacing a receipt is optional when editing an existing entry.</Text></View>
      </ScrollView>

      {/* New / edit expense */}
      <Modal visible={formVisible} animationType="slide" transparent onRequestClose={() => !saving && setFormVisible(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !saving && setFormVisible(false)} />
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}><Text style={styles.modalTitle}>{editing ? `Edit expense #${editing.id}` : "Add a new expense"}</Text><Text style={styles.modalSubtitle}>{editing ? "Make changes to this expense." : "Enter purchase details and attach a receipt."}</Text></View>
              <TouchableOpacity style={styles.closeButton} onPress={() => !saving && setFormVisible(false)} accessibilityLabel="Close form"><X size={18} color={MUTED} /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBody}>
              <Text style={styles.fieldLabel}>Expense date *</Text>
              <TouchableOpacity style={styles.inputIconRow} activeOpacity={0.8} onPress={() => { const selected = formValues.expenseDate ? new Date(`${formValues.expenseDate}T00:00:00`) : new Date(); setCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1)); setDatePickerVisible(true); }}>
                <CalendarDays size={17} color={PRIMARY} />
                <Text style={styles.textInputWithIcon}>{formValues.expenseDate ? displayDate(formValues.expenseDate) : "Choose expense date"}</Text>
                <ChevronDown size={15} color={MUTED} />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Amount (INR) *</Text>
              <View style={styles.inputIconRow}><Text style={styles.rupeeIcon}>₹</Text><TextInput value={formValues.amount} onChangeText={(amount) => setFormValues((old) => ({ ...old, amount }))} placeholder="0.00" keyboardType="decimal-pad" style={styles.textInputWithIcon} /></View>

              <Text style={styles.fieldLabel}>Category / notes *</Text>
              <TextInput
                value={formValues.categoryNotes}
                onChangeText={(categoryNotes) => setFormValues((old) => ({ ...old, categoryNotes }))}
                placeholder="e.g. Fabric purchase, 2 Shirts order"
                multiline
                maxLength={250}
                textAlignVertical="top"
                style={[styles.textInput, styles.notesInput]}
              />
              <Text style={styles.counterText}>{formValues.categoryNotes.length}/250 characters</Text>

              <Text style={styles.fieldLabel}>Bill / receipt {editing ? "(optional)" : "*"}</Text>
              <TouchableOpacity style={styles.filePicker} onPress={() => void chooseBill()} disabled={pickingBill}>
                <View style={styles.filePickerIcon}>{pickingBill ? <LoaderCircle size={20} color={PRIMARY} /> : selectedBill ? <FileText size={20} color={PRIMARY} /> : <UploadCloud size={20} color={PRIMARY} />}</View>
                <View style={{ flex: 1 }}><Text style={styles.filePickerTitle} numberOfLines={1}>{selectedBill?.name || editing?.billFileName || "Choose receipt file"}</Text><Text style={styles.filePickerHint}>JPG, PNG, WEBP or PDF · max 5 MB</Text></View>
                <Text style={styles.browseText}>{pickingBill ? "..." : "Browse"}</Text>
              </TouchableOpacity>
              {selectedBill ? <TouchableOpacity style={styles.removeBill} onPress={() => setSelectedBill(null)}><X size={13} color={MUTED} /><Text style={styles.removeBillText}>Remove selected file</Text></TouchableOpacity> : null}

              {formError ? <View style={styles.formError}><AlertCircle size={16} color="#be123c" /><Text style={styles.formErrorText}>{formError}</Text></View> : null}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setFormVisible(false)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveButton, saving && styles.disabledButton]} onPress={() => void saveExpense()} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <CheckCircle2 size={16} color="#ffffff" />}
                  <Text style={styles.saveButtonText}>{saving ? "Saving…" : editing ? "Save changes" : "Create expense"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Calendar 14 style date picker */}
      <Modal visible={datePickerVisible} animationType="fade" transparent onRequestClose={() => setDatePickerVisible(false)}>
        <View style={styles.calendarBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDatePickerVisible(false)} />
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.calendarNav} onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} accessibilityLabel="Previous month"><ChevronLeft size={18} color={TEXT} /></TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(calendarMonth)}</Text>
              <TouchableOpacity style={styles.calendarNav} onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} accessibilityLabel="Next month" disabled={calendarMonth.getFullYear() === new Date().getFullYear() && calendarMonth.getMonth() >= new Date().getMonth()}><ChevronRight size={18} color={TEXT} /></TouchableOpacity>
            </View>
            <View style={styles.calendarWeekRow}>{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <Text key={day} style={styles.calendarWeekday}>{day}</Text>)}</View>
            <View style={styles.calendarGrid}>
              {calendarCells.map((day) => {
                const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                const inMonth = day.getMonth() === calendarMonth.getMonth();
                const selected = iso === formValues.expenseDate;
                const disabled = iso > localIsoToday();
                return <TouchableOpacity key={iso} disabled={disabled} style={[styles.calendarDay, !inMonth && styles.calendarDayOutside, selected && styles.calendarDaySelected, disabled && styles.calendarDayDisabled]} onPress={() => { setFormValues((old) => ({ ...old, expenseDate: iso })); setDatePickerVisible(false); }}><Text style={[styles.calendarDayText, !inMonth && styles.calendarDayOutsideText, selected && styles.calendarDaySelectedText, disabled && styles.calendarDayDisabledText]}>{day.getDate()}</Text></TouchableOpacity>;
              })}
            </View>
            <View style={styles.calendarFooter}>
              <TouchableOpacity onPress={() => setDatePickerVisible(false)} style={styles.filterClear}><Text style={styles.filterClearText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setFormValues((old) => ({ ...old, expenseDate: localIsoToday() })); setCalendarMonth(new Date()); setDatePickerVisible(false); }} style={styles.applyButton}><Text style={styles.applyButtonText}>Today</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Expense details */}
      <Modal visible={detailsVisible} animationType="slide" transparent onRequestClose={() => setDetailsVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailsVisible(false)} />
          <View style={[styles.modalCard, styles.detailsCard, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}><Text style={styles.modalTitle}>{activeExpense ? `Expense #${activeExpense.id}` : "Expense details"}</Text><Text style={styles.modalSubtitle}>Expense details and attached receipt.</Text></View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setDetailsVisible(false)} accessibilityLabel="Close details"><X size={18} color={MUTED} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {detailsLoading || !activeExpense ? <View style={styles.loadingBox}><ActivityIndicator size="large" color={PRIMARY} /><Text style={styles.loadingText}>Loading details…</Text></View> : <>
                <View style={styles.detailPanel}>
                  <Text style={styles.detailLabel}>CATEGORY / NOTES</Text>
                  <Text style={styles.detailDescription}>{activeExpense.categoryNotes}</Text>
                  <Text style={styles.detailDate}>{displayDate(activeExpense.expenseDate)}</Text>
                  <View style={styles.detailDivider} />
                  <Text style={styles.detailLabel}>AMOUNT</Text>
                  <Text style={styles.detailAmount}>{money(activeExpense.amount)}</Text>
                  <Text style={styles.detailLabel}>RECEIPT FILE</Text>
                  <Text style={styles.detailFile}>{activeExpense.billFileName || "No filename returned"}</Text>
                  <Text style={styles.detailLabel}>LAST UPDATED</Text>
                  <Text style={styles.detailFile}>{activeExpense.updatedAt ? displayDate(activeExpense.updatedAt) : "Not updated"}</Text>
                </View>
                <TouchableOpacity style={styles.openBillButton} onPress={() => void viewBill(activeExpense)} disabled={billLoading}>
                  {billLoading ? <ActivityIndicator size="small" color={PRIMARY} /> : <ArrowDownToLine size={17} color={PRIMARY} />}
                  <Text style={styles.openBillText}>{billLoading ? "Opening receipt…" : "View / download receipt"}</Text>
                </TouchableOpacity>
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => confirmDelete(activeExpense)}><Trash2 size={15} color="#be123c" /><Text style={[styles.cancelText, { color: "#be123c" }]}>Delete</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={() => { setDetailsVisible(false); editExpense(activeExpense); }}><Pencil size={15} color="#ffffff" /><Text style={styles.saveButtonText}>Edit expense</Text></TouchableOpacity>
                </View>
              </>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND },
  scrollContent: { paddingHorizontal: 16, gap: 17 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  backButton: { width: 32, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  headingIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#ffe4e6" },
  headingTextWrap: { flex: 1 },
  eyebrow: { color: PRIMARY, letterSpacing: 1.5, fontSize: 9, fontWeight: "800", marginBottom: 4 },
  title: { color: TEXT, fontSize: 19, lineHeight: 24, letterSpacing: -0.4, fontWeight: "800" },
  subtitle: { color: MUTED, fontSize: 12, marginTop: 4 },
  topActions: { flexDirection: "row", gap: 9 },
  primaryButton: { minHeight: 42, flex: 1.15, paddingHorizontal: 14, borderRadius: 22, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  primaryButtonText: { fontSize: 12, fontWeight: "800", color: "#ffffff" },
  secondaryButton: { minHeight: 42, flex: 0.85, paddingHorizontal: 14, borderRadius: 22, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  secondaryButtonText: { fontSize: 12, fontWeight: "700", color: TEXT },
  notice: { borderRadius: 13, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 10, gap: 8, flexDirection: "row", alignItems: "center" },
  noticeSuccess: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
  noticeError: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 16 },
  noticeSuccessText: { color: "#047857" },
  noticeErrorText: { color: "#be123c" },
  listHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  sectionHint: { color: MUTED, fontSize: 11, marginTop: 3 },
  filterButton: { borderWidth: 1, borderColor: BORDER, borderRadius: 18, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center", flexDirection: "row", gap: 5, backgroundColor: SURFACE },
  filterButtonActive: { borderColor: "#fecdd3", backgroundColor: "#fff1f2" },
  filterButtonText: { color: MUTED, fontSize: 11, fontWeight: "700" },
  filterButtonTextActive: { color: PRIMARY },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchBox: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, height: 42, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 13 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 0, color: TEXT, fontSize: 12 },
  searchSubmit: { height: 42, borderRadius: 13, paddingHorizontal: 17, justifyContent: "center", alignItems: "center", backgroundColor: "#ffe4e6" },
  searchSubmitText: { color: "#be123c", fontSize: 12, fontWeight: "800" },
  filterPanel: { backgroundColor: SURFACE, borderRadius: 16, borderColor: BORDER, borderWidth: 1, padding: 13, gap: 7 },
  datePresetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 5 },
  datePreset: { borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8, backgroundColor: BACKGROUND },
  datePresetText: { color: TEXT, fontSize: 11, fontWeight: "500" },
  filterCalendar: { borderWidth: 1, borderColor: BORDER, borderRadius: 13, padding: 9, marginTop: 4, backgroundColor: BACKGROUND },
  calendarRangeDay: { backgroundColor: "#ffe4e6" },
  calendarBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 18, backgroundColor: "rgba(15,23,42,0.35)" },
  calendarCard: { width: "100%", maxWidth: 360, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 15, backgroundColor: SURFACE, shadowColor: "#0f172a", shadowOpacity: 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  calendarNav: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: BACKGROUND },
  calendarMonthTitle: { color: TEXT, fontSize: 14, fontWeight: "800" },
  calendarWeekRow: { flexDirection: "row", marginBottom: 5 },
  calendarWeekday: { flex: 1, textAlign: "center", color: MUTED, fontSize: 11, paddingVertical: 7 },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarDay: { width: "14.2857%", aspectRatio: 1.05, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  calendarDayOutside: { opacity: 0.4 },
  calendarDaySelected: { backgroundColor: PRIMARY },
  calendarDayDisabled: { opacity: 0.25 },
  calendarDayText: { color: TEXT, fontSize: 12, fontWeight: "600" },
  calendarDayOutsideText: { color: MUTED },
  calendarDaySelectedText: { color: "#ffffff", fontWeight: "800" },
  calendarDayDisabledText: { color: MUTED },
  calendarFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: BORDER, marginTop: 12, paddingTop: 10 },
  fieldLabel: { color: TEXT, fontSize: 12, fontWeight: "700", marginTop: 5, marginBottom: 1 },
  filterInput: { height: 41, backgroundColor: BACKGROUND, borderWidth: 1, borderColor: BORDER, borderRadius: 11, paddingHorizontal: 11, fontSize: 12, color: TEXT },
  filterActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  filterClear: { paddingVertical: 9, paddingHorizontal: 5 },
  filterClearText: { color: PRIMARY, fontSize: 12, fontWeight: "700" },
  applyButton: { backgroundColor: PRIMARY, borderRadius: 20, paddingVertical: 10, paddingHorizontal: 15 },
  applyButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  loadingBox: { alignItems: "center", justifyContent: "center", minHeight: 180, gap: 11 },
  loadingText: { color: MUTED, fontSize: 12 },
  emptyBox: { alignItems: "center", justifyContent: "center", backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 22, paddingVertical: 32 },
  emptyIcon: { height: 56, width: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#fff1f2" },
  emptyTitle: { color: TEXT, fontSize: 15, fontWeight: "800", marginTop: 14, textAlign: "center" },
  emptyText: { color: MUTED, fontSize: 11, lineHeight: 17, textAlign: "center", maxWidth: 260, marginTop: 6 },
  emptyAction: { marginTop: 15, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 22, backgroundColor: PRIMARY, flexDirection: "row", alignItems: "center", gap: 6 },
  emptyActionText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
  expenseList: { gap: 10 },
  expenseCard: { backgroundColor: SURFACE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 13, shadowColor: "#0f172a", shadowOpacity: 0.025, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 1 },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  receiptIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: "#fff1f2", alignItems: "center", justifyContent: "center" },
  expenseMain: { flex: 1, minWidth: 0, paddingTop: 1 },
  expenseName: { color: TEXT, fontSize: 12, lineHeight: 17, fontWeight: "800" },
  expenseMeta: { color: MUTED, fontSize: 10, marginTop: 4 },
  expenseAmount: { color: TEXT, fontSize: 12, fontWeight: "800", paddingTop: 1, maxWidth: 112, textAlign: "right" },
  billLine: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#fff1f2", paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, marginTop: 12 },
  billName: { color: "#9f1239", fontSize: 10, fontWeight: "700", flex: 1 },
  cardActions: { borderTopWidth: 1, borderTopColor: "#f1f5f9", marginTop: 11, paddingTop: 9, flexDirection: "row", alignItems: "center", gap: 7 },
  cardActionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#f8fafc", paddingVertical: 8, borderRadius: 10 },
  cardActionText: { color: MUTED, fontSize: 10, fontWeight: "700" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 9 },
  paginationLabel: { color: MUTED, fontSize: 10, flex: 1 },
  pageButtons: { flexDirection: "row", alignItems: "center", gap: 6 },
  pageButton: { width: 31, height: 31, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  pageButtonDisabled: { backgroundColor: "#f8fafc", borderColor: "#f1f5f9" },
  pageIndicator: { color: TEXT, fontSize: 10, fontWeight: "700", minWidth: 35, textAlign: "center" },
  tipBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderColor: "#ffe4e6", backgroundColor: "#fff1f2", borderRadius: 13, padding: 12 },
  tipText: { flex: 1, color: "#9f1239", fontSize: 10, lineHeight: 16 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.45)" },
  modalCard: { maxHeight: "92%", backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", paddingTop: 3 },
  detailsCard: { maxHeight: "86%" },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 13, paddingHorizontal: 19, paddingTop: 18, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: BORDER },
  modalTitle: { fontSize: 17, lineHeight: 22, fontWeight: "800", color: TEXT },
  modalSubtitle: { marginTop: 4, color: MUTED, fontSize: 11, lineHeight: 16 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  modalBody: { paddingHorizontal: 19, paddingTop: 17, paddingBottom: 13, gap: 7 },
  inputIconRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, minHeight: 45, backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER },
  textInputWithIcon: { color: TEXT, fontSize: 13, minWidth: 0, flex: 1, paddingVertical: 10 },
  textInput: { color: TEXT, fontSize: 13, backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 11 },
  rupeeIcon: { color: MUTED, fontSize: 16, fontWeight: "700" },
  notesInput: { minHeight: 85, lineHeight: 19 },
  counterText: { color: MUTED, fontSize: 9, textAlign: "right", marginTop: -3 },
  filePicker: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, borderStyle: "dashed", borderWidth: 1, borderColor: "#fda4af", borderRadius: 14, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: "#fffafa" },
  filePickerIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#ffe4e6" },
  filePickerTitle: { color: TEXT, fontSize: 11, fontWeight: "800" },
  filePickerHint: { color: MUTED, fontSize: 9, marginTop: 3 },
  browseText: { color: PRIMARY, fontSize: 10, fontWeight: "800" },
  removeBill: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 2 },
  removeBillText: { color: MUTED, fontSize: 10 },
  formError: { marginTop: 5, flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#fff1f2", borderRadius: 11, paddingHorizontal: 11, paddingVertical: 10 },
  formErrorText: { flex: 1, color: "#be123c", fontSize: 11, lineHeight: 16 },
  modalButtons: { flexDirection: "row", gap: 8, marginTop: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: BORDER },
  cancelButton: { flex: 0.8, minHeight: 43, borderRadius: 22, borderWidth: 1, borderColor: BORDER, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingHorizontal: 12 },
  cancelText: { color: TEXT, fontSize: 11, fontWeight: "800" },
  saveButton: { flex: 1.2, minHeight: 43, borderRadius: 22, backgroundColor: PRIMARY, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, paddingHorizontal: 12 },
  saveButtonText: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
  disabledButton: { opacity: 0.6 },
  detailPanel: { borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 15, backgroundColor: BACKGROUND, gap: 7 },
  detailLabel: { color: MUTED, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  detailDescription: { color: TEXT, fontSize: 15, fontWeight: "800", lineHeight: 21 },
  detailDate: { color: MUTED, fontSize: 11 },
  detailDivider: { height: 1, backgroundColor: BORDER, marginVertical: 5 },
  detailAmount: { color: PRIMARY, fontSize: 24, fontWeight: "800", marginBottom: 5 },
  detailFile: { color: TEXT, fontSize: 11, fontWeight: "600", marginBottom: 5 },
  openBillButton: { minHeight: 44, borderRadius: 14, backgroundColor: "#fff1f2", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, borderWidth: 1, borderColor: "#ffe4e6", marginTop: 5 },
  openBillText: { color: "#9f1239", fontSize: 12, fontWeight: "800" },
});
