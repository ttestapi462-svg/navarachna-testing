import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CirclePlus, CreditCard, FileText, LockKeyhole, Mail, Pencil, Phone, User, UserRoundPlus, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { notifyMobile } from "../../lib/notifications";
import {
  createEmployeeApi,
  updateEmployeeApi,
  type EmployeePayload,
  type EmployeeRecord,
} from "../../lib/employee-api";

const PRIMARY = "#78070D";
const BACKGROUND = "#FAF7F2";
const SURFACE = "#FFFFFF";
const BORDER = "#E8E2D8";
const TEXT = "#231E1C";
const MUTED = "#6E6862";
const SUCCESS = "#059669";
const DANGER = "#DC2626";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const EMPLOYEE_DEPARTMENTS = [
  "Studio Receptionist",
  "Floor Supervisor",
  "Sourcing Specialist",
  "Cutting Master",
  "Master Tailor",
  "Finishing Specialist",
  "Packaging & Dispatch",
  "Other Employee",
] as const;

interface EmployeeFormValues {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  panNumber: string;
  aadhaarNumber: string;
  department: string;
  salary: string;
  dateOfJoining: string;
  createLogin: boolean;
  loginUsername: string;
  loginPassword: string;
  loginConfirmPassword: string;
}

const EMPTY_VALUES: EmployeeFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  mobile: "",
  panNumber: "",
  aadhaarNumber: "",
  department: "Master Tailor",
  salary: "",
  dateOfJoining: localDateString(),
  createLogin: false,
  loginUsername: "",
  loginPassword: "",
  loginConfirmPassword: "",
};

interface Props {
  visible: boolean;
  employee?: EmployeeRecord | null;
  onClose: () => void;
  onSaved: (employee: EmployeeRecord) => void;
}

export function EmployeeFormSheet({ visible, employee, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const editing = Boolean(employee);
  const [values, setValues] = useState<EmployeeFormValues>(EMPTY_VALUES);
  const [initialValues, setInitialValues] = useState<EmployeeFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [departmentPickerVisible, setDepartmentPickerVisible] = useState(false);
  const [formStep, setFormStep] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const next: EmployeeFormValues = employee
      ? {
          ...EMPTY_VALUES,
          firstName: employee.firstName || "",
          lastName: employee.lastName || "",
          email: employee.email || "",
          mobile: employee.mobile || "",
          panNumber: employee.panNumber || "",
          aadhaarNumber: employee.aadhaarNumber || "",
          department: employee.department || "Master Tailor",
          salary: employee.salary == null ? "" : String(employee.salary),
          dateOfJoining: employee.dateOfJoining?.slice(0, 10) || "",
        }
      : { ...EMPTY_VALUES, dateOfJoining: localDateString() };
    setValues(next);
    setInitialValues(next);
    setErrors({});
    setFormStep(0);
    setDepartmentPickerVisible(false);
  }, [visible, employee]);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(initialValues), [values, initialValues]);
  const hasLoginStep = !editing && values.createLogin;
  const finalStep = hasLoginStep ? 4 : 3;
  const isFinalStep = formStep === finalStep;
  const setField = (key: keyof EmployeeFormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const requestClose = () => {
    if (saving) return;
    if (dirty) {
      Alert.alert("Discard changes?", "Your unsaved employee details will be lost.", [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onClose },
      ]);
      return;
    }
    onClose();
  };

  const validate = (onlyFields?: (keyof EmployeeFormValues)[]) => {
    const next: Record<string, string> = {};
    const firstName = values.firstName.trim();
    const lastName = values.lastName.trim();
    const email = values.email.trim();
    const mobile = values.mobile.trim();
    const pan = values.panNumber.trim().toUpperCase();
    const aadhaar = values.aadhaarNumber.trim();
    const joiningDate = values.dateOfJoining.trim();
    const salary = values.salary.trim();
    if (firstName.length < 2 || firstName.length > 50) next.firstName = "Enter a first name between 2 and 50 characters.";
    if (lastName && (lastName.length < 2 || lastName.length > 50)) next.lastName = "Last name must be between 2 and 50 characters.";
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (!/^[6-9]\d{9}$/.test(mobile)) next.mobile = "Enter a valid 10-digit Indian mobile number.";
    if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) next.panNumber = "Enter a valid PAN number.";
    if (aadhaar && !/^(?:[2-9]\d{11}|\d{4})$/.test(aadhaar)) next.aadhaarNumber = "Enter a valid 12-digit Aadhaar number or last 4 digits.";
    if (!EMPLOYEE_DEPARTMENTS.includes(values.department as (typeof EMPLOYEE_DEPARTMENTS)[number])) next.department = "Select a department.";
    if (salary && (!Number.isFinite(Number(salary)) || Number(salary) < 0 || Number(salary) > 100000000)) next.salary = "Enter a valid non-negative salary.";
    const parsedDate = new Date(`${joiningDate}T00:00:00`);
    const [joiningYear, joiningMonth, joiningDay] = joiningDate.split("-").map(Number);
    const today = new Date(); today.setHours(23, 59, 59, 999);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(joiningDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.getFullYear() !== joiningYear || parsedDate.getMonth() + 1 !== joiningMonth || parsedDate.getDate() !== joiningDay) next.dateOfJoining = "Enter the joining date as YYYY-MM-DD.";
    else if (parsedDate > today) next.dateOfJoining = "Joining date cannot be in the future.";

    if (!editing && values.createLogin) {
      if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(values.loginUsername.trim())) next.loginUsername = "Username must be 3–50 letters, numbers, dots, underscores or hyphens.";
      if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(values.loginPassword)) next.loginPassword = "Use 8+ characters with uppercase, lowercase, number and symbol.";
      if (values.loginConfirmPassword !== values.loginPassword) next.loginConfirmPassword = "Passwords do not match.";
    }
    let relevantErrors = next;
    if (onlyFields) {
      relevantErrors = {};
      Object.keys(next).forEach((key) => {
        if (onlyFields.includes(key as keyof EmployeeFormValues)) relevantErrors[key] = next[key];
      });
    }
    setErrors(relevantErrors);
    return Object.keys(relevantErrors).length === 0;
  };

  const continueForm = () => {
    const stepFields: (keyof EmployeeFormValues)[][] = [
      ["firstName", "lastName"],
      ["email", "mobile"],
      ["department", "salary", "dateOfJoining"],
      ["panNumber", "aadhaarNumber"],
      ["loginUsername", "loginPassword", "loginConfirmPassword"],
    ];
    if (validate(stepFields[formStep])) setFormStep((current) => Math.min(finalStep, current + 1));
  };

  const save = async () => {
    if (!validate()) {
      notifyMobile("validation", "Please correct the highlighted employee fields.");
      return;
    }
    setSaving(true);
    const payload: EmployeePayload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim() || undefined,
      email: values.email.trim(),
      mobile: values.mobile.trim(),
      panNumber: values.panNumber.trim().toUpperCase() || undefined,
      aadhaarNumber: values.aadhaarNumber.trim() || undefined,
      department: values.department,
      salary: values.salary.trim() ? Number(values.salary) : null,
      dateOfJoining: values.dateOfJoining.trim(),
      ...(editing && employee ? { version: employee.version } : {}),
      ...(!editing && values.createLogin
        ? { credentials: { username: values.loginUsername.trim(), password: values.loginPassword } }
        : {}),
    };
    try {
      const saved = editing && employee
        ? await updateEmployeeApi(employee.id, payload)
        : await createEmployeeApi(payload);
      notifyMobile("success", editing ? "Employee details updated." : "Employee added successfully.");
      onSaved(saved);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save employee details.";
      notifyMobile("error", message);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (
    label: string,
    key: keyof EmployeeFormValues,
    options: {
      placeholder?: string;
      keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
      autoCapitalize?: "none" | "sentences" | "words" | "characters";
      secureTextEntry?: boolean;
      optional?: boolean;
      icon?: (color: string) => React.ReactNode;
    } = {}
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>
        {label.replace(/ \*$/, "")}
        {label.endsWith(" *") ? <Text style={styles.requiredStar}> *</Text> : null}
        {options.optional ? <Text style={styles.optionalLabel}> (Optional)</Text> : null}
      </Text>
      <View style={[styles.inputWrapper, errors[key] ? styles.inputError : undefined]}>
        {options.icon?.(errors[key] ? DANGER : PRIMARY)}
        <TextInput
          style={styles.input}
          value={String(values[key] ?? "")}
          onChangeText={(value) => setField(key, key === "mobile" ? value.replace(/\D/g, "").slice(0, 10) : value)}
          placeholder={options.placeholder || label.replace(/ \*$/, "")}
          placeholderTextColor="#9AA3B5"
          keyboardType={options.keyboardType || "default"}
          autoCapitalize={options.autoCapitalize || "sentences"}
          secureTextEntry={options.secureTextEntry}
          accessibilityLabel={label.replace(/ \*$/, "")}
        />
      </View>
      {errors[key] ? <Text style={styles.fieldError}>{errors[key]}</Text> : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}
    >
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 20 : 12) }]}>
          <View style={styles.handleRow}><View style={styles.handle} /></View>
          <View style={styles.header}>
            <View style={styles.heading}>
              <View style={styles.headingIcon}>{editing ? <Pencil size={18} color={PRIMARY} /> : <CirclePlus size={18} color={PRIMARY} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{editing ? "Edit employee" : "Add employee"}</Text>
                <Text style={styles.subtitle}>{editing ? "Update employee profile details." : "Add a team member to the directory."}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={requestClose} accessibilityRole="button" accessibilityLabel="Close employee form"><X size={17} color={MUTED} /></TouchableOpacity>
          </View>

          <View style={styles.stepProgress} accessibilityLabel={`Form step ${formStep + 1} of ${hasLoginStep ? 5 : 4}`}>
            <View style={styles.stepTrack}>
              {Array.from({ length: hasLoginStep ? 5 : 4 }, (_, step) => <View key={step} style={[styles.stepSegment, step <= formStep && styles.stepSegmentActive]} />)}
            </View>
            <Text style={styles.stepLabel}>{["Personal details", "Contact details", "Employment details", "Documents & access", "Login credentials"][formStep]}</Text>
          </View>

          <View style={styles.formBody}>
            {formStep === 0 ? (
              <>
                {renderField("First name *", "firstName", { autoCapitalize: "words", icon: (color) => <User size={16} color={color} /> })}
                {renderField("Last name", "lastName", { autoCapitalize: "words", optional: true, icon: (color) => <User size={16} color={color} /> })}
              </>
            ) : null}

            {formStep === 1 ? (
              <>
                {renderField("Email *", "email", { keyboardType: "email-address", autoCapitalize: "none", icon: (color) => <Mail size={16} color={color} /> })}
                {renderField("Mobile number *", "mobile", { keyboardType: "phone-pad", icon: (color) => <Phone size={16} color={color} /> })}
              </>
            ) : null}

            {formStep === 2 ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Department <Text style={styles.requiredStar}>*</Text></Text>
                  <TouchableOpacity style={[styles.selectInput, errors.department ? styles.inputError : undefined]} onPress={() => setDepartmentPickerVisible(true)} accessibilityRole="button" accessibilityLabel="Choose department">
                    <Building2 size={16} color={PRIMARY} />
                    <Text style={styles.selectText}>{values.department}</Text>
                    <ChevronDown size={16} color={MUTED} />
                  </TouchableOpacity>
                  {errors.department ? <Text style={styles.fieldError}>{errors.department}</Text> : null}
                </View>
                {renderField("Salary", "salary", { keyboardType: "numeric", optional: true, icon: (color) => <CreditCard size={16} color={color} /> })}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Date of joining <Text style={styles.requiredStar}>*</Text></Text>
                  <View style={[styles.dateInput, errors.dateOfJoining ? styles.inputError : undefined]}>
                    <CalendarDays size={15} color={errors.dateOfJoining ? DANGER : PRIMARY} />
                    <TextInput style={styles.dateTextInput} value={values.dateOfJoining} onChangeText={(value) => setField("dateOfJoining", value)} placeholder="YYYY-MM-DD" placeholderTextColor="#9AA3B5" autoCapitalize="none" accessibilityLabel="Date of joining" />
                  </View>
                  {errors.dateOfJoining ? <Text style={styles.fieldError}>{errors.dateOfJoining}</Text> : null}
                </View>
              </>
            ) : null}

            {formStep === 3 ? <>
              {renderField("PAN number", "panNumber", { autoCapitalize: "characters", optional: true, icon: (color) => <FileText size={16} color={color} /> })}
              {renderField("Aadhaar number", "aadhaarNumber", { keyboardType: "numeric", optional: true, icon: (color) => <FileText size={16} color={color} /> })}
            {!editing ? (
              <TouchableOpacity style={styles.loginToggle} onPress={() => setField("createLogin", !values.createLogin)} accessibilityRole="checkbox" accessibilityState={{ checked: values.createLogin }}>
                <View style={[styles.checkbox, values.createLogin && styles.checkboxSelected]}>{values.createLogin ? <Check size={13} color="#FFFFFF" /> : null}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.loginTitle}>Create login access<Text style={styles.optionalLabel}> (Optional)</Text></Text>
                  <Text style={styles.loginHint}>Set up employee sign-in credentials</Text>
                </View>
              </TouchableOpacity>
            ) : null}
            </> : null}
            {formStep === 4 && hasLoginStep ? <>
              {renderField("Username *", "loginUsername", { autoCapitalize: "none", icon: (color) => <User size={16} color={color} /> })}
              {renderField("Password *", "loginPassword", { secureTextEntry: true, autoCapitalize: "none", icon: (color) => <LockKeyhole size={16} color={color} /> })}
              {renderField("Confirm password *", "loginConfirmPassword", { secureTextEntry: true, autoCapitalize: "none", icon: (color) => <LockKeyhole size={14} color={color} /> })}
            </> : null}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={requestClose} disabled={saving} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Cancel"><X size={14} color={DANGER} strokeWidth={2.4} /><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            {formStep > 0 ? (
              <TouchableOpacity style={styles.stepBackButton} onPress={() => setFormStep((current) => Math.max(0, current - 1))} disabled={saving} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Previous step">
                <ChevronLeft size={15} color={PRIMARY} />
                <Text style={styles.stepBackText}>Back</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={isFinalStep ? save : continueForm} disabled={saving} accessibilityRole="button">
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : !isFinalStep ? <ChevronRight size={14} color="#FFFFFF" /> : editing ? <Check size={14} color="#FFFFFF" strokeWidth={2.4} /> : <UserRoundPlus size={14} color="#FFFFFF" strokeWidth={2.4} />}
              <Text style={styles.saveText}>{!isFinalStep ? "Continue" : editing ? "Save changes" : "Add employee"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={departmentPickerVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setDepartmentPickerVisible(false)}
      >
        <View style={styles.departmentBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDepartmentPickerVisible(false)} />
          <View style={styles.departmentSheet}>
            <View style={styles.departmentHeader}>
              <Text style={styles.departmentTitle}>Choose department</Text>
              <TouchableOpacity onPress={() => setDepartmentPickerVisible(false)} accessibilityLabel="Close departments"><X size={18} color={MUTED} /></TouchableOpacity>
            </View>
            <View>
              {EMPLOYEE_DEPARTMENTS.map((department) => (
                <TouchableOpacity key={department} style={styles.departmentOption} onPress={() => { setField("department", department); setDepartmentPickerVisible(false); }} accessibilityRole="button">
                  <Text style={styles.departmentOptionText}>{department}</Text>
                  {department === values.department ? <Check size={17} color={PRIMARY} /> : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    width: "100%",
    maxHeight: "96%",
    flexShrink: 1,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  handleRow: { alignItems: "center", paddingTop: 6, paddingBottom: 4 },
  handle: { width: 40, height: 4.5, borderRadius: 2.5, backgroundColor: "#D4CEC6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EAE5DC",
  },
  heading: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headingIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#FBF2F3",
    borderWidth: 1,
    borderColor: "rgba(120, 7, 13, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16.5, fontWeight: "700", color: TEXT, letterSpacing: -0.3 },
  subtitle: { marginTop: 1.5, fontSize: 11.5, color: MUTED },
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
  stepProgress: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 1, gap: 4 },
  stepTrack: { flexDirection: "row", gap: 4 },
  stepSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "#EAE5DC" },
  stepSegmentActive: { backgroundColor: PRIMARY },
  stepLabel: { color: MUTED, fontSize: 11, fontWeight: "600" },
  formBody: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, gap: 12 },
  fieldGroup: { width: "100%", gap: 4, minWidth: 0 },
  fieldLabel: { fontSize: 11.5, fontWeight: "700", color: TEXT },
  requiredStar: { color: DANGER, fontWeight: "800" },
  optionalLabel: { color: MUTED, fontSize: 11.5, fontWeight: "500" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DFD9D0",
    backgroundColor: "#FCFAF7",
    paddingHorizontal: 9,
    gap: 6,
  },
  inputError: { borderColor: DANGER, backgroundColor: "#FFF5F5" },
  input: {
    flex: 1,
    minWidth: 0,
    height: 40,
    paddingVertical: 0,
    color: TEXT,
    fontSize: 12.5,
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
  selectInput: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DFD9D0",
    backgroundColor: "#FCFAF7",
    paddingHorizontal: 9,
  },
  selectText: { flex: 1, minWidth: 0, color: TEXT, fontSize: 12.5 },
  dateInput: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DFD9D0",
    backgroundColor: "#FCFAF7",
  },
  dateTextInput: { flex: 1, minWidth: 0, paddingVertical: 0, color: TEXT, fontSize: 11.5 },
  fieldError: { color: DANGER, fontSize: 11, fontWeight: "500", marginTop: 2 },
  loginSection: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: BACKGROUND,
    padding: 8,
    gap: 6,
  },
  loginToggle: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#B7B0A7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
  },
  checkboxSelected: { borderColor: PRIMARY, backgroundColor: PRIMARY },
  loginTitle: { fontSize: 12, fontWeight: "700", color: TEXT },
  loginHint: { marginTop: 1, fontSize: 10, color: MUTED },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: "#EAE5DC",
    backgroundColor: SURFACE,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1.2,
    borderColor: "rgba(220, 38, 38, 0.55)",
    backgroundColor: SURFACE,
  },
  cancelText: { color: DANGER, fontSize: 12.5, fontWeight: "600" },
  stepBackButton: {
    height: 40,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  stepBackText: { color: PRIMARY, fontSize: 12, fontWeight: "600" },
  saveButton: {
    height: 40,
    minWidth: 132,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: SUCCESS,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    ...Platform.select({
      ios: {
        shadowColor: SUCCESS,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      default: { elevation: 2 },
    }),
  },
  saveText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "600" },
  disabled: { opacity: 0.6 },
  departmentBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 0, 0, 0.45)" },
  departmentSheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  departmentHeader: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  departmentTitle: { color: TEXT, fontSize: 15, fontWeight: "700" },
  departmentOption: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  departmentOptionText: { color: TEXT, fontSize: 14 },
});
