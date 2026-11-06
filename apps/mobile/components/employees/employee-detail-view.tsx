import React, { useEffect, useState } from "react";
import { BackHandler, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Building2, CalendarDays, CreditCard, Eye, FileText, LockKeyhole, Mail, Pencil, Phone, PhoneCall, ShieldCheck, ShieldOff, Trash2, Upload, User } from "lucide-react-native";
import { AtelierHeader } from "../layout/atelier-header";
import { getEmployeeDocumentFileName, type EmployeeDocument, type EmployeeRecord } from "../../lib/employee-api";
import { EmployeeDocumentUploadSheet } from "./employee-document-upload-sheet";
import { EmployeeDocumentPreviewSheet } from "./employee-document-preview-sheet";
import { getTabBarContentPadding } from "../../constants/layout";
import { notifyMobile } from "../../lib/notifications";

const PRIMARY = "#78070D";
const BACKGROUND = "#FAF7F2";
const SURFACE = "#FFFFFF";
const BORDER = "#E8E2D8";
const TEXT = "#231E1C";
const MUTED = "#6E6862";
const SUCCESS = "#059669";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatMoney(value?: number | null) {
  if (value == null) return "Not provided";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

async function callEmployee(mobile: string) {
  const phoneNumber = mobile.replace(/[^\d+]/g, "");
  if (!phoneNumber) {
    notifyMobile("warning", "No mobile number is available for this employee.");
    return;
  }

  try {
    await Linking.openURL(`tel:${phoneNumber}`);
  } catch {
    notifyMobile("error", "Unable to open the phone app.");
  }
}

interface Props {
  employee: EmployeeRecord;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveLogin: () => void;
  onDocumentUploaded: (document: EmployeeDocument) => void;
  onDeleteDocument: (document: EmployeeDocument) => void;
}

export function EmployeeDetailView({ employee, onBack, onEdit, onDelete, onRemoveLogin, onDocumentUploaded, onDeleteDocument }: Props) {
  const insets = useSafeAreaInsets();
  const fullName = `${employee.firstName} ${employee.lastName || ""}`.trim();
  const [activeSection, setActiveSection] = useState<"profile" | "documents">("profile");
  const [documentUploadVisible, setDocumentUploadVisible] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<EmployeeDocument | null>(null);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });

    return () => backHandler.remove();
  }, [onBack]);

  return (
    <View style={styles.container}>
      <AtelierHeader
        align="left"
        title={fullName}
        subtitle={
          <View style={styles.headerSubtitle}>
            <Text style={styles.headerDepartment}>{employee.department}</Text>
            <View style={[styles.statusDot, employee.isActive ? styles.statusActive : styles.statusInactive]} />
            <Text style={[styles.statusText, employee.isActive ? styles.activeText : styles.inactiveText]}>{employee.isActive ? "Active" : "Inactive"}</Text>
          </View>
        }
        showBack
        onBack={onBack}
        backgroundColor={BACKGROUND}
        brandTitleStyle={styles.headerTitle}
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton} onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit employee"><Pencil size={15} color={PRIMARY} /></TouchableOpacity>
            <TouchableOpacity style={[styles.headerActionButton, styles.deleteHeaderButton]} onPress={onDelete} accessibilityRole="button" accessibilityLabel="Delete employee"><Trash2 size={15} color="#DC2626" /></TouchableOpacity>
          </View>
        }
      />

      <View style={[styles.content, { paddingBottom: getTabBarContentPadding(insets.bottom) }]}>
        <View style={styles.sectionTabs} accessibilityRole="tablist">
          <TouchableOpacity
            style={[styles.sectionTab, activeSection === "profile" && styles.sectionTabActive]}
            onPress={() => setActiveSection("profile")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSection === "profile" }}
          >
            <Text style={[styles.sectionTabText, activeSection === "profile" && styles.sectionTabTextActive]}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sectionTab, activeSection === "documents" && styles.sectionTabActive]}
            onPress={() => setActiveSection("documents")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSection === "documents" }}
          >
            <Text style={[styles.sectionTabText, activeSection === "documents" && styles.sectionTabTextActive]}>Documents</Text>
          </TouchableOpacity>
        </View>

        {activeSection === "profile" ? <View style={styles.sectionContent}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Contact details</Text>
            {employee.mobile ? (
              <TouchableOpacity
                style={styles.callSectionButton}
                onPress={() => void callEmployee(employee.mobile)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Call ${fullName}`}
              >
                <PhoneCall size={16} color={PRIMARY} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={[styles.infoCard, styles.contactDetailsCard]}>
            <InfoRow
              compact
              icon={<Phone size={16} color={PRIMARY} />}
              label="Mobile number"
              value={employee.mobile || "—"}
            />
            <InfoDivider />
            <InfoRow compact icon={<Mail size={16} color={PRIMARY} />} label="Email address" value={employee.email || "—"} />
          </View>

          <Text style={[styles.sectionTitle, styles.profileSectionTitle]}>Employment details</Text>
          <View style={styles.infoGrid}>
            <InfoTile icon={<Building2 size={16} color={PRIMARY} />} label="Department" value={employee.department || "—"} />
            <InfoTile icon={<CalendarDays size={16} color={PRIMARY} />} label="Date of joining" value={formatDate(employee.dateOfJoining)} />
            <InfoTile icon={<CreditCard size={16} color={PRIMARY} />} label="Salary" value={formatMoney(employee.salary)} />
            <InfoTile icon={<User size={16} color={PRIMARY} />} label="Updated by" value={employee.updatedByUsername || employee.createdByUsername || "—"} />
          </View>
        </View> : <View style={styles.sectionContent}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <TouchableOpacity
              style={styles.uploadDocumentButton}
              onPress={() => setDocumentUploadVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Upload employee document"
              accessibilityHint="Opens the employee document upload form"
            >
              <Upload size={15} color={PRIMARY} />
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <InfoRow compact icon={<FileText size={16} color={PRIMARY} />} label="PAN" value={employee.panNumber || employee.panMasked || "Not provided"} />
            <InfoDivider />
            <InfoRow compact icon={<FileText size={16} color={PRIMARY} />} label="Aadhaar" value={employee.aadhaarNumber || employee.aadhaarMasked || "Not provided"} />
            <InfoDivider />
            <InfoRow icon={<FileText size={16} color={PRIMARY} />} label="Uploaded documents" value={employee.documents?.length ? undefined : "—"} />
            {employee.documents?.length ? <View style={styles.documentsList}>
              {employee.documents.map((document) => (
                <View key={document.id} style={styles.documentRow}>
                  <FileText size={14} color={MUTED} />
                  <Text style={styles.documentName} numberOfLines={1}>
                    {getEmployeeDocumentFileName(document.documentType, document.fileName)}
                  </Text>
                  <Text style={styles.documentDate}>{formatDate(document.uploadedAt)}</Text>
                  <View style={styles.documentActions}>
                    <TouchableOpacity
                      style={styles.documentActionButton}
                      onPress={() => setPreviewDocument(document)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${getEmployeeDocumentFileName(document.documentType, document.fileName)}`}
                    >
                      <Eye size={15} color={PRIMARY} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.documentActionButton}
                      onPress={() => onDeleteDocument(document)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${getEmployeeDocumentFileName(document.documentType, document.fileName)}`}
                    >
                      <Trash2 size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View> : null}
          </View>

          <Text style={[styles.sectionTitle, styles.loginSectionTitle]}>Login Details</Text>
          <View style={styles.loginAccessCard}>
            <InfoRow compact icon={employee.loginUsername ? <ShieldCheck size={16} color={SUCCESS} /> : <ShieldOff size={16} color={MUTED} />} label="Login access" value={employee.loginUsername ? "Enabled" : "Not enabled"} />
            {employee.loginUsername ? <>
              <InfoDivider />
              <InfoRow compact icon={<User size={16} color={PRIMARY} />} label="Username" value={employee.loginUsername} />
              <InfoDivider />
              <InfoRow compact icon={<LockKeyhole size={16} color={PRIMARY} />} label="Password" value="••••••••" />
            </> : null}
          </View>
          {employee.loginUsername ? (
            <TouchableOpacity style={styles.revokeButton} onPress={onRemoveLogin} activeOpacity={0.7} accessibilityRole="button">
              <ShieldOff size={15} color={PRIMARY} />
              <Text style={styles.revokeText}>Remove login access</Text>
            </TouchableOpacity>
          ) : null}
        </View>}
      </View>

      <EmployeeDocumentUploadSheet
        visible={documentUploadVisible}
        employee={employee}
        onClose={() => setDocumentUploadVisible(false)}
        onUploaded={onDocumentUploaded}
      />
      <EmployeeDocumentPreviewSheet
        visible={previewDocument !== null}
        employeeId={employee.id}
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
      />
    </View>
  );
}

function InfoDivider() { return <View style={styles.divider} />; }

function InfoRow({ icon, label, value, compact = false, action }: { icon: React.ReactNode; label: string; value?: string; compact?: boolean; action?: React.ReactNode }) {
  return (
    <View style={[styles.infoRow, compact && styles.infoRowTight, value === undefined && styles.infoRowCompact]}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        {value !== undefined ? <Text style={styles.infoValue}>{value}</Text> : null}
      </View>
      {action}
    </View>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoTile}>
      <View style={styles.tileIcon}>{icon}</View>
      <View style={styles.tileCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.tileValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND },
  headerSubtitle: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  headerDepartment: { fontSize: 11.5, color: MUTED },
  headerTitle: { fontSize: 18, lineHeight: 22, fontWeight: "700", color: PRIMARY, letterSpacing: -0.3 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusActive: { backgroundColor: SUCCESS },
  statusInactive: { backgroundColor: "#DC2626" },
  statusText: { fontSize: 11, fontWeight: "700" },
  activeText: { color: SUCCESS },
  inactiveText: { color: "#DC2626" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
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
  deleteHeaderButton: { backgroundColor: "#FFF5F5", borderColor: "#FECACA" },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4, gap: 8 },
  sectionTabs: { flexDirection: "row", padding: 3, borderRadius: 12, backgroundColor: "#F0EBE3", gap: 3 },
  sectionTab: { flex: 1, minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 8, borderRadius: 9 },
  sectionTabActive: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  sectionTabText: { color: MUTED, fontSize: 11.5, fontWeight: "600" },
  sectionTabTextActive: { color: PRIMARY, fontWeight: "700" },
  sectionContent: { gap: 8 },
  sectionTitle: { marginTop: 1, color: TEXT, fontSize: 13.5, fontWeight: "700" },
  sectionHeadingRow: { marginTop: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profileSectionTitle: { marginTop: 12 },
  loginSectionTitle: { marginTop: 12 },
  uploadDocumentButton: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  infoCard: { paddingHorizontal: 9, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  contactDetailsCard: { paddingVertical: 5, gap: 8 },
  infoRow: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  infoRowTight: { minHeight: 38, paddingVertical: 2 },
  infoRowCompact: { minHeight: 30, paddingVertical: 1 },
  infoIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#FBF2F3", alignItems: "center", justifyContent: "center" },
  callSectionButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FBF2F3", borderWidth: 1, borderColor: "#E8C6C8", alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1, minWidth: 0 },
  infoLabel: { color: MUTED, fontSize: 11.5 },
  infoValue: { marginTop: 2, color: TEXT, fontSize: 13, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 35 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, alignContent: "flex-start" },
  infoTile: { width: "48%", minHeight: 56, flexDirection: "row", alignItems: "center", gap: 6, padding: 7, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  tileIcon: { width: 26, height: 26, flexShrink: 0, borderRadius: 8, backgroundColor: "#FBF2F3", alignItems: "center", justifyContent: "center" },
  tileCopy: { flex: 1, minWidth: 0 },
  tileValue: { marginTop: 2, color: TEXT, fontSize: 12.5, fontWeight: "600" },
  loginAccessCard: { borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, paddingHorizontal: 9 },
  documentsList: { paddingLeft: 35, paddingTop: 2, paddingBottom: 3, gap: 2 },
  documentRow: { minHeight: 30, flexDirection: "row", alignItems: "center", gap: 5 },
  documentName: { flex: 1, color: TEXT, fontSize: 11.5 },
  documentDate: { color: MUTED, fontSize: 10.5 },
  documentActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  documentActionButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  revokeButton: { height: 36, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: "#E8C6C8", backgroundColor: SURFACE },
  revokeText: { color: PRIMARY, fontSize: 12, fontWeight: "700" },
});
