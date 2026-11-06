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
import { AlertCircle, Building2, ChevronRight, Phone, Plus, Search, UserRound, Users, X } from "lucide-react-native";
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

function employeeIconTone(id: number, name: string) {
  const tones = [
    { foreground: "#BE185D", background: "#FCE7F3" },
    { foreground: "#6D28D9", background: "#F3E8FF" },
    { foreground: "#4338CA", background: "#E0E7FF" },
    { foreground: "#0369A1", background: "#E0F2FE" },
    { foreground: "#B45309", background: "#FEF3C7" },
    { foreground: "#047857", background: "#D1FAE5" },
  ];
  let hash = id || 0;
  for (let i = 0; i < name.length; i++) hash = (hash << 5) - hash + name.charCodeAt(i);
  return tones[Math.abs(hash) % tones.length];
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
          const iconTone = employeeIconTone(employee.id, name);
          const roleTone = departmentTone(employee.department);
          return (
            <View style={[styles.employeeCard, { height: employeeCardHeight, borderLeftColor: roleTone.foreground }]}>
              <TouchableOpacity style={styles.employeeInfo} onPress={() => setProfileEmployee(employee)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`View ${name}'s profile`}>
                <View style={styles.employeeCopy}>
                  <View style={styles.nameRow}>
                    <View style={[styles.employeeIconBadge, { backgroundColor: iconTone.background }]}>
                      <UserRound size={11} color={iconTone.foreground} />
                    </View>
                    <Text style={styles.employeeName} numberOfLines={1}>{name}</Text>
                    <View style={[styles.statusPill, employee.isActive ? styles.statusPillActive : styles.statusPillInactive]}>
                      <View style={[styles.statusDot, employee.isActive ? styles.statusDotActive : styles.statusDotInactive]} />
                      <Text style={[styles.statusPillText, employee.isActive ? styles.statusPillTextActive : styles.statusPillTextInactive]}>
                        {employee.isActive ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <View style={[styles.metaItem, styles.departmentPill, { backgroundColor: roleTone.background, borderColor: roleTone.border }]}>
                      <View style={[styles.metaIconBadge, { backgroundColor: roleTone.background }]}>
                        <Building2 size={11} color={roleTone.foreground} />
                      </View>
                      <Text style={[styles.departmentMeta, { color: roleTone.foreground }]} numberOfLines={1}>{employee.department}</Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <View style={[styles.metaIconBadge, styles.mobileIconBadge]}>
                        <Phone size={11} color="#059669" />
                      </View>
                      <Text style={styles.mobileMeta} numberOfLines={1}>{employee.mobile}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.callButton} onPress={() => callEmployee(employee.mobile)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Call ${name}`}><Phone size={15} color={PRIMARY} /></TouchableOpacity>
                <TouchableOpacity style={styles.chevronButton} onPress={() => setProfileEmployee(employee)} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`View ${name}`}><ChevronRight size={16} color="#B8B2A8" /></TouchableOpacity>
              </View>
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
  employeeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: "#DED7CE",
    backgroundColor: SURFACE,
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
  employeeInfo: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  employeeCopy: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  employeeIconBadge: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: "rgba(120,7,13,0.10)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  employeeName: { flexShrink: 1, color: TEXT, fontSize: 15, fontWeight: "700" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusPillActive: { backgroundColor: "#EFF9F4", borderColor: "#D5EBDD" },
  statusPillInactive: { backgroundColor: "#FFF3F2", borderColor: "#F2D8D5" },
  statusPillText: { fontSize: 9.5, lineHeight: 12, fontWeight: "700" },
  statusPillTextActive: { color: "#047857" },
  statusPillTextInactive: { color: "#B42318" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive: { backgroundColor: SUCCESS },
  statusDotInactive: { backgroundColor: "#DC2626" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, minWidth: 0 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0 },
  metaIconBadge: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  departmentPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, flexShrink: 1 },
  mobileIconBadge: { backgroundColor: "#ECFDF5" },
  departmentMeta: { flexShrink: 1, minWidth: 0, fontSize: 10.5, fontWeight: "600" },
  mobileMeta: { flexShrink: 0, color: MUTED, fontSize: 11.5, fontVariant: ["tabular-nums"] },
  metaDivider: { width: StyleSheet.hairlineWidth, height: 11, backgroundColor: BORDER },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 6 },
  callButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FBF2F3", borderWidth: 1, borderColor: "#E8C6C8", alignItems: "center", justifyContent: "center" },
  chevronButton: { padding: 4, alignItems: "center", justifyContent: "center" },
  skeletonList: { gap: 7 },
  skeletonCard: { height: 60, borderRadius: 14, backgroundColor: "#EFEBE4" },
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
