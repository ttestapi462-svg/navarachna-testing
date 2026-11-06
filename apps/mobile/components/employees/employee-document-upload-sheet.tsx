import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { Check, FileImage, FileText, FileUp, X } from "lucide-react-native";
import { notifyMobile } from "../../lib/notifications";
import {
  uploadEmployeeDocumentApi,
  getEmployeeDocumentFileName,
  type EmployeeDocument,
  type EmployeeDocumentType,
  type EmployeeRecord,
} from "../../lib/employee-api";

const PRIMARY = "#78070D";
const BACKGROUND = "#FAF7F2";
const SURFACE = "#FFFFFF";
const BORDER = "#E8E2D8";
const TEXT = "#231E1C";
const MUTED = "#6E6862";
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

interface Props {
  visible: boolean;
  employee: EmployeeRecord;
  onClose: () => void;
  onUploaded: (document: EmployeeDocument) => void;
}

function formatFileSize(bytes?: number | null) {
  if (bytes == null) return "Size unavailable";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmployeeDocumentUploadSheet({ visible, employee, onClose, onUploaded }: Props) {
  const insets = useSafeAreaInsets();
  const employeeName = `${employee.firstName} ${employee.lastName || ""}`.trim();
  const documentTypes = useMemo(() => {
    const options: { type: EmployeeDocumentType; label: string; detail: string }[] = [];
    if (employee.aadhaarMasked || employee.aadhaarNumber) {
      options.push({ type: 1, label: "Aadhaar card", detail: "Identity document" });
    }
    if (employee.panMasked || employee.panNumber) {
      options.push({ type: 2, label: "PAN card", detail: "Tax identity document" });
    }
    options.push({ type: 3, label: "Other document", detail: "Contract or supporting file" });
    return options;
  }, [employee.aadhaarMasked, employee.aadhaarNumber, employee.panMasked, employee.panNumber]);

  const [selectedType, setSelectedType] = useState<EmployeeDocumentType | null>(null);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [pickingFile, setPickingFile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelectedFile(null);
    setError(null);
    setSelectedType(null);
  }, [visible, documentTypes]);

  const chooseFile = async () => {
    if (pickingFile || uploading) return;
    setError(null);
    setPickingFile(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;
      if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) {
        setSelectedFile(null);
        setError("Choose a PDF, JPG, JPEG, or PNG file.");
        return;
      }
      if (file.size != null && file.size > MAX_DOCUMENT_SIZE) {
        setSelectedFile(null);
        setError("This file is larger than the 5 MB limit. Choose a smaller file.");
        return;
      }
      setSelectedFile(file);
    } catch (pickerError) {
      const message = pickerError instanceof Error ? pickerError.message : String(pickerError);
      console.error("[EmployeeDocumentUploadSheet] Document picker failed:", pickerError);

      if (/ExpoDocumentPicker|ExpoFileSystem|FileSystemModuleNotFound|file system module|native module/i.test(message)) {
        setError("The file picker is missing from this installed app build. Rebuild and reinstall the mobile app, then try again.");
      } else {
        setError("Could not open the file picker. Please try again.");
      }
    } finally {
      setPickingFile(false);
    }
  };

  const upload = async () => {
    if (!selectedFile || !selectedType || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const savedDocument = await uploadEmployeeDocumentApi(employee.id, selectedType, selectedFile);
      onUploaded(savedDocument);
      const displayName = getEmployeeDocumentFileName(selectedType, savedDocument.fileName || selectedFile.name);
      notifyMobile("success", `${displayName} was added to ${employeeName}'s profile.`, "Document uploaded");
      onClose();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Could not upload this document.";
      setError(message);
      // The API client already reports request and network errors in the app notification surface.
    } finally {
      setUploading(false);
    }
  };

  const fileIsPdf = selectedFile?.name.toLowerCase().endsWith(".pdf") ?? false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => { if (!uploading) onClose(); }}
    >
      <View style={[styles.backdrop, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (!uploading) onClose(); }} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Upload document</Text>
              <Text style={styles.subtitle} numberOfLines={1}>Add a file to {employeeName}’s profile</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel="Close document upload"
            >
              <X size={17} color={MUTED} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Document type</Text>
              <View style={styles.typeList}>
                {documentTypes.map((option) => {
                  const selected = selectedType === option.type;
                  return (
                    <TouchableOpacity
                      key={option.type}
                      style={[styles.typeOption, selected && styles.typeOptionSelected]}
                      onPress={() => setSelectedType(option.type)}
                      disabled={uploading}
                      activeOpacity={0.72}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                    >
                      <View style={[styles.typeIcon, selected && styles.typeIconSelected]}>
                        <FileText size={16} color={PRIMARY} />
                      </View>
                      <View style={styles.typeCopy}>
                        <Text style={styles.typeName}>{option.label}</Text>
                        <Text style={styles.typeDetail}>{option.detail}</Text>
                      </View>
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected ? <Check size={11} color={SURFACE} strokeWidth={3} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {(!employee.aadhaarMasked && !employee.aadhaarNumber) || (!employee.panMasked && !employee.panNumber) ? (
                <Text style={styles.helperText}>
                  PAN or Aadhaar uploads require that number to be saved on the employee profile.
                </Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>File</Text>
              {selectedFile ? (
                <View style={styles.selectedFile}>
                  <View style={styles.fileIcon}>
                    {fileIsPdf ? <FileText size={18} color={PRIMARY} /> : <FileImage size={18} color={PRIMARY} />}
                  </View>
                  <View style={styles.fileCopy}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {selectedType ? getEmployeeDocumentFileName(selectedType, selectedFile.name) : selectedFile.name}
                    </Text>
                    <Text style={styles.fileMeta}>{formatFileSize(selectedFile.size)} · Ready to upload</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeFileButton}
                    onPress={() => void chooseFile()}
                    disabled={uploading || pickingFile}
                    accessibilityRole="button"
                    accessibilityLabel="Change selected file"
                  >
                    <Text style={styles.changeFileText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.filePicker}
                  onPress={() => void chooseFile()}
                  disabled={uploading || pickingFile}
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  accessibilityLabel="Choose a document file"
                >
                  <View style={styles.filePickerIcon}><FileUp size={19} color={PRIMARY} /></View>
                  <Text style={styles.filePickerTitle}>Choose a file</Text>
                  <Text style={styles.filePickerHint}>PDF, JPG, or PNG · Up to 5 MB</Text>
                </TouchableOpacity>
              )}
            </View>

            {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={uploading} activeOpacity={0.72} accessibilityRole="button">
              <X size={14} color={PRIMARY} strokeWidth={2.4} />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.uploadButton, (!selectedFile || !selectedType || uploading) && styles.uploadButtonDisabled]}
              onPress={() => void upload()}
              disabled={!selectedFile || !selectedType || uploading}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              {uploading ? <ActivityIndicator size="small" color={SURFACE} /> : <FileUp size={15} color={SURFACE} />}
              <Text style={styles.uploadButtonText}>{uploading ? "Uploading…" : "Upload document"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 12, backgroundColor: "rgba(35,30,28,0.4)" },
  sheet: { maxHeight: "92%", borderRadius: 22, borderWidth: 1, borderColor: BORDER, backgroundColor: BACKGROUND, overflow: "hidden" },
  handle: { alignSelf: "center", width: 34, height: 4, borderRadius: 2, backgroundColor: "#D8D0C6", marginTop: 9 },
  header: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: PRIMARY, fontSize: 16, fontWeight: "700" },
  subtitle: { color: MUTED, fontSize: 11.5, marginTop: 3 },
  closeButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  body: { padding: 12, gap: 9 },
  section: { gap: 7 },
  sectionLabel: { color: TEXT, fontSize: 12.5, fontWeight: "700" },
  typeList: { gap: 6 },
  typeOption: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  typeOptionSelected: { borderColor: "#D8AEB1", backgroundColor: "#FBF2F3" },
  typeIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: BACKGROUND, alignItems: "center", justifyContent: "center" },
  typeIconSelected: { backgroundColor: "#F5E5E6" },
  typeCopy: { flex: 1, minWidth: 0 },
  typeName: { color: TEXT, fontSize: 12.5, fontWeight: "600" },
  typeDetail: { color: MUTED, fontSize: 10.5, marginTop: 2 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: "#C9C1B8", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: PRIMARY, backgroundColor: PRIMARY },
  helperText: { color: MUTED, fontSize: 10.5, lineHeight: 15 },
  filePicker: { minHeight: 88, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: "#D8C8C5", backgroundColor: SURFACE },
  filePickerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FBF2F3", alignItems: "center", justifyContent: "center", marginBottom: 7 },
  filePickerTitle: { color: TEXT, fontSize: 12.5, fontWeight: "600" },
  filePickerHint: { color: MUTED, fontSize: 10.5, marginTop: 3 },
  selectedFile: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE },
  fileIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FBF2F3", alignItems: "center", justifyContent: "center" },
  fileCopy: { flex: 1, minWidth: 0 },
  fileName: { color: TEXT, fontSize: 11.5, fontWeight: "600" },
  fileMeta: { color: MUTED, fontSize: 10, marginTop: 3 },
  changeFileButton: { paddingHorizontal: 8, paddingVertical: 6 },
  changeFileText: { color: PRIMARY, fontSize: 11, fontWeight: "700" },
  errorText: { color: "#B42318", fontSize: 11, lineHeight: 15 },
  footer: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: SURFACE },
  cancelButton: { height: 42, minWidth: 102, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: "#E8C6C8", backgroundColor: SURFACE },
  cancelText: { color: PRIMARY, fontSize: 12, fontWeight: "700" },
  uploadButton: { flex: 1, height: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12, borderRadius: 14, backgroundColor: PRIMARY },
  uploadButtonDisabled: { opacity: 0.45 },
  uploadButtonText: { color: SURFACE, fontSize: 12, fontWeight: "700" },
});
