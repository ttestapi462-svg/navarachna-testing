import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  CreditCard,
  FileText,
  MapPin,
  Pencil,
  Phone,
  Ruler,
  ShoppingBag,
  Trash2,
  UserCheck,
} from "lucide-react-native";

import { AtelierHeader } from "../layout/atelier-header";
import { WhatsAppIcon } from "../brand/whatsapp-icon";
import { getTabBarContentPadding } from "../../constants/layout";
import {
  fetchCustomerMeasurementsApi,
  fetchCustomerPaymentsApi,
  fetchCustomerSummaryApi,
  type Customer,
  type CustomerMeasurement,
  type CustomerPayment,
  type CustomerSummary,
} from "../../lib/customer-api";

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

export interface CustomerDetailViewProps {
  customer: Customer;
  onBack: () => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onCustomerUpdated?: (updatedCustomer: Customer) => void;
}

export function CustomerDetailView({
  customer,
  onBack,
  onEdit,
  onDelete,
  onCustomerUpdated,
}: CustomerDetailViewProps) {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<
    "orders" | "measurements" | "payments" | "details"
  >("orders");

  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [measurements, setMeasurements] = useState<CustomerMeasurement[]>([]);
  const [measurementsLoading, setMeasurementsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Handle Hardware Back Button (Android) ───────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onBack();
        return true;
      }
    );
    return () => backHandler.remove();
  }, [onBack]);

  // ─── Fetch Associated Data ───────────────────────────────────
  const loadCustomerData = useCallback(async () => {
    try {
      const [sumRes, payRes, measRes] = await Promise.allSettled([
        fetchCustomerSummaryApi(customer.id),
        fetchCustomerPaymentsApi(customer.id),
        fetchCustomerMeasurementsApi(customer.id),
      ]);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value);
      else setSummary(null);

      if (payRes.status === "fulfilled") setPayments(payRes.value);
      else setPayments([]);

      if (measRes.status === "fulfilled") setMeasurements(measRes.value);
      else setMeasurements([]);
    } catch {
      // Handled silently
    } finally {
      setSummaryLoading(false);
      setPaymentsLoading(false);
      setMeasurementsLoading(false);
      setRefreshing(false);
    }
  }, [customer.id]);

  useEffect(() => {
    setSummaryLoading(true);
    setPaymentsLoading(true);
    setMeasurementsLoading(true);
    loadCustomerData();
  }, [loadCustomerData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCustomerData();
  }, [loadCustomerData]);

  // ─── Contact Actions ─────────────────────────────────────────
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

  const fullAddress = [customer.address, customer.area, customer.city]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.container}>
      {/* 1. SEPARATE SCREEN TOP APP BAR: Client Name + Phone Number Subtitle */}
      <AtelierHeader
        align="left"
        title={customer.name}
        subtitle={
          customer.mobileNumber ? (
            <View style={styles.headerPhoneRow}>
              <Phone size={12} color={PRIMARY} />
              <Text style={styles.headerPhoneText}>
                {customer.mobileNumber}
              </Text>
              <View
                style={[
                  styles.statusDotHeader,
                  customer.isActive
                    ? styles.statusDotActive
                    : styles.statusDotInactive,
                ]}
              />
            </View>
          ) : undefined
        }
        showBack={true}
        onBack={onBack}
        backgroundColor="#FAF7F2"
        brandTitleStyle={styles.headerTitleText}
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => onEdit(customer)}
              activeOpacity={0.7}
              accessibilityLabel="Edit client profile"
            >
              <Pencil size={15} color={PRIMARY} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerActionButton, styles.headerDeleteButton]}
              onPress={() => onDelete(customer)}
              activeOpacity={0.7}
              accessibilityLabel="Delete client profile"
            >
              <Trash2 size={15} color={DANGER} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* 2. STICKY TOP ACTIONS: QUICK CONTACT (CALL & WHATSAPP) */}
      <View style={styles.contactActionsRow}>
        <TouchableOpacity
          style={styles.actionCallBtn}
          onPress={() => handleCall(customer.mobileNumber)}
          activeOpacity={0.7}
          accessibilityLabel="Call client"
        >
          <Phone size={12.5} color={PRIMARY} />
          <Text style={styles.actionCallBtnText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionWhatsAppBtn}
          onPress={() =>
            handleWhatsApp(customer.whatsappNumber || customer.mobileNumber)
          }
          activeOpacity={0.7}
          accessibilityLabel="WhatsApp client"
        >
          <WhatsAppIcon size={13.5} color={SUCCESS} />
          <Text style={styles.actionWhatsAppBtnText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>

      {/* 3. STICKY PROFILE TABS BAR (Orders, Measurements, Payments, Details) */}
      <View style={styles.tabsHeaderContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsHeaderScroll}
        >
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "orders" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("orders")}
            activeOpacity={0.7}
          >
            <ShoppingBag
              size={14}
              color={activeTab === "orders" ? PRIMARY : TEXT_MUTED}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "orders" && styles.tabButtonTextActive,
              ]}
            >
              Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "measurements" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("measurements")}
            activeOpacity={0.7}
          >
            <Ruler
              size={14}
              color={activeTab === "measurements" ? PRIMARY : TEXT_MUTED}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "measurements" && styles.tabButtonTextActive,
              ]}
            >
              Measurements
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "payments" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("payments")}
            activeOpacity={0.7}
          >
            <CreditCard
              size={14}
              color={activeTab === "payments" ? PRIMARY : TEXT_MUTED}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "payments" && styles.tabButtonTextActive,
              ]}
            >
              Payments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "details" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("details")}
            activeOpacity={0.7}
          >
            <UserCheck
              size={14}
              color={activeTab === "details" ? PRIMARY : TEXT_MUTED}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "details" && styles.tabButtonTextActive,
              ]}
            >
              Details
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 4. INNER SCROLL FOR ACTIVE TAB CONTENT */}
      <ScrollView
        style={styles.tabContentScrollView}
        contentContainerStyle={[
          styles.tabContentScrollContainer,
          { paddingBottom: getTabBarContentPadding(insets.bottom) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
      >
        <View style={styles.tabContentBox}>
            {/* ORDERS TAB */}
            {activeTab === "orders" && (
              <View style={styles.emptyTabCard}>
                <View style={styles.emptyIconCircle}>
                  <ShoppingBag size={30} color={PRIMARY} />
                </View>
                <Text style={styles.emptyTabTitle}>No active orders placed</Text>
                <Text style={styles.emptyTabDesc}>
                  Bespoke bridal lehengas, couture ensembles, blouses, and silk kurtis
                  created for {customer.name} will be tracked here with live atelier stages.
                </Text>
              </View>
            )}

            {/* MEASUREMENTS TAB */}
            {activeTab === "measurements" && (
              measurementsLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={styles.loadingText}>Fetching custom measurements...</Text>
                </View>
              ) : measurements.length > 0 ? (
                <View style={styles.itemsList}>
                  {measurements.map((m) => (
                    <View key={m.id} style={styles.measurementCard}>
                      <View style={styles.measurementHeader}>
                        <View style={styles.dressTypeRow}>
                          <Ruler size={14} color={PRIMARY} />
                          <Text style={styles.dressTypeName}>
                            {m.dressTypeName || "Couture Garment"}
                          </Text>
                        </View>
                        {m.presetSize ? (
                          <View style={styles.presetBadge}>
                            <Text style={styles.presetBadgeText}>
                              {m.presetSize}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {m.specialInstructions ? (
                        <Text style={styles.specialInstructions}>
                          {m.specialInstructions}
                        </Text>
                      ) : null}

                      <View style={styles.measurementFooter}>
                        <Calendar size={11} color={TEXT_MUTED} />
                        <Text style={styles.measurementDate}>
                          Recorded: {displayDate(m.createdAt)}
                        </Text>
                        {m.orderNumber ? (
                          <>
                            <Text style={styles.metaDot}>•</Text>
                            <Text style={styles.measurementDate}>
                              Order #{m.orderNumber}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyTabCard}>
                  <View style={styles.emptyIconCircle}>
                    <Ruler size={30} color={PRIMARY} />
                  </View>
                  <Text style={styles.emptyTabTitle}>
                    No custom measurements on record
                  </Text>
                  <Text style={styles.emptyTabDesc}>
                    Tailored measurements recorded for blouses, gowns, and kurtis
                    will be safely stored here for fast reuse on future bespoke orders.
                  </Text>
                </View>
              )
            )}

            {/* PAYMENTS TAB */}
            {activeTab === "payments" && (
              paymentsLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                  <Text style={styles.loadingText}>Loading payment transactions...</Text>
                </View>
              ) : payments.length > 0 ? (
                <View style={styles.itemsList}>
                  {payments.map((p) => (
                    <View key={p.id} style={styles.paymentCard}>
                      <View style={styles.paymentHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.paymentOrderNum}>
                            Order #{p.orderNumber || p.orderId}
                          </Text>
                          <Text style={styles.paymentMeta}>
                            {displayDate(p.paymentDate)} • {p.paymentMethod}
                          </Text>
                        </View>
                        <Text style={styles.paymentAmountText}>
                          {money(p.amount)}
                        </Text>
                      </View>
                      {p.referenceNumber ? (
                        <Text style={styles.paymentRefText}>
                          Ref / Txn ID: {p.referenceNumber}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyTabCard}>
                  <View style={styles.emptyIconCircle}>
                    <CreditCard size={30} color={PRIMARY} />
                  </View>
                  <Text style={styles.emptyTabTitle}>No payment receipts logged</Text>
                  <Text style={styles.emptyTabDesc}>
                    Advances, part-payments, and final settlements made against orders
                    will automatically sync here with invoice references.
                  </Text>
                </View>
              )
            )}

            {/* DETAILS TAB (TABULATED DATA VIEW - NO BOX BORDERS) */}
            {activeTab === "details" && (
              <View style={styles.tabulatedContainer}>
                {/* SECTION 1: CONTACT SPECIFICATIONS */}
                <View style={styles.tableSection}>
                  <Text style={styles.tableSectionTitle}>CONTACT INFORMATION</Text>

                  {/* Primary Phone */}
                  <View style={styles.tableRow}>
                    <View style={styles.tableKeyCol}>
                      <Phone size={13} color={PRIMARY} />
                      <Text style={styles.tableKeyText}>Primary Phone</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleCall(customer.mobileNumber)}
                      activeOpacity={0.7}
                      style={styles.tableValueCol}
                    >
                      <Text style={[styles.tableValText, styles.tableValLink]}>
                        {customer.mobileNumber}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* WhatsApp */}
                  <View style={styles.tableRow}>
                    <View style={styles.tableKeyCol}>
                      <WhatsAppIcon size={13} color={SUCCESS} />
                      <Text style={styles.tableKeyText}>WhatsApp Contact</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        handleWhatsApp(
                          customer.whatsappNumber || customer.mobileNumber
                        )
                      }
                      activeOpacity={0.7}
                      style={styles.tableValueCol}
                    >
                      <Text style={[styles.tableValText, styles.tableValSuccess]}>
                        {customer.whatsappNumber || customer.mobileNumber}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Alternate Phone */}
                  {customer.alternateMobile ? (
                    <View style={styles.tableRow}>
                      <View style={styles.tableKeyCol}>
                        <Phone size={13} color={TEXT_MUTED} />
                        <Text style={styles.tableKeyText}>Alternate Phone</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleCall(customer.alternateMobile)}
                        activeOpacity={0.7}
                        style={styles.tableValueCol}
                      >
                        <Text style={[styles.tableValText, styles.tableValLink]}>
                          {customer.alternateMobile}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                {/* SECTION 2: ATELIER ADDRESS */}
                {fullAddress ? (
                  <View style={styles.tableSection}>
                    <Text style={styles.tableSectionTitle}>ATELIER ADDRESS</Text>
                    <View style={[styles.tableRow, styles.tableRowTop]}>
                      <View style={[styles.tableKeyCol, styles.tableKeyColTop]}>
                        <MapPin size={13} color={PRIMARY} />
                        <Text style={styles.tableKeyText}>Fitting & Delivery</Text>
                      </View>
                      <View style={styles.tableValueCol}>
                        <Text style={styles.tableValTextMulti}>
                          {fullAddress}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* SECTION 3: BESPOKE PREFERENCES */}
                {customer.remarks ? (
                  <View style={styles.tableSection}>
                    <Text style={styles.tableSectionTitle}>COUTURE PREFERENCES</Text>
                    <View style={[styles.tableRow, styles.tableRowTop]}>
                      <View style={[styles.tableKeyCol, styles.tableKeyColTop]}>
                        <FileText size={13} color={AMBER_ACCENT} />
                        <Text style={styles.tableKeyText}>Notes & Specs</Text>
                      </View>
                      <View style={styles.tableValueCol}>
                        <Text style={styles.tableValNotes}>
                          {customer.remarks}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* SECTION 4: AUDIT RECORD */}
                <View style={styles.tableSection}>
                  <Text style={styles.tableSectionTitle}>ACCOUNT RECORD</Text>
                  
                  <View style={styles.tableRow}>
                    <View style={styles.tableKeyCol}>
                      <UserCheck size={13} color={customer.isActive ? SUCCESS : DANGER} />
                      <Text style={styles.tableKeyText}>Account Status</Text>
                    </View>
                    <View style={styles.tableValueCol}>
                      <Text
                        style={[
                          styles.tableValText,
                          customer.isActive
                            ? styles.tableValSuccess
                            : styles.tableValDanger,
                        ]}
                      >
                        {customer.isActive ? "Active Client" : "Inactive"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tableRow}>
                    <View style={styles.tableKeyCol}>
                      <Calendar size={13} color={TEXT_MUTED} />
                      <Text style={styles.tableKeyText}>Enrolled Date</Text>
                    </View>
                    <View style={styles.tableValueCol}>
                      <Text style={styles.tableValMuted}>
                        {displayDate(customer.createdAt)}
                        {customer.createdByUsername ? ` by ${customer.createdByUsername}` : ""}
                      </Text>
                    </View>
                  </View>

                  {customer.updatedByUsername ? (
                    <View style={styles.tableRow}>
                      <View style={styles.tableKeyCol}>
                        <Pencil size={12} color={TEXT_MUTED} />
                        <Text style={styles.tableKeyText}>Last Modified</Text>
                      </View>
                      <View style={styles.tableValueCol}>
                        <Text style={styles.tableValMuted}>
                          {customer.updatedByUsername}
                          {customer.updatedAt ? ` (${displayDate(customer.updatedAt)})` : ""}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

// ─── Stylesheet ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  tabContentScrollView: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  tabContentScrollContainer: {
    flexGrow: 1,
    backgroundColor: SURFACE,
  },

  // Header Title & Actions
  headerTitleText: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    color: PRIMARY,
    letterSpacing: -0.3,
  },
  headerPhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  headerPhoneText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A4543",
    letterSpacing: 0.3,
  },
  statusDotHeader: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerDeleteButton: {
    borderColor: "#FECACA",
    backgroundColor: "#FFF5F5",
  },

  // Quick Contact Actions Bar (Simple, Neat & Compact - Sticky Header)
  contactActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: BACKGROUND,
  },
  actionCallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "#EAD5D7",
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  actionCallBtnText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: "600",
  },
  actionWhatsAppBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: "#C3ECD4",
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  actionWhatsAppBtnText: {
    color: SUCCESS,
    fontSize: 12,
    fontWeight: "600",
  },
  statusDotActive: {
    backgroundColor: SUCCESS,
  },
  statusDotInactive: {
    backgroundColor: DANGER,
  },
  metaDot: {
    fontSize: 12,
    color: "#CBD5E1",
    marginHorizontal: 3,
  },

  // Tabs Header Navigation (Sticky)
  tabsHeaderContainer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  tabsHeaderScroll: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabButtonActive: {
    borderBottomColor: PRIMARY,
    backgroundColor: SURFACE,
  },
  tabButtonText: {
    fontSize: 12.5,
    fontWeight: "500",
    color: TEXT_MUTED,
  },
  tabButtonTextActive: {
    color: PRIMARY,
    fontWeight: "700",
  },

  // Details Tab Styles (Tabulated Key-Value View - No Box Borders)
  tabulatedContainer: {
    paddingVertical: 2,
    gap: 16,
  },
  tableSection: {
    gap: 0,
  },
  tableSectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8C827A",
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingHorizontal: 2,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#F3EFEA",
    gap: 12,
  },
  tableRowTop: {
    alignItems: "flex-start",
  },
  tableKeyCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 140,
  },
  tableKeyColTop: {
    paddingTop: 1,
  },
  tableKeyText: {
    fontSize: 12.5,
    fontWeight: "500",
    color: TEXT_MUTED,
  },
  tableValueCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  tableValText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT,
    textAlign: "right",
  },
  tableValLink: {
    color: PRIMARY,
    fontWeight: "700",
  },
  tableValSuccess: {
    color: SUCCESS,
    fontWeight: "700",
  },
  tableValDanger: {
    color: DANGER,
    fontWeight: "700",
  },
  tableValTextMulti: {
    fontSize: 12.5,
    fontWeight: "600",
    color: TEXT,
    textAlign: "right",
    lineHeight: 18,
  },
  tableValNotes: {
    fontSize: 12.5,
    color: "#78350F",
    fontWeight: "500",
    textAlign: "right",
    lineHeight: 18,
  },
  tableValMuted: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: "right",
  },

  tabContentBox: {
    flex: 1,
    backgroundColor: SURFACE,
    padding: 16,
  },
  loadingBox: {
    flex: 1,
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  emptyTabCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
    minHeight: 340,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PRIMARY_MUTED,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTabTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyTabDesc: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },

  itemsList: {
    gap: 10,
  },
  measurementCard: {
    backgroundColor: "#FAF7F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAE5DC",
    padding: 12,
  },
  measurementHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dressTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dressTypeName: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
  },
  presetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: PRIMARY_MUTED,
    borderWidth: 1,
    borderColor: "#F5D0D3",
  },
  presetBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY,
  },
  specialInstructions: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 16,
    marginBottom: 6,
  },
  measurementFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  measurementDate: {
    fontSize: 11,
    color: TEXT_MUTED,
  },

  paymentCard: {
    backgroundColor: "#FAF7F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAE5DC",
    padding: 12,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  paymentOrderNum: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 2,
  },
  paymentMeta: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  paymentAmountText: {
    fontSize: 14,
    fontWeight: "800",
    color: SUCCESS,
  },
  paymentRefText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 6,
  },
});
