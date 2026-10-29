"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useEmployeeDocuments,
  useUploadDocument,
  useDeleteDocument,
  downloadDocument,
  getDocumentPreviewUrl,
} from "@/services/employee-service";
import {
  DocumentType,
  DocumentTypeLabels,
  type EmployeeResponse,
  type DocumentResponse,
} from "@/types/employee";
import { toast } from "@/components/ui/sonner";
import {
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Loader2,
  FileCheck2,
  AlertCircle,
  FileSignature,
  Eye,
  X,
} from "lucide-react";

interface EmployeeDocumentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeResponse | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MiB per-file limit enforced by the API

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmployeeDocumentsSheet({
  open,
  onOpenChange,
  employee,
}: EmployeeDocumentsSheetProps) {
  const [selectedType, setSelectedType] = useState<DocumentType>(
    DocumentType.Aadhaar
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentResponse | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewContentType, setPreviewContentType] = useState<string | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents = [], isLoading, refetch } = useEmployeeDocuments(
    employee?.id ?? null
  );
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  // Identity-guarded document types: Aadhaar/PAN uploads are only offered when
  // the employee actually stored that number; "Other" is always available.
  const canUploadAadhaar = Boolean(employee?.aadhaarMasked);
  const canUploadPan = Boolean(employee?.panMasked);

  // Keep the selected type pointing at a doc type this employee can provide.
  useEffect(() => {
    if (!employee) return;
    setSelectedType((prev) => {
      if (prev === DocumentType.Aadhaar && !employee.aadhaarMasked) {
        return employee.panMasked ? DocumentType.Pan : DocumentType.Other;
      }
      if (prev === DocumentType.Pan && !employee.panMasked) {
        return employee.aadhaarMasked ? DocumentType.Aadhaar : DocumentType.Other;
      }
      return prev;
    });
  }, [employee]);

  // Load the selected document into the inline preview viewer (auth Bearer, blob URL).
  useEffect(() => {
    if (!previewDoc || !employee) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    setPreviewUrl(null);
    setPreviewContentType(null);
    setPreviewError(null);
    setPreviewLoading(true);

    getDocumentPreviewUrl(employee.id, previewDoc.id)
      .then(({ url, contentType }) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setPreviewUrl(url);
        setPreviewContentType(contentType);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("Failed to load document preview", err);
        setPreviewError(
          err instanceof Error
            ? err.message
            : "Could not load the document preview."
        );
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewDoc, employee]);

  if (!employee) return null;

  const fullName = `${employee.firstName} ${employee.lastName || ""}`.trim();

  const isPreviewPdf = previewContentType?.includes("pdf") ?? false;
  const isPreviewImage = previewContentType?.startsWith("image/") ?? false;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    if (file.size > MAX_FILE_SIZE) {
      const msg = `"${file.name}" exceeds the maximum limit of 5 MB.`;
      setFileError(msg);
      toast.warning("File size limit exceeded", {
        description: msg,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const docTypeLabel = DocumentTypeLabels[selectedType] || "Document";
    try {
      await uploadMutation.mutateAsync({
        employeeId: employee.id,
        documentType: selectedType,
        file,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Document uploaded successfully", {
        description: `${docTypeLabel} (${file.name}) was attached to ${fullName}'s profile.`,
      });
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setFileError(msg);
      toast.error("Upload failed", {
        description: msg,
      });
    }
  };

  const handleDownload = async (doc: DocumentResponse) => {
    setDownloadingId(doc.id);
    toast.info("Preparing download", {
      description: `Downloading ${doc.fileName}...`,
    });
    try {
      await downloadDocument(employee.id, doc.id, doc.fileName);
      toast.success("Download started", {
        description: doc.fileName,
      });
    } catch (err: unknown) {
      console.error("Failed to download file", err);
      const msg = err instanceof Error ? err.message : "Could not retrieve document from server.";
      toast.error("Download failed", {
        description: msg,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    const targetDoc = docToDelete;
    try {
      await deleteMutation.mutateAsync({
        employeeId: employee.id,
        docId: targetDoc.id,
      });
      toast.success("Document deleted", {
        description: `"${targetDoc.fileName}" was removed successfully.`,
      });
      setDocToDelete(null);
      refetch();
    } catch (err: unknown) {
      console.error("Failed to delete document", err);
      const msg = err instanceof Error ? err.message : "Failed to delete document.";
      toast.error("Delete failed", {
        description: msg,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="sm:max-w-md w-full flex flex-col p-0 gap-0"
      >
        {/* Header with Light Pink Theme Color Accent */}
        <SheetHeader className="px-6 py-4.5 border-b border-rose-200/70 dark:border-rose-900/40 bg-gradient-to-r from-rose-50/95 via-pink-50/70 to-rose-50/95 dark:from-rose-950/40 dark:via-pink-950/25 dark:to-rose-950/40 text-foreground flex flex-row items-center justify-between gap-3 space-y-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-white dark:bg-card text-primary border border-rose-200/90 dark:border-rose-900/60 shadow-xs shrink-0">
              <FileSignature className="size-4.5 text-primary stroke-[1.8]" />
            </div>
            <div>
              <SheetTitle className="text-sm sm:text-base font-semibold text-foreground">
                Artisan Documents
              </SheetTitle>
              <SheetDescription asChild>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span className="font-semibold text-foreground">{fullName}</span>
                  <span>•</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-2 bg-background/80 text-foreground border-border/80">
                    {employee.department}
                  </Badge>
                </div>
              </SheetDescription>
            </div>
          </div>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-rose-100/70 dark:hover:bg-rose-900/40 cursor-pointer shrink-0 transition-colors"
            >
              <X className="size-4.5" />
              <span className="sr-only">Close</span>
            </Button>
          </SheetClose>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Upload Box */}
          <div className="rounded-xl border border-dashed border-border/80 bg-background/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <UploadCloud className="size-3.5 text-primary" />
                Upload Compliance Document
              </span>
            </div>

            <div className="space-y-2.5">
              <Field className="space-y-1.5 w-full">
                <FieldLabel className="text-xs font-medium text-muted-foreground">
                  Document Type
                </FieldLabel>
                <Select
                  value={String(selectedType)}
                  onValueChange={(val) =>
                    setSelectedType(Number(val) as DocumentType)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[70]">
                    <SelectGroup>
                      {canUploadAadhaar && (
                        <SelectItem value={String(DocumentType.Aadhaar)}>
                          {DocumentTypeLabels[DocumentType.Aadhaar]}
                        </SelectItem>
                      )}
                      {canUploadPan && (
                        <SelectItem value={String(DocumentType.Pan)}>
                          {DocumentTypeLabels[DocumentType.Pan]}
                        </SelectItem>
                      )}
                      <SelectItem value={String(DocumentType.Other)}>
                        {DocumentTypeLabels[DocumentType.Other]}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {(!canUploadAadhaar || !canUploadPan) && (
                  <p className="text-[11px] text-muted-foreground leading-snug pt-1">
                    {!canUploadAadhaar && !canUploadPan
                      ? "Aadhaar & PAN card uploads require the corresponding number saved on the employee profile."
                      : !canUploadAadhaar
                        ? "Aadhaar card upload requires an Aadhaar number saved on the employee profile."
                        : "PAN card upload requires a PAN number saved on the employee profile."}
                  </p>
                )}
              </Field>

              <div className="pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="document-upload-input"
                  disabled={uploadMutation.isPending}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-sm h-9 cursor-pointer border-primary/25 hover:border-primary/50 text-primary hover:bg-primary/5 shadow-2xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-2" />
                      Uploading File...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="size-3.5 mr-2" />
                      Choose File to Upload
                    </>
                  )}
                </Button>
              </div>
            </div>

            {fileError && (
              <div className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 p-2 rounded-lg">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>

          {/* Document List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Attached Files ({documents.length})
              </h4>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
                <Loader2 className="size-4 animate-spin text-primary" />
                Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-muted/10 p-6 text-center space-y-1">
                <FileCheck2 className="size-8 mx-auto text-muted-foreground/60" />
                <p className="text-xs font-medium text-foreground">
                  No documents found
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Upload Aadhaar, PAN, or employment contract copies above.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const typeLabel =
                    DocumentTypeLabels[doc.documentType] || "Document";
                  const isDownloading = downloadingId === doc.id;
                  const isDeleting = deleteMutation.isPending && docToDelete?.id === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className="group flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card hover:border-primary/20 hover:shadow-2xs transition-all"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 pr-2">
                        <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-foreground truncate block max-w-[190px]">
                              {doc.fileName}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[9px] py-0 px-1.5 h-4 font-normal"
                            >
                              {typeLabel}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <span>{formatFileSize(doc.sizeBytes)}</span>
                            <span>•</span>
                            <span>
                              {new Date(doc.uploadedAt).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              aria-label="Preview document"
                              onClick={() => setPreviewDoc(doc)}
                              disabled={isDownloading || isDeleting}
                            >
                              {isDownloading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Eye className="size-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">Preview document</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                              aria-label="Delete document"
                              onClick={() => setDocToDelete(doc)}
                              disabled={isDownloading || isDeleting}
                            >
                              {isDeleting ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">Delete document</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Document Preview Dialog (reui-style dialog): inline viewing with
          Download & Delete actions available only while previewing */}
      <Dialog
        open={Boolean(previewDoc)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPreviewDoc(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-2xl p-0 gap-0 rounded-2xl border border-border/80 bg-card shadow-2xl z-[70] overflow-hidden"
        >
          {previewDoc && (
            <>
              {/* Header with the same rose theme accent as the sheet */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-gradient-to-r from-rose-50/95 via-pink-50/70 to-rose-50/95 dark:from-rose-950/40 dark:via-pink-950/25 dark:to-rose-950/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle
                      className="text-xs sm:text-sm font-semibold text-foreground truncate leading-tight"
                      title={previewDoc.fileName}
                    >
                      {previewDoc.fileName}
                    </DialogTitle>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <Badge
                        variant="secondary"
                        className="text-[9px] py-0 px-1.5 h-4 font-normal"
                      >
                        {DocumentTypeLabels[previewDoc.documentType] ||
                          "Document"}
                      </Badge>
                      <span>{formatFileSize(previewDoc.sizeBytes)}</span>
                    </div>
                  </div>
                </div>
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                    aria-label="Close preview"
                  >
                    <X className="size-4" />
                  </Button>
                </DialogClose>
              </div>

              {/* Inline Viewer: PDF in an iframe, images via img, other types get a download hint */}
              <div className="h-[60vh] sm:h-[65vh] bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center overflow-hidden">
                {previewLoading && (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    Loading preview...
                  </div>
                )}
                {!previewLoading && previewError && (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs px-6 text-center">
                    <AlertCircle className="size-6 text-destructive" />
                    <p>{previewError}</p>
                  </div>
                )}
                {!previewLoading && !previewError && previewUrl && isPreviewPdf && (
                  <iframe
                    src={previewUrl}
                    title={previewDoc.fileName}
                    className="w-full h-full border-0"
                  />
                )}
                {!previewLoading &&
                  !previewError &&
                  previewUrl &&
                  isPreviewImage && (
                    <img
                      src={previewUrl}
                      alt={previewDoc.fileName}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                {!previewLoading &&
                  !previewError &&
                  previewUrl &&
                  !isPreviewPdf &&
                  !isPreviewImage && (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs text-center px-6">
                      <FileText className="size-6" />
                      <p className="font-medium text-foreground">
                        Inline preview isn&apos;t available for this file type.
                      </p>
                      <p className="text-[10px]">
                        Use the Download button below to open the document.
                      </p>
                    </div>
                  )}
              </div>

              {/* Footer: Download & Delete available while previewing */}
              <DialogFooter className="border-t border-border/60 bg-slate-50 dark:bg-zinc-900/60 px-4 py-2.5 flex flex-row items-center justify-end gap-2">
                <Button
                  variant="outline"
                  className="h-8 px-3.5 rounded-full text-xs font-medium border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer shadow-2xs"
                  onClick={() => handleDownload(previewDoc)}
                  disabled={downloadingId === previewDoc.id}
                >
                  {downloadingId === previewDoc.id ? (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Download className="size-3.5 mr-1.5" />
                  )}
                  Download
                </Button>
                <Button
                  variant="outline"
                  className="h-8 px-3.5 rounded-full text-xs font-semibold cursor-pointer bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/90 dark:bg-rose-950/60 dark:hover:bg-rose-950/90 dark:text-rose-400 dark:border-rose-900/70 shadow-2xs transition-colors"
                  onClick={() => {
                    const target = previewDoc;
                    setPreviewDoc(null);
                    setDocToDelete(target);
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-3.5 mr-1.5" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Deletion Confirmation Dialog - Compact @reui/c-alert-dialog-8 */}
      <AlertDialog
        open={Boolean(docToDelete)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !deleteMutation.isPending) {
            setDocToDelete(null);
          }
        }}
      >
        <AlertDialogContent
          className="w-[calc(100vw-2rem)] sm:w-full max-w-[360px] p-0 gap-0 rounded-2xl border border-border/80 bg-card shadow-2xl z-[70] overflow-hidden"
        >
          {/* Compact Content Body */}
          <div className="p-4 sm:p-4.5 pb-3 sm:pb-3.5 min-w-0">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-9 rounded-full bg-rose-50 text-rose-600 border border-rose-200/90 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/60 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="size-4.5" />
              </div>
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <AlertDialogTitle className="text-sm font-semibold tracking-tight text-foreground leading-snug">
                  Delete document?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground leading-normal mt-0.5">
                  Are you sure you want to permanently delete this file from{" "}
                  <span className="font-semibold text-foreground">{fullName}</span>&apos;s
                  compliance profile?
                </AlertDialogDescription>
              </div>
            </div>

            {/* Compact document preview card */}
            {docToDelete && (
              <div className="mt-2.5 w-full rounded-xl bg-slate-50/80 dark:bg-zinc-900/50 border border-slate-200/90 dark:border-zinc-800 p-2 px-2.5 flex items-center gap-2.5 min-w-0 overflow-hidden">
                <div className="size-7 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                  <FileText className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="font-medium text-foreground text-xs truncate leading-tight"
                    title={docToDelete.fileName}
                  >
                    {docToDelete.fileName}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      {DocumentTypeLabels[docToDelete.documentType] || "Document"}
                    </span>
                    <span>•</span>
                    <span>{formatFileSize(docToDelete.sizeBytes)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Warning notice */}
            <p className="mt-2 text-[11px] font-medium text-destructive leading-tight">
              This action cannot be undone.
            </p>
          </div>

          {/* Full-width Divider & Tinted Footer with Compact Right-Aligned Pill Buttons */}
          <AlertDialogFooter className="border-t border-slate-200/90 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 px-4 py-2.5 flex flex-row items-center justify-end gap-2">
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              className="h-8 px-3 rounded-full text-xs font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors shadow-2xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="h-8 px-3.5 rounded-full text-xs font-semibold cursor-pointer shadow-2xs transition-colors bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/90 dark:bg-rose-950/60 dark:hover:bg-rose-950/90 dark:text-rose-400 dark:border-rose-900/70 flex items-center justify-center gap-1.5"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  Delete File
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
