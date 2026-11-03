import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
  Building,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CreditCard,
  Eye,
  FileText,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Ruler,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  UserRoundPlus,
  Users,
  UserX,
  X,
} from "lucide-react-native";

import { getTabBarContentPadding } from "../constants/layout";
import { AtelierHeader } from "../components/layout/atelier-header";
import { CustomerDetailView } from "../components/customers/customer-detail-view";
import { WhatsAppIcon } from "../components/brand/whatsapp-icon";
import { Card } from "../components/ui/card";
import { notifyMobile } from "../lib/notifications";
import {
  createCustomerApi,
  deleteCustomerApi,
  fetchCustomerMeasurementsApi,
  fetchCustomerPaymentsApi,
  fetchCustomersApi,
  fetchCustomerSummaryApi,
  updateCustomerApi,
  type Customer,
  type CustomerCreateDto,
  type CustomerMeasurement,
  type CustomerPayment,
  type CustomerSummary,
} from "../lib/customer-api";

// ─── Atelier Theme Constants ─────────────────────────────────
const PRIMARY = "#78070D";
const PRIMARY_MUTED = "#FBF2F3";
const BACKGROUND = "#FAF7F2";
const SURFACE = "#FFFFFF";
const BORDER = "#E8E2D8";
const TEXT = "#231E1C";
const TEXT_MUTED = "#6E6862";
const SUCCESS = "#059669";
const SUCCESS_BG = "#DCFCE7";
const SUCCESS_BORDER = "#86EFAC";
const DANGER = "#DC2626";
const DANGER_BG = "#FEE2E2";
const BLUE_ACCENT = "#2563EB";
const BLUE_BG = "#EFF6FF";
const AMBER_ACCENT = "#D97706";
const AMBER_BG = "#FEF3C7";

const MAX_REMARKS_CHARS = 250;

function displayDate(value?: string | null): string {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function money(value: number | string): string {
  const amount = Number(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "C"
  );
}

type FilterStatus = "all" | "active" | "inactive";

interface CustomerFormState {
  name: string;
  mobileNumber: string;
  whatsappNumber: string;
  alternateMobile: string;
  address: string;
  area: string;
  city: string;
  remarks: string;
  isActive: boolean;
}

const INITIAL_FORM_VALUES: CustomerFormState = {
  name: "",
  mobileNumber: "",
  whatsappNumber: "",
  alternateMobile: "",
  address: "",
  area: "",
  city: "",
  remarks: "",
  isActive: true,
};

export default function CustomerManagementScreen() {
  const insets = useSafeAreaInsets();

  // ─── Customer Directory State ─────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Search & Filters ─────────────────────────────────────
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Customer Directory & Separate Detail View State ──────
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null);

  const params = useLocalSearchParams<{ resetNav?: string }>();

  // Always navigate to and display the Customer List whenever navigating via menu
  const resetToList = useCallback(() => {
    setViewMode("list");
    setProfileCustomer(null);
    setFormVisible(false);
    setCustomerToDelete(null);
  }, []);

  useEffect(() => {
    if (params?.resetNav) {
      resetToList();
    }
  }, [params?.resetNav, resetToList]);

  useFocusEffect(
    useCallback(() => {
      resetToList();
    }, [resetToList])
  );

  // ─── Add / Edit Customer Form State ───────────────────────
  const [formVisible, setFormVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formValues, setFormValues] = useState<CustomerFormState>(INITIAL_FORM_VALUES);
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formErrorNotice, setFormErrorNotice] = useState("");

  // ─── Delete Customer Modal State ──────────────────────────
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch Customers List ─────────────────────────────────
  const loadCustomers = useCallback(
    async (pageToLoad: number, isInitial = false, resetSearchQuery?: string) => {
      try {
        if (isInitial) setPageLoading(true);

        const currentSearch = resetSearchQuery !== undefined ? resetSearchQuery : searchQuery;
        const isActiveParam =
          statusFilter === "all" ? undefined : statusFilter === "active";

        const res = await fetchCustomersApi({
          search: currentSearch,
          isActive: isActiveParam,
          page: pageToLoad,
          pageSize: 15,
        });

        const items = res.data || res.items || [];
        setTotalCount(res.totalCount || items.length);
        setPage(pageToLoad);

        if (pageToLoad === 1) {
          setCustomers(items);
        } else {
          setCustomers((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newItems = items.filter((c) => !existingIds.has(c.id));
            return [...prev, ...newItems];
          });
        }
      } catch (error: any) {
        console.error("Failed to load customers:", error);
      } finally {
        setPageLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [searchQuery, statusFilter]
  );

  // Trigger initial fetch and reload on filter/search change
  useEffect(() => {
    loadCustomers(1, true);
  }, [loadCustomers]);

  // Handle Search Input with 350ms debounce
  const handleSearchChange = (text: string) => {
    setSearchDraft(text);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(text);
    }, 350);
  };

  const clearSearch = () => {
    setSearchDraft("");
    setSearchQuery("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCustomers(1, false);
  }, [loadCustomers]);

  const loadMore = () => {
    if (pageLoading || loadingMore || customers.length >= totalCount || totalCount === 0) {
      return;
    }
    setLoadingMore(true);
    loadCustomers(page + 1, false);
  };

  // ─── Contact Actions ──────────────────────────────────────
  const handleCall = async (phone?: string | null) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9+]/g, "");
    if (!clean) return;
    const telUrl = `tel:${clean}`;
    try {
      await Linking.openURL(telUrl);
    } catch (err) {
      console.error("Failed to open dialer directly:", err);
      try {
        const supported = await Linking.canOpenURL(telUrl);
        if (supported) {
          await Linking.openURL(telUrl);
        } else {
          Alert.alert("Unable to Call", `No dialer application found for ${clean}`);
        }
      } catch {
        Alert.alert("Unable to Call", `Could not open phone dialer for ${clean}`);
      }
    }
  };

  const handleWhatsApp = async (phone?: string | null) => {
    if (!phone) return;
    const digits = phone.replace(/[^0-9]/g, "");
    const waNumber = digits.length === 10 ? `91${digits}` : digits;
    if (!waNumber) return;
    const waUrl = `https://wa.me/${waNumber}`;
    try {
      await Linking.openURL(waUrl);
    } catch (err) {
      console.error("Failed to open WhatsApp:", err);
      Alert.alert("Unable to Open WhatsApp", `Could not launch chat for ${waNumber}`);
    }
  };

  // ─── Open Separate Customer Detail View ────────────────────
  const openCustomerProfile = (customer: Customer) => {
    setProfileCustomer(customer);
    setViewMode("detail");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setProfileCustomer(null);
  };

  // ─── Add / Edit Customer Form Handlers ────────────────────
  const openAddCustomer = () => {
    setEditingCustomer(null);
    setFormValues(INITIAL_FORM_VALUES);
    setSameAsMobile(true);
    setFieldErrors({});
    setFormErrorNotice("");
    setFormVisible(true);
  };

  const openEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    const isSame =
      !customer.whatsappNumber ||
      customer.whatsappNumber === customer.mobileNumber;
    setFormValues({
      name: customer.name || "",
      mobileNumber: customer.mobileNumber || "",
      whatsappNumber: customer.whatsappNumber || customer.mobileNumber || "",
      alternateMobile: customer.alternateMobile || "",
      address: customer.address || "",
      area: customer.area || "",
      city: customer.city || "",
      remarks: customer.remarks || "",
      isActive: customer.isActive ?? true,
    });
    setSameAsMobile(isSame);
    setFieldErrors({});
    setFormErrorNotice("");
    setFormVisible(true);
  };

  const handleFormMobileChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10);
    setFormValues((prev) => ({
      ...prev,
      mobileNumber: cleaned,
      whatsappNumber: sameAsMobile ? cleaned : prev.whatsappNumber,
    }));
    if (fieldErrors.mobileNumber) {
      setFieldErrors((prev) => ({ ...prev, mobileNumber: "" }));
    }
  };

  const handleFormWhatsAppChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10);
    setFormValues((prev) => ({ ...prev, whatsappNumber: cleaned }));
    if (fieldErrors.whatsappNumber) {
      setFieldErrors((prev) => ({ ...prev, whatsappNumber: "" }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formValues.name.trim()) {
      errors.name = "Customer name is required";
    } else if (formValues.name.trim().length < 2) {
      errors.name = "Customer name must be at least 2 characters";
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!formValues.mobileNumber.trim()) {
      errors.mobileNumber = "Mobile number is required";
    } else if (!mobileRegex.test(formValues.mobileNumber.trim())) {
      errors.mobileNumber = "Enter a valid 10-digit number (e.g. 9876543210)";
    }

    if (!formValues.whatsappNumber.trim()) {
      errors.whatsappNumber = "WhatsApp number is required";
    } else if (!mobileRegex.test(formValues.whatsappNumber.trim())) {
      errors.whatsappNumber = "Enter a valid 10-digit number (e.g. 9876543210)";
    }

    if (formValues.remarks && formValues.remarks.length > MAX_REMARKS_CHARS) {
      errors.remarks = `Remarks cannot exceed ${MAX_REMARKS_CHARS} characters`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCustomer = async () => {
    if (!validateForm()) {
      notifyMobile("validation", "Please check the highlighted fields.");
      return;
    }

    setSaving(true);
    setFormErrorNotice("");

    const payload: CustomerCreateDto = {
      name: formValues.name.trim(),
      mobileNumber: formValues.mobileNumber.trim(),
      whatsappNumber: formValues.whatsappNumber.trim(),
      alternateMobile: formValues.alternateMobile?.trim() || null,
      address: formValues.address?.trim() || null,
      area: formValues.area?.trim() || null,
      city: formValues.city?.trim() || null,
      remarks: formValues.remarks?.trim() || null,
      isActive: formValues.isActive,
    };

    try {
      if (editingCustomer) {
        await updateCustomerApi(editingCustomer.id, payload);
        notifyMobile("success", `Updated ${payload.name}'s profile.`);
      } else {
        await createCustomerApi(payload);
        notifyMobile("success", `Registered ${payload.name} successfully.`);
      }

      setFormVisible(false);
      loadCustomers(1, false);

      // If profile was open for the customer being edited, update it
      if (editingCustomer && profileCustomer?.id === editingCustomer.id) {
        setProfileCustomer((prev) => (prev ? { ...prev, ...payload } : null));
      }
    } catch (error: any) {
      const msg = error?.message || "Failed to save customer. Please try again.";
      setFormErrorNotice(msg);
      notifyMobile("error", msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Customer Handlers ─────────────────────────────
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setDeleting(true);

    try {
      await deleteCustomerApi(customerToDelete.id);
      notifyMobile("success", `Deleted ${customerToDelete.name}'s profile.`);
      setCustomerToDelete(null);

      // If profile is open for deleted customer, return to list view
      if (profileCustomer?.id === customerToDelete.id) {
        setViewMode("list");
        setProfileCustomer(null);
      }

      loadCustomers(1, false);
    } catch (error: any) {
      const msg = error?.message || "Could not delete customer.";
      notifyMobile("error", msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      {viewMode === "detail" && profileCustomer ? (
        <CustomerDetailView
          customer={profileCustomer}
          onBack={handleBackToList}
          onEdit={(cust) => openEditCustomer(cust)}
          onDelete={(cust) => setCustomerToDelete(cust)}
          onCustomerUpdated={(updated) => {
            setProfileCustomer(updated);
            setCustomers((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
          }}
        />
      ) : (
        <>
          {/* 1. TOP APP BAR: "Customer" + Users Icon + Add (+) button */}
      <AtelierHeader
        title="Customer"
        showProfile={false}
        backgroundColor="#FAF7F2"
        icon={<Users size={24} color={PRIMARY} strokeWidth={2.4} />}
        rightAction={
          <TouchableOpacity
            style={styles.headerAddButton}
            onPress={openAddCustomer}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add customer"
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2.6} />
          </TouchableOpacity>
        }
      />

      {/* 2. FIXED TOP SECTION: Search Bar + Status Filter Chips */}
      <View style={styles.fixedTopSection}>
        {/* Search Input Row */}
        <View style={styles.toolbarRow}>
          <View style={styles.searchBox}>
            <Search size={16} color="#9AA3B5" />
            <TextInput
              style={styles.searchInput}
              value={searchDraft}
              onChangeText={handleSearchChange}
              placeholder="Search by name, phone or city..."
              placeholderTextColor="#9AA3B5"
              returnKeyType="search"
              blurOnSubmit
              accessibilityLabel="Search customers"
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

        {/* Status Filter Chips */}
        <View style={styles.filterChipRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              statusFilter === "all" && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter("all")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === "all" && styles.filterChipTextActiveAll,
              ]}
            >
              All Clients ({totalCount || customers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              statusFilter === "active" && styles.filterChipActiveSuccess,
            ]}
            onPress={() => setStatusFilter("active")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.activeDot,
                statusFilter === "active" && styles.activeDotSelected,
              ]}
            />
            <Text
              style={[
                styles.filterChipText,
                statusFilter === "active" && styles.filterChipTextActiveSuccess,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              statusFilter === "inactive" && styles.filterChipActiveDanger,
            ]}
            onPress={() => setStatusFilter("inactive")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.inactiveDot,
                statusFilter === "inactive" && styles.inactiveDotSelected,
              ]}
            />
            <Text
              style={[
                styles.filterChipText,
                statusFilter === "inactive" && styles.filterChipTextActiveDanger,
              ]}
            >
              Inactive
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. CUSTOMER FLAT LIST */}
      <View style={styles.listContainer}>
        <FlatList
          data={pageLoading ? [] : customers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: getTabBarContentPadding(insets.bottom) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item: customer }) => (
            <View style={styles.customerCard}>
              {/* Left Column: Client Name + Status Dot, and Phone Number (Tappable for Profile) */}
              <TouchableOpacity
                style={styles.customerInfoCol}
                activeOpacity={0.7}
                onPress={() => openCustomerProfile(customer)}
                accessibilityRole="button"
                accessibilityLabel={`View profile for ${customer.name}`}
              >
                <View style={styles.nameRow}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {customer.name}
                  </Text>
                  <View
                    style={[
                      styles.statusDot,
                      customer.isActive
                        ? styles.statusDotActive
                        : styles.statusDotInactive,
                    ]}
                    accessibilityLabel={
                      customer.isActive ? "Active client" : "Inactive client"
                    }
                  />
                </View>

                <View style={styles.phoneRow}>
                  <Phone size={11} color="#8C827A" />
                  <Text style={styles.phoneText}>{customer.mobileNumber}</Text>
                </View>
              </TouchableOpacity>

              {/* Right: Quick Action Icon Buttons (Call & WhatsApp) + Navigation Chevron */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionCallBtn}
                  onPress={() => handleCall(customer.mobileNumber)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${customer.name}`}
                >
                  <Phone size={13} color={PRIMARY} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionWhatsAppBtn}
                  onPress={() =>
                    handleWhatsApp(
                      customer.whatsappNumber || customer.mobileNumber
                    )
                  }
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`WhatsApp ${customer.name}`}
                >
                  <WhatsAppIcon size={14} color="#16A34A" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.chevronBtn}
                  onPress={() => openCustomerProfile(customer)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`View profile for ${customer.name}`}
                >
                  <ChevronRight size={16} color="#B8B2A8" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListHeaderComponent={
            pageLoading ? (
              <View style={styles.skeletonContainer}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <View key={`skel-${i}`} style={styles.skeletonCard} />
                ))}
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            !pageLoading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Users size={24} color={PRIMARY} strokeWidth={2.2} />
                </View>
                <Text style={styles.emptyTitle}>No clients found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search query or client status filter."
                    : "Register your first atelier client to start managing couture profiles."}
                </Text>
                {searchQuery || statusFilter !== "all" ? (
                  <TouchableOpacity
                    style={styles.emptyResetButton}
                    onPress={() => {
                      clearSearch();
                      setStatusFilter("all");
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emptyResetButtonText}>Reset filters</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : undefined
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreRow}>
                <ActivityIndicator size="small" color={PRIMARY} />
                <Text style={styles.loadMoreText}>Loading more clients...</Text>
              </View>
            ) : undefined
          }
        />
      </View>

        </>
      )}

      {/* 6. REGISTER / EDIT CUSTOMER FORM MODAL */}
      <Modal
        visible={formVisible}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setFormVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              Keyboard.dismiss();
              setFormVisible(false);
            }}
          />
          <View
            style={[
              styles.formModalCard,
              {
                paddingBottom: Math.max(
                  insets.bottom,
                  Platform.OS === "android" ? 20 : 12
                ),
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandleRow}>
              <View style={styles.sheetHandle} />
            </View>

            {/* Form Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingRow}>
                <View style={styles.modalHeadingIconCircle}>
                  {editingCustomer ? (
                    <Pencil size={18} color={PRIMARY} strokeWidth={2.4} />
                  ) : (
                    <Users size={18} color={PRIMARY} strokeWidth={2.4} />
                  )}
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {editingCustomer ? "Edit Customer Profile" : "Register Customer"}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {editingCustomer
                      ? "Update client details and preferences"
                      : "Add a new atelier client to directory"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFormVisible(false)}
                activeOpacity={0.7}
                accessibilityLabel="Close customer form"
              >
                <X size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>

            {/* Form Error Banner */}
            {formErrorNotice ? (
              <View style={styles.formErrorBanner}>
                <CircleAlert size={14} color={DANGER} />
                <Text style={styles.formErrorBannerText}>{formErrorNotice}</Text>
              </View>
            ) : null}

            {/* Form Inputs Scrollable */}
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Full Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    fieldErrors.name ? styles.inputWrapperError : null,
                  ]}
                >
                  <User size={16} color={fieldErrors.name ? DANGER : PRIMARY} />
                  <TextInput
                    style={styles.textInput}
                    value={formValues.name}
                    onChangeText={(val) => {
                      setFormValues((prev) => ({ ...prev, name: val }));
                      if (fieldErrors.name) {
                        setFieldErrors((prev) => ({ ...prev, name: "" }));
                      }
                    }}
                    placeholder="e.g. Priya Sundaram"
                    placeholderTextColor="#9AA3B5"
                    autoCapitalize="words"
                  />
                </View>
                {fieldErrors.name ? (
                  <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>
                ) : null}
              </View>

              {/* Mobile Number */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Mobile Number <Text style={styles.requiredStar}>*</Text>
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    fieldErrors.mobileNumber ? styles.inputWrapperError : null,
                  ]}
                >
                  <Phone
                    size={16}
                    color={fieldErrors.mobileNumber ? DANGER : PRIMARY}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={formValues.mobileNumber}
                    onChangeText={handleFormMobileChange}
                    placeholder="98765 43210"
                    placeholderTextColor="#9AA3B5"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                {fieldErrors.mobileNumber ? (
                  <Text style={styles.fieldErrorText}>
                    {fieldErrors.mobileNumber}
                  </Text>
                ) : null}
              </View>

              {/* WhatsApp Number with "Same as phone" sync */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>
                    WhatsApp Number <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.sameAsPhoneBtn}
                    onPress={() => {
                      const next = !sameAsMobile;
                      setSameAsMobile(next);
                      if (next) {
                        setFormValues((prev) => ({
                          ...prev,
                          whatsappNumber: prev.mobileNumber,
                        }));
                      }
                    }}
                    activeOpacity={0.8}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: sameAsMobile }}
                    accessibilityLabel="Same as phone number"
                  >
                    <View
                      style={[
                        styles.toggleTrack,
                        sameAsMobile
                          ? styles.toggleTrackActive
                          : styles.toggleTrackInactive,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          sameAsMobile
                            ? styles.toggleThumbActive
                            : styles.toggleThumbInactive,
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.sameAsPhoneText,
                        sameAsMobile && styles.sameAsPhoneTextActive,
                      ]}
                    >
                      Same as phone
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.inputWrapper,
                    fieldErrors.whatsappNumber ? styles.inputWrapperError : null,
                    sameAsMobile && styles.inputWrapperDisabled,
                  ]}
                >
                  <WhatsAppIcon
                    size={16}
                    color={fieldErrors.whatsappNumber ? DANGER : SUCCESS}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={formValues.whatsappNumber}
                    onChangeText={handleFormWhatsAppChange}
                    placeholder="98765 43210"
                    placeholderTextColor="#9AA3B5"
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!sameAsMobile}
                  />
                </View>
                {fieldErrors.whatsappNumber ? (
                  <Text style={styles.fieldErrorText}>
                    {fieldErrors.whatsappNumber}
                  </Text>
                ) : null}
              </View>

              {/* Alternate Phone */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Alternate Phone (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <Phone size={16} color={PRIMARY} />
                  <TextInput
                    style={styles.textInput}
                    value={formValues.alternateMobile}
                    onChangeText={(val) =>
                      setFormValues((prev) => ({
                        ...prev,
                        alternateMobile: val.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                    placeholder="91234 56780"
                    placeholderTextColor="#9AA3B5"
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>

              {/* Innovative Compact Client Status Capsule */}
              <View style={styles.statusCompactCard}>
                <View style={styles.statusLabelGroup}>
                  <View
                    style={[
                      styles.statusIconCircle,
                      formValues.isActive
                        ? styles.statusIconCircleActive
                        : styles.statusIconCircleInactive,
                    ]}
                  >
                    {formValues.isActive ? (
                      <UserCheck size={14} color={SUCCESS} strokeWidth={2.4} />
                    ) : (
                      <UserX size={14} color={DANGER} strokeWidth={2.4} />
                    )}
                  </View>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Text style={styles.statusCardTitle}>Client Status</Text>
                      <Text style={styles.requiredStar}>*</Text>
                    </View>
                    <Text style={styles.statusCardSubtitle}>
                      {formValues.isActive ? "Active atelier client" : "Inactive client profile"}
                    </Text>
                  </View>
                </View>

                {/* Innovative Segmented Capsule Track */}
                <View style={styles.innovativeCapsuleTrack}>
                  <TouchableOpacity
                    style={[
                      styles.capsuleSegment,
                      formValues.isActive && styles.capsuleSegmentActive,
                    ]}
                    onPress={() =>
                      setFormValues((prev) => ({ ...prev, isActive: true }))
                    }
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.capsuleDot,
                        formValues.isActive
                          ? styles.capsuleDotActive
                          : styles.capsuleDotMuted,
                      ]}
                    />
                    <Text
                      style={[
                        styles.capsuleText,
                        formValues.isActive && styles.capsuleTextActive,
                      ]}
                    >
                      Active
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.capsuleSegment,
                      !formValues.isActive && styles.capsuleSegmentInactive,
                    ]}
                    onPress={() =>
                      setFormValues((prev) => ({ ...prev, isActive: false }))
                    }
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.capsuleDot,
                        !formValues.isActive
                          ? styles.capsuleDotInactiveActive
                          : styles.capsuleDotMuted,
                      ]}
                    />
                    <Text
                      style={[
                        styles.capsuleText,
                        !formValues.isActive && styles.capsuleTextInactive,
                      ]}
                    >
                      Inactive
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Address Details: Street, Area, City */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Address & Location</Text>
                <View style={styles.inputWrapper}>
                  <MapPin size={16} color={TEXT_MUTED} />
                  <TextInput
                    style={styles.textInput}
                    value={formValues.address}
                    onChangeText={(val) =>
                      setFormValues((prev) => ({ ...prev, address: val }))
                    }
                    placeholder="Door / Apartment / Street Address"
                    placeholderTextColor="#9AA3B5"
                  />
                </View>

                <View style={styles.dualFieldRow}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.textInputPill}
                      value={formValues.area}
                      onChangeText={(val) =>
                        setFormValues((prev) => ({ ...prev, area: val }))
                      }
                      placeholder="Area (e.g. T. Nagar)"
                      placeholderTextColor="#9AA3B5"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={styles.textInputPill}
                      value={formValues.city}
                      onChangeText={(val) =>
                        setFormValues((prev) => ({ ...prev, city: val }))
                      }
                      placeholder="City (e.g. Chennai)"
                      placeholderTextColor="#9AA3B5"
                    />
                  </View>
                </View>
              </View>

              {/* Remarks / Atelier Notes */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Atelier Notes & Styling</Text>
                  <Text style={styles.characterCounter}>
                    {MAX_REMARKS_CHARS - formValues.remarks.length} left
                  </Text>
                </View>
                <TextInput
                  style={styles.textareaInput}
                  value={formValues.remarks}
                  onChangeText={(val) => {
                    if (val.length <= MAX_REMARKS_CHARS) {
                      setFormValues((prev) => ({ ...prev, remarks: val }));
                    }
                  }}
                  placeholder="Styling preferences, measurements notes, or fabric choices..."
                  placeholderTextColor="#9AA3B5"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Form Footer Action Buttons (Matching Web: Red Outline Cancel & Emerald Green Submit) */}
            <View style={styles.formFooter}>
              <TouchableOpacity
                style={styles.cancelButtonPill}
                onPress={() => setFormVisible(false)}
                disabled={saving}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <X size={14} color={DANGER} strokeWidth={2.4} />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButtonPill, saving && styles.disabledButton]}
                onPress={handleSaveCustomer}
                disabled={saving}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  editingCustomer ? "Save Changes" : "Register Customer"
                }
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    {editingCustomer ? (
                      <Check size={14} color="#FFFFFF" strokeWidth={2.4} />
                    ) : (
                      <UserRoundPlus size={14} color="#FFFFFF" strokeWidth={2.4} />
                    )}
                    <Text style={styles.saveButtonText}>
                      {editingCustomer ? "Save Changes" : "Register Customer"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 7. DELETE CONFIRMATION MODAL */}
      <Modal
        visible={Boolean(customerToDelete)}
        animationType="fade"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setCustomerToDelete(null)}
      >
        <View style={styles.deleteBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCustomerToDelete(null)}
          />
          <View style={styles.deleteCard}>
            <View style={styles.deleteIconCircle}>
              <Trash2 size={20} color={DANGER} strokeWidth={2.2} />
            </View>

            <Text style={styles.deleteTitle}>Delete Customer Profile</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to delete{" "}
              <Text style={{ fontWeight: "700", color: TEXT }}>
                {customerToDelete?.name}
              </Text>
              ? This action cannot be undone and will permanently remove client records.
            </Text>

            <View style={styles.deleteActionsRow}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setCustomerToDelete(null)}
                disabled={deleting}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deleteConfirmButton,
                  deleting && styles.disabledButton,
                ]}
                onPress={handleDeleteCustomer}
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
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

  // Fixed Top Section
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
      web: { outlineStyle: "none" } as any,
    }),
  },

  // Status Filter Chips
  filterChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
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
  filterChipActive: {
    backgroundColor: PRIMARY_MUTED,
    borderColor: "#C69596",
  },
  filterChipActiveSuccess: {
    backgroundColor: SUCCESS_BG,
    borderColor: "#86EFAC",
  },
  filterChipActiveDanger: {
    backgroundColor: DANGER_BG,
    borderColor: "#FECACA",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  filterChipTextActiveAll: {
    color: PRIMARY,
    fontWeight: "700",
  },
  filterChipTextActiveSuccess: {
    color: "#065F46",
    fontWeight: "700",
  },
  filterChipTextActiveDanger: {
    color: DANGER,
    fontWeight: "700",
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: SUCCESS,
  },
  activeDotSelected: {
    backgroundColor: SUCCESS,
  },
  inactiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: DANGER,
  },
  inactiveDotSelected: {
    backgroundColor: DANGER,
  },

  // Customer List
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    gap: 10,
  },
  customerCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  customerInfoCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT,
    flexShrink: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusDotActive: {
    backgroundColor: SUCCESS,
  },
  statusDotInactive: {
    backgroundColor: DANGER,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: "500",
    color: TEXT_MUTED,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_MUTED,
    borderWidth: 1,
    borderColor: "#F5D0D3",
    alignItems: "center",
    justifyContent: "center",
  },
  actionWhatsAppBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SUCCESS_BG,
    borderWidth: 1,
    borderColor: SUCCESS_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronBtn: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  // Skeleton & Empty States
  skeletonContainer: {
    gap: 10,
  },
  skeletonCard: {
    height: 64,
    borderRadius: 16,
    backgroundColor: "#EFEBE4",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 44,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY_MUTED,
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
  emptySubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: TEXT_MUTED,
    textAlign: "center",
    maxWidth: 260,
  },
  emptyResetButton: {
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
  emptyResetButtonText: {
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

  // Modal Common Backdrop & Structure
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
    margin: 0,
    padding: 0,
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
  modalHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  modalHeadingIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PRIMARY_MUTED,
    borderWidth: 1,
    borderColor: "rgba(120, 7, 13, 0.12)",
    alignItems: "center",
    justifyContent: "center",
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
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FAF7F2",
    borderWidth: 1,
    borderColor: "#E8E2D8",
    alignItems: "center",
    justifyContent: "center",
  },

  // ─── Customer Form Modal ──────────────────────────────────
  formModalCard: {
    maxHeight: "92%",
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
  formErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 18,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: DANGER_BG,
  },
  formErrorBannerText: {
    flex: 1,
    fontSize: 12,
    color: DANGER,
    fontWeight: "600",
  },
  formScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: TEXT,
  },
  requiredStar: {
    color: DANGER,
    fontWeight: "800",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DFD9D0",
    backgroundColor: "#FCFAF7",
    paddingHorizontal: 12,
    gap: 9,
  },
  inputWrapperError: {
    borderColor: DANGER,
    backgroundColor: "#FFF5F5",
  },
  inputWrapperDisabled: {
    backgroundColor: "#F5F2EB",
    opacity: 0.85,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    color: TEXT,
    height: 44,
    paddingVertical: 0,
    ...Platform.select({
      web: { outlineStyle: "none" } as any,
    }),
  },
  sameAsPhoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 2,
  },
  toggleTrack: {
    width: 32,
    height: 18,
    borderRadius: 9,
    padding: 2,
    justifyContent: "center",
  },
  toggleTrackActive: {
    backgroundColor: PRIMARY,
  },
  toggleTrackInactive: {
    backgroundColor: "#D8D4CE",
  },
  toggleThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 1.5,
      },
      default: {
        elevation: 1.5,
      },
    }),
  },
  toggleThumbActive: {
    transform: [{ translateX: 14 }],
  },
  toggleThumbInactive: {
    transform: [{ translateX: 0 }],
  },
  sameAsPhoneText: {
    fontSize: 11.5,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  sameAsPhoneTextActive: {
    color: PRIMARY,
    fontWeight: "700",
  },
  fieldErrorText: {
    fontSize: 11,
    color: DANGER,
    fontWeight: "500",
    marginTop: 2,
  },

  // Innovative Compact Client Status Card & Capsule
  statusCompactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAF7F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EAE5DC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  statusLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },
  statusIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconCircleActive: {
    backgroundColor: SUCCESS_BG,
    borderWidth: 1,
    borderColor: SUCCESS_BORDER,
  },
  statusIconCircleInactive: {
    backgroundColor: DANGER_BG,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  statusCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
  },
  statusCardSubtitle: {
    fontSize: 10.5,
    color: TEXT_MUTED,
    marginTop: 0.5,
  },
  innovativeCapsuleTrack: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFEBE4",
    borderRadius: 20,
    padding: 2.5,
    borderWidth: 1,
    borderColor: "#E2DDD5",
  },
  capsuleSegment: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
  },
  capsuleSegmentActive: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#059669",
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.12,
        shadowRadius: 2.5,
      },
      android: { elevation: 2 },
      web: { boxShadow: "0 1px 3px rgba(5,150,105,0.18)" },
    }),
  },
  capsuleSegmentInactive: {
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#DC2626",
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.12,
        shadowRadius: 2.5,
      },
      android: { elevation: 2 },
      web: { boxShadow: "0 1px 3px rgba(220,38,38,0.18)" },
    }),
  },
  capsuleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  capsuleDotActive: {
    backgroundColor: SUCCESS,
  },
  capsuleDotInactiveActive: {
    backgroundColor: DANGER,
  },
  capsuleDotMuted: {
    backgroundColor: "#C4BCB1",
  },
  capsuleText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  capsuleTextActive: {
    color: "#065F46",
    fontWeight: "700",
  },
  capsuleTextInactive: {
    color: DANGER,
    fontWeight: "700",
  },

  // Address & Remarks
  dualFieldRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  textInputPill: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DFD9D0",
    backgroundColor: "#FCFAF7",
    paddingHorizontal: 12,
    fontSize: 13,
    color: TEXT,
    ...Platform.select({
      web: { outlineStyle: "none" } as any,
    }),
  },
  characterCounter: {
    fontSize: 10.5,
    color: TEXT_MUTED,
  },
  textareaInput: {
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DFD9D0",
    backgroundColor: "#FCFAF7",
    padding: 12,
    fontSize: 13,
    color: TEXT,
    ...Platform.select({
      web: { outlineStyle: "none" } as any,
    }),
  },

  // Form Footer with Web-matched Action Buttons (Right-aligned, Red Outline Cancel & Emerald Green Submit)
  formFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#EAE5DC",
    backgroundColor: SURFACE,
  },
  cancelButtonPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1.2,
    borderColor: "rgba(220, 38, 38, 0.55)",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    color: DANGER,
    fontSize: 12.5,
    fontWeight: "600",
  },
  saveButtonPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    backgroundColor: SUCCESS,
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
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },

  // ─── Delete Modal ─────────────────────────────────────────
  deleteBackdrop: {
    flex: 1,
    backgroundColor: "rgba(35, 30, 28, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  deleteCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E2D8",
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
  deleteIconCircle: {
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
  deleteTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  deleteMessage: {
    fontSize: 12.5,
    lineHeight: 18,
    color: TEXT_MUTED,
    textAlign: "center",
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  deleteActionsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  deleteCancelButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E2DDD5",
    backgroundColor: "#FAF7F2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteCancelButtonText: {
    color: "#5C554F",
    fontSize: 13,
    fontWeight: "600",
  },
  deleteConfirmButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: DANGER,
    alignItems: "center",
    justifyContent: "center",
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
  deleteConfirmButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
