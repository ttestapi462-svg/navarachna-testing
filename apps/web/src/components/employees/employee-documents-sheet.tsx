"use client";

import { useState, useRef } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/services/employee-service";
import {
  DocumentType,
  DocumentTypeLabels,
  type EmployeeResponse,
  type DocumentResponse,
} from "@/types/employee";
import {
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Loader2,
  FileCheck2,
  AlertCircle,
  FileSignature,
  X,
} from "lucide-react";

interface EmployeeDocumentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeResponse | null;
}

const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB limit from .NET [RequestSizeLimit]

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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents = [], isLoading, refetch } = useEmployeeDocuments(
    employee?.id ?? null
  );
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  if (!employee) return null;

  const fullName = `${employee.firstName} ${employee.lastName || ""}`.trim();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File exceeds the maximum limit of 6 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        employeeId: employee.id,
        documentType: selectedType,
        file,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setFileError(msg);
    }
  };

  const handleDownload = async (doc: DocumentResponse) => {
    setDownloadingId(doc.id);
    try {
      await downloadDocument(employee.id, doc.id, doc.fileName);
    } catch (err) {
      console.error("Failed to download file", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (docId: number) => {
    setDeletingId(docId);
    try {
      await deleteMutation.mutateAsync({
        employeeId: employee.id,
        docId,
      });
      refetch();
    } catch (err) {
      console.error("Failed to delete document", err);
    } finally {
      setDeletingId(null);
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
              <span className="text-[10px] text-muted-foreground">Max 6MB</span>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Document Type
                </label>
                <Select
                  value={String(selectedType)}
                  onValueChange={(val) =>
                    setSelectedType(Number(val) as DocumentType)
                  }
                >
                  <SelectTrigger className="w-full h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(DocumentType.Aadhaar)}>
                      {DocumentTypeLabels[DocumentType.Aadhaar]}
                    </SelectItem>
                    <SelectItem value={String(DocumentType.Pan)}>
                      {DocumentTypeLabels[DocumentType.Pan]}
                    </SelectItem>
                    <SelectItem value={String(DocumentType.Other)}>
                      {DocumentTypeLabels[DocumentType.Other]}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                  const isDeleting = deletingId === doc.id;

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
                              aria-label="Download document"
                              onClick={() => handleDownload(doc)}
                              disabled={isDownloading || isDeleting}
                            >
                              {isDownloading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Download className="size-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">Download document</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                              aria-label="Delete document"
                              onClick={() => handleDelete(doc.id)}
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
    </Sheet>
  );
}
