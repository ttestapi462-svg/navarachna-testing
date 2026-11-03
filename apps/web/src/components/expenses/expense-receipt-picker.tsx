"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Eye, FileImage, FileText, LoaderCircle, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { cleanStoredReceiptName } from "@/components/expenses/expense-ui-utils";

const MAX_BILL_SIZE = 5 * 1024 * 1024;
const ACCEPTED_BILL_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateMiddle(name: string, maxLen = 22) {
  if (!name || name.length <= maxLen) return name;
  const extIndex = name.lastIndexOf(".");
  const ext = extIndex !== -1 ? name.slice(extIndex) : "";
  const nameWithoutExt = extIndex !== -1 ? name.slice(0, extIndex) : name;
  const keepFront = Math.max(4, maxLen - ext.length - 3);
  return `${nameWithoutExt.slice(0, keepFront)}…${ext}`;
}

export function ExpenseReceiptPicker({
  existingFileName,
  value,
  onChange,
  onPreviewExisting,
  required,
  error,
}: {
  existingFileName?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  onPreviewExisting?: () => Promise<{ url: string; contentType: string; fileName: string } | null>;
  required: boolean;
  error?: string;
}) {
  const [localError, setLocalError] = useState("");
  const [preview, setPreview] = useState<{ url: string; contentType: string; fileName: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    };
  }, [preview?.url]);

  const validateAndSet = (file: File | null, inputEl: HTMLInputElement | null) => {
    setLocalError("");
    if (file) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      if (!ACCEPTED_BILL_EXTENSIONS.includes(extension) || !file.type.startsWith("image/")) {
        const message = "Choose a JPG, PNG or WEBP image.";
        setLocalError(message);
        toast.warning("Unsupported file type", { description: message });
        if (inputEl) inputEl.value = "";
        onChange(null);
        return;
      }
      if (file.size > MAX_BILL_SIZE) {
        const message = "The image must be 5 MB or smaller.";
        setLocalError(message);
        toast.warning("File size limit exceeded", { description: message });
        if (inputEl) inputEl.value = "";
        onChange(null);
        return;
      }
    }
    onChange(file);
  };

  const handleCameraChange = (event: ChangeEvent<HTMLInputElement>) => {
    validateAndSet(event.target.files?.[0] ?? null, event.target);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    validateAndSet(event.target.files?.[0] ?? null, event.target);
  };

  const hasFile = Boolean(value || existingFileName);
  const activeFileName = cleanStoredReceiptName(value?.name || existingFileName || "");
  const isPdf = activeFileName.toLowerCase().endsWith(".pdf");
  const hasPickerError = Boolean(localError || error);

  const handleView = async () => {
    if (value) {
      setPreview({
        url: URL.createObjectURL(value),
        contentType: value.type || "image/*",
        fileName: activeFileName,
      });
    } else if (onPreviewExisting) {
      setPreviewLoading(true);
      try {
        const existingPreview = await onPreviewExisting();
        if (existingPreview) setPreview(existingPreview);
      } catch (previewError) {
        toast.error("Unable to preview receipt", {
          description: previewError instanceof Error ? previewError.message : "Please try again.",
        });
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const handleRemove = () => {
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLocalError("");
    onChange(null);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        Bill / receipt {required ? <span className="text-primary">*</span> : null}
      </label>

      {/* Hidden inputs for camera and file picker */}
      <input
        ref={cameraInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleCameraChange}
        className="sr-only"
      />
      {hasFile ? (
        <div className={`flex items-center justify-between gap-2 rounded-[12px] border bg-card p-2.5 ${hasPickerError ? "border-destructive ring-2 ring-destructive/20" : "border-border"}`}>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {isPdf ? <FileText className="size-4.5" /> : <FileImage className="size-4.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground" title={activeFileName}>
                {truncateMiddle(activeFileName, 34)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {value ? formatFileSize(value.size) : "Attached receipt"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void handleView()}
              disabled={previewLoading}
              aria-label="View uploaded photo"
              title="View uploaded photo"
              className="flex size-8 items-center justify-center rounded-lg text-primary hover:bg-primary/10 disabled:opacity-50"
            >
              {previewLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
            </button>
            {value ? (
              <button
                type="button"
                aria-label="Delete uploaded photo"
                title="Delete uploaded photo"
                onClick={handleRemove}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                <UploadCloud className="size-3.5" /> Replace
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            aria-invalid={hasPickerError}
            className={`flex h-10 items-center justify-center gap-2 rounded-[12px] border border-dashed bg-muted/25 px-3 text-xs font-semibold text-foreground transition sm:hidden ${hasPickerError ? "border-destructive ring-2 ring-destructive/20" : "border-border hover:border-primary/60 hover:bg-primary/[0.035] focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
          >
            <FileImage className="size-4 text-primary" /> Take photo
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-invalid={hasPickerError}
            className={`col-span-1 flex h-10 items-center justify-center gap-2 rounded-[12px] border border-dashed bg-muted/25 px-3 text-xs font-semibold text-foreground transition sm:col-span-2 ${hasPickerError ? "border-destructive ring-2 ring-destructive/20" : "border-border hover:border-primary/60 hover:bg-primary/[0.035] focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
          >
            <UploadCloud className="size-4 text-primary" /> Upload a photo
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        name="bill"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        aria-required={required}
        onChange={handleFileChange}
        className="sr-only"
      />

      {preview ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
          <section role="dialog" aria-modal="true" aria-label={`Preview ${preview.fileName}`} className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rose-200/70 bg-gradient-to-r from-rose-50/95 via-pink-50/70 to-rose-50/95 px-3 py-2.5 dark:border-rose-900/40 dark:from-rose-950/40 dark:via-pink-950/25 dark:to-rose-950/40">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground" title={preview.fileName}>{preview.fileName}</p>
              </div>
              <button type="button" onClick={() => setPreview(null)} aria-label="Close receipt preview" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-rose-200/90 bg-white text-muted-foreground transition hover:bg-rose-100/70 hover:text-foreground dark:border-rose-900/60 dark:bg-card dark:hover:bg-rose-900/40">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 overflow-auto bg-muted/20 p-2.5 sm:p-3">
              {preview.contentType.startsWith("image/") ? (
                <img src={preview.url} alt={`Preview of ${preview.fileName}`} className="mx-auto max-h-[70dvh] w-full object-contain" />
              ) : preview.contentType.includes("pdf") || preview.fileName.toLowerCase().endsWith(".pdf") ? (
                <iframe src={preview.url} title={`Preview of ${preview.fileName}`} className="h-[70dvh] w-full rounded-lg bg-white" />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">Preview is not available for this file type.</p>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {localError || error ? <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{localError || error}</p> : null}
    </div>
  );
}
