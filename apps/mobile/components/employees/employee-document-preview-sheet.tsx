import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File as ExpoFile, Paths } from "expo-file-system";
import { Asset, requestPermissionsAsync } from "expo-media-library";
import { ArrowDownToLine, ChevronLeft, FileText, X } from "lucide-react-native";
import * as Sharing from "expo-sharing";
import { WebView } from "react-native-webview";
import { createPdfPreviewHtml } from "../../lib/pdf-preview";
import { downloadEmployeeDocumentApi, getEmployeeDocumentFileName, type EmployeeDocument } from "../../lib/employee-api";
import { notifyMobile } from "../../lib/notifications";

const PRIMARY = "#78070D";
const BACKGROUND = "#FAF7F2";
const SURFACE = "#FFFFFF";
const BORDER = "#E8E2D8";
const TEXT = "#231E1C";
const MUTED = "#6E6862";

function mimeFromFileName(fileName: string) {
  const extension = fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

interface Props {
  visible: boolean;
  employeeId: number;
  document: EmployeeDocument | null;
  onClose: () => void;
}

export function EmployeeDocumentPreviewSheet({ visible, employeeId, document, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUri, setDownloadUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("application/octet-stream");
  const [isPdf, setIsPdf] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileName = document ? getEmployeeDocumentFileName(document.documentType, document.fileName) : "Document";

  useEffect(() => {
    if (!visible || !document) return;

    const request = new AbortController();
    requestRef.current = request;
    setPreviewUrl(null);
    setDownloadUri(null);
    setMimeType("application/octet-stream");
    setIsPdf(false);
    setPdfBase64(null);
    setPdfImage(null);
    setError("");
    setLoading(true);

    const loadPreview = async () => {
      try {
        const response = await downloadEmployeeDocumentApi(employeeId, document.id, request.signal);
        const filename = getEmployeeDocumentFileName(document.documentType, document.fileName);
        const responseType = response.headers.get("content-type") || document.contentType;
        const pdf = responseType.toLowerCase().includes("application/pdf") || filename.toLowerCase().endsWith(".pdf");
        const contentType = pdf
          ? "application/pdf"
          : responseType.toLowerCase() === "application/octet-stream"
            ? mimeFromFileName(filename)
            : responseType;
        const bytes = await response.arrayBuffer();
        if (request.signal.aborted) return;

        setIsPdf(pdf);
        setMimeType(contentType);
        if (Platform.OS === "web") {
          const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
          objectUrlRef.current = url;
          setPreviewUrl(url);
          setDownloadUri(url);
        } else {
          const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
          const cachedFile = new ExpoFile(Paths.cache, `employee-${employeeId}-${document.id}-${Date.now()}-${safeFilename}`);
          await cachedFile.write(new Uint8Array(bytes));
          if (request.signal.aborted) return;
          setDownloadUri(cachedFile.uri);
          if (pdf) {
            const view = new Uint8Array(bytes);
            let binary = "";
            const chunkSize = 0x8000;
            for (let offset = 0; offset < view.length; offset += chunkSize) {
              binary += String.fromCharCode(...view.subarray(offset, offset + chunkSize));
            }
            setPdfBase64(btoa(binary));
          } else {
            setPreviewUrl(cachedFile.uri);
          }
        }
      } catch (previewError) {
        if (!request.signal.aborted) {
          setError(previewError instanceof Error ? previewError.message : "Unable to load this document.");
        }
      } finally {
        if (!request.signal.aborted) setLoading(false);
      }
    };

    void loadPreview();
    return () => {
      request.abort();
      if (requestRef.current === request) requestRef.current = null;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [visible, employeeId, document?.id, document?.fileName, document?.documentType, document?.contentType]);

  const downloadDocument = async () => {
    if (!document || !downloadUri || downloading) return;
    setDownloading(true);
    try {
      if (Platform.OS === "web") {
        const link = globalThis.document.createElement("a");
        link.href = downloadUri;
        link.download = fileName;
        link.style.display = "none";
        globalThis.document.body.appendChild(link);
        link.click();
        link.remove();
        notifyMobile("success", `${fileName} downloaded.`, "Download complete");
        return;
      }

      const safeFilename = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const cachedFile = new ExpoFile(downloadUri);
      const bytes = await cachedFile.bytes();

      if (!isPdf) {
        const permission = await requestPermissionsAsync(true, ["photo"]);
        if (!permission.granted) throw new Error("Allow photo access to save this image to your gallery.");
        const galleryFile = new ExpoFile(Paths.cache, safeFilename);
        galleryFile.create({ overwrite: true });
        await galleryFile.write(bytes);
        await Asset.create(galleryFile.uri);
        notifyMobile("success", `${fileName} saved to your gallery.`, "Saved to Gallery");
        return;
      }

      const savedFile = new ExpoFile(Paths.document, safeFilename);
      savedFile.create({ overwrite: true });
      await savedFile.write(bytes);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) throw new Error("File sharing is not available on this device.");
      await Sharing.shareAsync(savedFile.uri, { mimeType, dialogTitle: fileName });
      notifyMobile("success", `${fileName} is saved in the app and ready to export to Files or Downloads.`, "PDF saved");
    } catch (downloadError) {
      Alert.alert(
        "Download failed",
        downloadError instanceof Error ? downloadError.message : "Unable to download this document.",
      );
    } finally {
      setDownloading(false);
    }
  };

  const close = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setDownloadUri(null);
    setIsPdf(false);
    setPdfBase64(null);
    setPdfImage(null);
    setLoading(false);
    setError("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close document preview"
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handleRow}><View style={styles.handle} /></View>
          <View style={styles.header}>
            <View style={styles.headingRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={close}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Back to employee profile"
              >
                <ChevronLeft size={20} color={PRIMARY} />
              </TouchableOpacity>
              <View style={styles.headingCopy}>
                <Text style={styles.title} numberOfLines={1}>{fileName}</Text>
                <Text style={styles.subtitle}>Document preview</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => void downloadDocument()}
                disabled={!downloadUri || downloading || loading}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={isPdf ? `Save ${fileName}` : `Save ${fileName} to gallery`}
              >
                {downloading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ArrowDownToLine size={15} color="#FFFFFF" />}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={close}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close document preview"
              >
                <X size={17} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.body}>
            {loading ? (
              <View style={styles.message}>
                <ActivityIndicator size="large" color={PRIMARY} />
                <Text style={styles.messageText}>Loading document…</Text>
              </View>
            ) : error ? (
              <View style={styles.message}>
                <FileText size={34} color={MUTED} />
                <Text style={styles.messageText}>{error}</Text>
              </View>
            ) : isPdf && pdfBase64 && Platform.OS !== "web" ? (
              <>
                {pdfImage ? (
                  <Image source={{ uri: pdfImage }} style={styles.previewImage} resizeMode="contain" />
                ) : (
                  <View style={styles.message}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                    <Text style={styles.messageText}>Preparing PDF preview…</Text>
                  </View>
                )}
                <WebView
                  source={{ html: createPdfPreviewHtml(pdfBase64) }}
                  originWhitelist={["*"]}
                  javaScriptEnabled
                  style={styles.pdfRenderWorker}
                  onMessage={(event: any) => {
                    const value = event.nativeEvent.data;
                    if (value.startsWith("data:image/png;base64,")) setPdfImage(value);
                    else setError("Unable to render this PDF document.");
                  }}
                  onError={() => setError("Unable to render this PDF document.")}
                />
              </>
            ) : isPdf && previewUrl && Platform.OS === "web" ? (
              <iframe src={previewUrl} style={styles.pdfFrame} title={fileName} />
            ) : previewUrl ? (
              <Image source={{ uri: previewUrl }} style={styles.previewImage} resizeMode="contain" />
            ) : (
              <View style={styles.message}>
                <FileText size={34} color={MUTED} />
                <Text style={styles.messageText}>Document preview is unavailable.</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 0, 0, 0.48)" },
  sheet: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  handleRow: { alignItems: "center", paddingTop: 7, paddingBottom: 5 },
  handle: { width: 40, height: 4.5, borderRadius: 2.5, backgroundColor: "#D4CEC6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EAE5DC",
  },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  headingCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FBF2F3",
    borderWidth: 1,
    borderColor: "rgba(120, 7, 13, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16.5, fontWeight: "700", color: TEXT, letterSpacing: -0.3 },
  subtitle: { fontSize: 11.5, color: MUTED, marginTop: 1.5 },
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
  downloadButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
  },
  body: { padding: 14, minHeight: 250, alignItems: "center", justifyContent: "center" },
  previewImage: { width: "100%", height: 380, borderRadius: 12 },
  message: { width: "100%", minHeight: 250, alignItems: "center", justifyContent: "center", padding: 30, gap: 10 },
  messageText: { color: MUTED, fontSize: 12, textAlign: "center" },
  pdfFrame: { width: "100%", height: 390, borderWidth: 0, borderRadius: 12 },
  pdfRenderWorker: { position: "absolute", width: 2, height: 2, opacity: 0.01, left: 0, top: 0 },
});
