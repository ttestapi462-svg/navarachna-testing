import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, Phone, Plus, Search, Users, X } from "lucide-react-native";
import { AtelierHeader } from "../layout/atelier-header";
import { EmployeeDetailView } from "./employee-detail-view";
import { EmployeeFormSheet, EMPLOYEE_DEPARTMENTS } from "./employee-form-sheet";
import { EmployeeConfirmationDialog } from "./employee-confirmation-dialog";
import {
  deleteEmployeeApi,
  deleteEmployeeDocumentApi,
  fetchEmployeesApi,
  getEmployeeDocumentFileName,
  removeEmployeeLoginApi,
  type EmployeeDocument,
  type EmployeeRecord,
} from "../../lib/employee-api";
import { notifyMobile } from "../../lib/notifications";
import { getTabBarContentPadding } from "../../constants/layout";

const PRIMARY = "#78070D";
const PRIMARY_MUTED = "#FBF2F3";
const BACKGROUND = "#FAF7F2";
const SURFACE = "#FFFFFF";
const BORDER = "#E8E2D8";
const TEXT = "#231E1C";
const MUTED = "#6E6862";
const SUCCESS = "#059669";
const PAGE_SIZE = 15;

type EmployeeConfirmation = {
  kind: "delete" | "removeLogin" | "deleteDocument";
  employee: EmployeeRecord;
  document?: EmployeeDocument;
};

function employeeName(employee: EmployeeRecord) {
  return `${employee.firstName} ${employee.lastName || ""}`.trim();
}

function employeeInitials(employee: EmployeeRecord) {
  const first = (employee.firstName || "").trim().charAt(0);
  const last = (employee.lastName || "").trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "?";
}

function departmentTone(department: string) {
  const tones: Record<string, { foreground: string; background: string; border: string }> = {
    "Studio Receptionist": { foreground: "#0369A1", background: "#EFF8FC", border: "#D5EAF5" },
    "Floor Supervisor": { foreground: "#A16207", background: "#FFF8E8", border: "#F1E4BD" },
    "Sourcing Specialist": { foreground: "#6D28D9", background: "#F6F0FD", border: "#E8DDF8" },
    "Cutting Master": { foreground: "#047857", background: "#EFF9F4", border: "#D5EBDD" },
    "Master Tailor": { foreground: "#1D4ED8", background: "#EFF5FD", border: "#D9E6F8" },
    "Finishing Specialist": { foreground: "#BE185D", background: "#FDF1F6", border: "#F3DCE7" },
    "Packaging & Dispatch": { foreground: "#B45309", background: "#FFF6EA", border: "#F1E1CB" },
    "Other Employee": { foreground: "#57534E", background: "#F5F3F0", border: "#E7E2DA" },
  };
  return tones[department] || tones["Other Employee"];
}

function callEmployee(mobile: string) {
  const phoneNumber = mobile.replace(/[^\d+]/g, "");
  if (!phoneNumber) {
    notifyMobile("warning", "No mobile number is available for this employee.");
    return;
  }
  void Linking.openURL(`tel:${phoneNumber}`).catch(() => notifyMobile("error", "Unable to open the phone app."));
}

export default function EmployeeManagementScreen() {
  const insets = useSafeAreaInsets();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [department, setDepartment] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [profileEmployee, setProfileEmployee] = useState<EmployeeRecord | null>(null);
  const [confirmation, setConfirmation] = useState<EmployeeConfirmation | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [listViewportHeight, setListViewportHeight] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const employeeCardHeight = listViewportHeight
    ? Math.max(64, (listViewportHeight - getTabBarContentPadding(insets.bottom) - 2 - 5 * 7) / 6)
    : 80;

  const loadEmployees = useCallback(async (requestedPage: number, initial = false) => {
    try {
      if (initial) setPageLoading(true);
      if (requestedPage === 1) setLoadFailed(false);
      const response = await fetchEmployeesApi({ search, department: department || undefined, page: requestedPage, pageSize: PAGE_SIZE });
      const items = response.items || [];
      setTotalCount(response.totalCount || 0);
      setPage(requestedPage);
      if (requestedPage === 1) setEmployees(items);
      else setEmployees((current) => {
        const ids = new Set(current.map((employee) => employee.id));
        return [...current, ...items.filter((employee) => !ids.has(employee.id))];
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load the employee directory.";
      if (requestedPage === 1) setLoadFailed(true);
      notifyMobile("error", message, "Employee directory");
    } finally {
      setPageLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [department, search]);

  useFocusEffect(useCallback(() => { void loadEmployees(1, true); }, [loadEmployees]));
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const onSearchChange = (text: string) => {
    setSearchDraft(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(text), 350);
  };

  const clearSearch = () => {
    setSearchDraft("");
    setSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const refresh = () => {
    setRefreshing(true);
    void loadEmployees(1, false);
  };

  const loadMore = () => {
    if (pageLoading || loadingMore || employees.length >= totalCount || totalCount === 0) return;
    setLoadingMore(true);
    void loadEmployees(page + 1, false);
  };

  const openAdd = () => {
    setEditingEmployee(null);
    setFormVisible(true);
  };

  const openEdit = (employee: EmployeeRecord) => {
    setEditingEmployee(employee);
    setFormVisible(true);
  };

  const handleSaved = (saved: EmployeeRecord) => {
    setFormVisible(false);
    setProfileEmployee((current) => current?.id === saved.id ? saved : current);
    void loadEmployees(1, false);
  };

  const handleDocumentUploaded = (uploadedDocument: EmployeeDocument) => {
    const addDocument = (employee: EmployeeRecord): EmployeeRecord => ({
      ...employee,
      documents: [...(employee.documents || []).filter((document) => document.id !== uploadedDocument.id), uploadedDocument],
    });
    setProfileEmployee((current) => current ? addDocument(current) : current);
    setEmployees((current) => current.map((employee) => employee.id === profileEmployee?.id ? addDocument(employee) : employee));
  };

  const confirmDelete = (employee: EmployeeRecord) => {
    setConfirmation({ kind: "delete", employee });
  };

  const confirmRemoveLogin = (employee: EmployeeRecord) => {
    setConfirmation({ kind: "removeLogin", employee });
  };

  const confirmDeleteDocument = (employee: EmployeeRecord, document: EmployeeDocument) => {
    setConfirmation({ kind: "deleteDocument", employee, document });
  };

  const runConfirmedAction = async () => {
    if (!confirmation || confirmingAction) return;
    setConfirmingAction(true);
    try {
      if (confirmation.kind === "delete") {
        await deleteEmployeeApi(confirmation.employee.id);
        notifyMobile(
          "success",
          `${employeeName(confirmation.employee)} was removed from the directory.`,
        );
        setProfileEmployee(null);
      } else if (confirmation.kind === "deleteDocument") {
        const document = confirmation.document;
        if (!document) throw new Error("The selected document could not be found.");
        await deleteEmployeeDocumentApi(confirmation.employee.id, document.id);
        const removeDocument = (employee: EmployeeRecord): EmployeeRecord => ({
          ...employee,
          documents: (employee.documents || []).filter((item) => item.id !== document.id),
        });
        setProfileEmployee((current) =>
          current?.id === confirmation.employee.id ? removeDocument(current) : current,
        );
        setEmployees((current) => current.map((employee) =>
          employee.id === confirmation.employee.id ? removeDocument(employee) : employee,
        ));
        notifyMobile("success", `${getEmployeeDocumentFileName(document.documentType, document.fileName)} was deleted.`);
      } else {
        await removeEmployeeLoginApi(confirmation.employee.id);
        notifyMobile("success", "Employee login access removed.");
        setProfileEmployee((current) =>
          current?.id === confirmation.employee.id
            ? { ...current, loginUsername: null }
            : current,
        );
      }
      setConfirmation(null);
      if (confirmation.kind !== "deleteDocument") void loadEmployees(1, false);
    } catch (error) {
      notifyMobile(
        "error",
        error instanceof Error
          ? error.message
          : confirmation.kind === "delete"
            ? "Could not delete employee."
            : confirmation.kind === "deleteDocument"
              ? "Could not delete uploaded document."
              : "Could not remove login access.",
      );
    } finally {
      setConfirmingAction(false);
    }
  };

  if (profileEmployee) {
    return <>
      <StatusBar barStyle="dark-content" />
      <EmployeeDetailView
        employee={profileEmployee}
        onBack={() => setProfileEmployee(null)}
        onEdit={() => openEdit(profileEmployee)}
        onDelete={() => confirmDelete(profileEmployee)}
        onRemoveLogin={() => confirmRemoveLogin(profileEmployee)}
        onDocumentUploaded={handleDocumentUploaded}
        onDeleteDocument={(document) => confirmDeleteDocument(profileEmployee, document)}
      />
      <EmployeeFormSheet visible={formVisible} employee={editingEmployee} onClose={() => setFormVisible(false)} onSaved={handleSaved} />
      <EmployeeConfirmationDialog
        visible={Boolean(confirmation)}
        kind={confirmation?.kind || "delete"}
        employeeName={confirmation ? employeeName(confirmation.employee) : ""}
        documentName={confirmation?.document ? getEmployeeDocumentFileName(confirmation.document.documentType, confirmation.document.fileName) : undefined}
        busy={confirmingAction}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void runConfirmedAction()}
      />
    </>;
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <AtelierHeader
        title="Employees"
        showProfile={false}
        backgroundColor={BACKGROUND}
        icon={<Users size={24} color={PRIMARY} strokeWidth={2.4} />}
        rightAction={<TouchableOpacity style={styles.headerAddButton} onPress={openAdd} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Add employee"><Plus size={20} color="#FFFFFF" strokeWidth={2.6} /></TouchableOpacity>}
      />

      <View style={styles.fixedTopSection}>
        <View style={styles.toolbarRow}>
          <View style={styles.searchBox}>
            <Search size={16} color="#9AA3B5" />
            <TextInput style={styles.searchInput} value={searchDraft} onChangeText={onSearchChange} placeholder="Search name, email or mobile..." placeholderTextColor="#9AA3B5" returnKeyType="search" onSubmitEditing={() => setSearch(searchDraft)} blurOnSubmit accessibilityLabel="Search employees" />
            {searchDraft ? <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Clear search"><X size={15} color={MUTED} /></TouchableOpacity> : null}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
          <TouchableOpacity style={[styles.filterChip, !department && styles.filterChipActive]} onPress={() => setDepartment("")} activeOpacity={0.7} accessibilityRole="button">
            <Text style={[styles.filterChipText, !department && styles.filterChipTextActive]}>All employees</Text>
          </TouchableOpacity>
          {EMPLOYEE_DEPARTMENTS.map((item) => (
            <TouchableOpacity key={item} style={[styles.filterChip, department === item && styles.filterChipActive]} onPress={() => setDepartment((current) => current === item ? "" : item)} activeOpacity={0.7} accessibilityRole="button" accessibilityState={{ selected: department === item }}>
              <Text style={[styles.filterChipText, department === item && styles.filterChipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        style={styles.employeeList}
        data={pageLoading ? [] : employees}
        keyExtractor={(employee) => String(employee.id)}
        onLayout={(event) => {
          const measuredHeight = event.nativeEvent.layout.height;
          // Keep the last valid list measurement while filter loading briefly
          // collapses the FlatList; tiny measurements would collapse every row.
          if (measuredHeight >= 250) setListViewportHeight(measuredHeight);
        }}
        contentContainerStyle={[styles.listContent, { paddingBottom: getTabBarContentPadding(insets.bottom) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        renderItem={({ item: employee }) => {
          const name = employeeName(employee);
          const roleTone = departmentTone(employee.department);
          return (
            <View style={[styles.employeeCard, { height: employeeCardHeight }]}>
              {/* Staff-badge panel: department-tinted, initials avatar with live status dot */}
              <TouchableOpacity
                style={[styles.badgePanel, { backgroundColor: roleTone.background, borderRightColor: roleTone.border }]}
                onPress={() => setProfileEmployee(employee)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`View ${name}'s profile`}
              >
                <View style={[styles.initialsAvatar, { borderColor: roleTone.border }, !employee.isActive && styles.initialsAvatarInactive]}>
                  <Text style={[styles.initialsText, { color: roleTone.foreground }]}>{employeeInitials(employee)}</Text>
                  <View style={[styles.avatarStatusDot, employee.isActive ? styles.statusDotActive : styles.statusDotInactive]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.employeeInfo} onPress={() => setProfileEmployee(employee)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`View ${name}'s profile`}>
                <View style={styles.nameRow}>
                  <Text style={styles.employeeName} numberOfLines={1}>{name}</Text>
                  {!employee.isActive ? <Text style={styles.inactiveTag}>INACTIVE</Text> : null}
                </View>
                <Text style={[styles.roleLabel, { color: roleTone.foreground }]} numberOfLines={1}>{employee.department}</Text>
                <View style={styles.mobileRow}>
                  <Phone size={10.5} color="#8C827A" />
                  <Text style={styles.mobileMeta} numberOfLines={1}>{employee.mobile}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.callButton} onPress={() => callEmployee(employee.mobile)} activeOpacity={0.8} hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }} accessibilityRole="button" accessibilityLabel={`Call ${name}`}>
                <Phone size={16} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListHeaderComponent={pageLoading ? <View style={styles.skeletonList}>{Array.from({ length: 6 }).map((_, index) => <View key={index} style={[styles.skeletonCard, { height: employeeCardHeight }]} />)}</View> : undefined}
        ListEmptyComponent={!pageLoading ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>{loadFailed ? <AlertCircle size={23} color="#DC2626" /> : <Users size={23} color={PRIMARY} />}</View>
            <Text style={styles.emptyTitle}>{loadFailed ? "Couldn't load employees" : "No employees found"}</Text>
            <Text style={styles.emptyText}>{loadFailed ? "Check your connection and try again." : search || department ? "Try another search or department." : "Add your first employee to start building the team directory."}</Text>
            {loadFailed ? (
              <TouchableOpacity style={styles.emptyResetButton} onPress={() => void loadEmployees(1, true)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Retry loading employees"><Text style={styles.emptyResetText}>Try again</Text></TouchableOpacity>
            ) : search || department ? (
              <TouchableOpacity style={styles.emptyResetButton} onPress={() => { clearSearch(); setDepartment(""); }} activeOpacity={0.7}><Text style={styles.emptyResetText}>Reset filters</Text></TouchableOpacity>
            ) : null}
          </View>
        ) : undefined}
        ListFooterComponent={loadingMore ? <View style={styles.loadMoreRow}><ActivityIndicator size="small" color={PRIMARY} /><Text style={styles.loadMoreText}>Loading more employees...</Text></View> : undefined}
      />

      <EmployeeFormSheet visible={formVisible} employee={editingEmployee} onClose={() => setFormVisible(false)} onSaved={handleSaved} />
      <EmployeeConfirmationDialog
        visible={Boolean(confirmation)}
        kind={confirmation?.kind || "delete"}
        employeeName={confirmation ? employeeName(confirmation.employee) : ""}
        documentName={confirmation?.document ? getEmployeeDocumentFileName(confirmation.document.documentType, confirmation.document.fileName) : undefined}
        busy={confirmingAction}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => void runConfirmedAction()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND },
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
  fixedTopSection: { paddingHorizontal: 16, backgroundColor: "transparent" },
  toolbarRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 13.5, color: TEXT, height: 44, paddingVertical: 0 },
  filterChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 6,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  filterChipActive: { backgroundColor: PRIMARY_MUTED, borderColor: "#C69596" },
  filterChipText: { color: MUTED, fontSize: 11.5, fontWeight: "600" },
  filterChipTextActive: { color: PRIMARY, fontWeight: "700" },
  employeeList: { flex: 1, minHeight: 0 },
  listContent: { paddingHorizontal: 16, paddingTop: 2, gap: 7 },
  // Staff-badge card: tinted initials panel on the left + solid call button on the right.
  employeeCard: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DED7CE",
    backgroundColor: SURFACE,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 5,
      },
      android: { elevation: 3 },
      web: { boxShadow: "0 3px 8px rgba(35,30,28,0.08)" },
    }),
  },
  badgePanel: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
  },
  initialsAvatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsAvatarInactive: { opacity: 0.55 },
  initialsText: { fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  avatarStatusDot: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: SURFACE,
  },
  employeeInfo: { flex: 1, minWidth: 0, justifyContent: "center", paddingLeft: 12, paddingRight: 8, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  employeeName: { flexShrink: 1, color: TEXT, fontSize: 15, fontWeight: "700" },
  inactiveTag: { color: "#B42318", fontSize: 8.5, fontWeight: "800", letterSpacing: 0.6 },
  statusDotActive: { backgroundColor: SUCCESS },
  statusDotInactive: { backgroundColor: "#DC2626" },
  roleLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.7, textTransform: "uppercase" },
  mobileRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  mobileMeta: { flexShrink: 1, color: MUTED, fontSize: 11.5, fontVariant: ["tabular-nums"] },
  callButton: {
    alignSelf: "center",
    width: 38,
    height: 38,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3 },
      android: { elevation: 2 },
      web: { boxShadow: "0 2px 4px rgba(120,7,13,0.25)" },
    }),
  },
  skeletonList: { gap: 7 },
  skeletonCard: { height: 60, borderRadius: 16, backgroundColor: "#EFEBE4" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY_MUTED,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { color: TEXT, fontSize: 15.5, fontWeight: "700", marginBottom: 4 },
  emptyText: { color: MUTED, fontSize: 12.5, lineHeight: 18, textAlign: "center", maxWidth: 260 },
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
  emptyResetText: { color: PRIMARY, fontSize: 12, fontWeight: "600" },
  loadMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  loadMoreText: { color: MUTED, fontSize: 12 },
});
