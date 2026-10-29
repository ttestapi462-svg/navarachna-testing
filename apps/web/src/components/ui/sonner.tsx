"use client";

import React from "react";
import {
  Check,
  CircleAlert,
  TriangleAlert,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { toast as sonnerToast, Toaster as Sonner, type ToasterProps } from "sonner";
import { cn } from "@/lib/utils";

export type ToastType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading"
  | "default";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface CustomToastOptions {
  description?: React.ReactNode;
  duration?: number;
  id?: string | number;
  action?: ToastAction;
  cancel?: ToastAction;
  onDismiss?: () => void;
  onAutoClose?: () => void;
}

interface ToastCardProps {
  id: string | number;
  type: ToastType;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastAction;
  cancel?: ToastAction;
}

const toastConfigs: Record<
  ToastType,
  {
    container: string;
    iconBg: string;
    titleColor: string;
    descColor: string;
    closeColor: string;
    actionBtn: string;
    cancelBtn: string;
    icon: React.ReactNode;
  }
> = {
  success: {
    container:
      "bg-emerald-50/95 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/80 shadow-md shadow-emerald-950/5",
    iconBg:
      "bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300/90 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300",
    titleColor: "text-emerald-950 dark:text-emerald-100",
    descColor: "text-emerald-800/90 dark:text-emerald-200/90",
    closeColor:
      "text-emerald-700/60 hover:text-emerald-950 hover:bg-emerald-200/60 dark:text-emerald-300/70 dark:hover:text-emerald-100 dark:hover:bg-emerald-900/60",
    actionBtn: "bg-emerald-600 text-white hover:bg-emerald-700",
    cancelBtn:
      "border-emerald-300 dark:border-emerald-700 bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200/70",
    icon: <Check className="size-3.5 stroke-[2.8]" />,
  },
  error: {
    container:
      "bg-rose-50/95 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700/80 shadow-md shadow-rose-950/5",
    iconBg:
      "bg-rose-100 dark:bg-rose-900/60 border-rose-300/90 dark:border-rose-700 text-rose-700 dark:text-rose-300",
    titleColor: "text-rose-950 dark:text-rose-100",
    descColor: "text-rose-800/90 dark:text-rose-200/90",
    closeColor:
      "text-rose-700/60 hover:text-rose-950 hover:bg-rose-200/60 dark:text-rose-300/70 dark:hover:text-rose-100 dark:hover:bg-rose-900/60",
    actionBtn: "bg-rose-600 text-white hover:bg-rose-700",
    cancelBtn:
      "border-rose-300 dark:border-rose-700 bg-rose-100/60 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 hover:bg-rose-200/70",
    icon: <CircleAlert className="size-3.5 stroke-[2.4]" />,
  },
  warning: {
    container:
      "bg-amber-50/95 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/80 shadow-md shadow-amber-950/5",
    iconBg:
      "bg-amber-100 dark:bg-amber-900/60 border-amber-300/90 dark:border-amber-700 text-amber-800 dark:text-amber-300",
    titleColor: "text-amber-950 dark:text-amber-100",
    descColor: "text-amber-900/90 dark:text-amber-200/90",
    closeColor:
      "text-amber-800/60 hover:text-amber-950 hover:bg-amber-200/60 dark:text-amber-300/70 dark:hover:text-amber-100 dark:hover:bg-amber-900/60",
    actionBtn: "bg-amber-600 text-white hover:bg-amber-700",
    cancelBtn:
      "border-amber-300 dark:border-amber-700 bg-amber-100/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 hover:bg-amber-200/70",
    icon: <TriangleAlert className="size-3.5 stroke-[2.4]" />,
  },
  info: {
    container:
      "bg-blue-50/95 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700/80 shadow-md shadow-blue-950/5",
    iconBg:
      "bg-blue-100 dark:bg-blue-900/60 border-blue-300/90 dark:border-blue-700 text-blue-700 dark:text-blue-300",
    titleColor: "text-blue-950 dark:text-blue-100",
    descColor: "text-blue-800/90 dark:text-blue-200/90",
    closeColor:
      "text-blue-700/60 hover:text-blue-950 hover:bg-blue-200/60 dark:text-blue-300/70 dark:hover:text-blue-100 dark:hover:bg-blue-900/60",
    actionBtn: "bg-blue-600 text-white hover:bg-blue-700",
    cancelBtn:
      "border-blue-300 dark:border-blue-700 bg-blue-100/60 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 hover:bg-blue-200/70",
    icon: <Info className="size-3.5 stroke-[2.4]" />,
  },
  loading: {
    container:
      "bg-card/95 border-border shadow-md",
    iconBg:
      "bg-primary/10 border-primary/20 text-primary",
    titleColor: "text-foreground",
    descColor: "text-muted-foreground",
    closeColor:
      "text-muted-foreground/60 hover:text-foreground hover:bg-muted",
    actionBtn: "bg-primary text-primary-foreground hover:bg-primary/90",
    cancelBtn: "border-border bg-background text-foreground hover:bg-muted",
    icon: <Loader2 className="size-3.5 animate-spin stroke-[2.4]" />,
  },
  default: {
    container:
      "bg-card/95 border-border shadow-md",
    iconBg:
      "bg-muted border-border/80 text-foreground",
    titleColor: "text-foreground",
    descColor: "text-muted-foreground",
    closeColor:
      "text-muted-foreground/60 hover:text-foreground hover:bg-muted",
    actionBtn: "bg-primary text-primary-foreground hover:bg-primary/90",
    cancelBtn: "border-border bg-background text-foreground hover:bg-muted",
    icon: <Info className="size-3.5 stroke-[2.4]" />,
  },
};

function ToastCard({
  id,
  type,
  title,
  description,
  action,
  cancel,
}: ToastCardProps) {
  const config = toastConfigs[type] || toastConfigs.default;

  return (
    <div
      role="alert"
      className={cn(
        "group relative w-full sm:w-[330px] max-w-[calc(100vw-2rem)]",
        "rounded-xl border p-2.5 sm:px-3 sm:py-2.5",
        "flex items-start gap-2.5 transition-all select-none",
        config.container
      )}
    >
      {/* Compact Action Icon Badge */}
      <div
        className={cn(
          "size-6.5 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs mt-0.5",
          config.iconBg
        )}
      >
        {config.icon}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pr-4">
        <h5
          className={cn(
            "text-xs font-semibold tracking-tight leading-snug",
            config.titleColor
          )}
        >
          {title}
        </h5>

        {description && (
          <p
            className={cn(
              "text-[11px] leading-tight mt-0.5 font-normal break-words",
              config.descColor
            )}
          >
            {description}
          </p>
        )}

        {(action || cancel) && (
          <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t border-current/15">
            {action && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  sonnerToast.dismiss(id);
                }}
                className={cn(
                  "inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-semibold rounded-md transition-colors shadow-2xs cursor-pointer",
                  config.actionBtn
                )}
              >
                {action.label}
              </button>
            )}
            {cancel && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (cancel.onClick) cancel.onClick();
                  sonnerToast.dismiss(id);
                }}
                className={cn(
                  "inline-flex items-center justify-center h-6 px-2 text-[11px] font-medium rounded-md border transition-colors cursor-pointer",
                  config.cancelBtn
                )}
              >
                {cancel.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Discrete Integrated Close Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          sonnerToast.dismiss(id);
        }}
        aria-label="Close notification"
        className={cn(
          "absolute top-2 right-2 size-5 rounded-md flex items-center justify-center transition-colors cursor-pointer",
          config.closeColor
        )}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function createCustomToast(
  type: ToastType,
  message: React.ReactNode,
  options?: CustomToastOptions
) {
  const duration =
    options?.duration ?? (type === "error" ? 5000 : type === "warning" ? 4500 : 3500);

  return sonnerToast.custom(
    (id) => (
      <ToastCard
        id={id}
        type={type}
        title={message}
        description={options?.description}
        action={options?.action}
        cancel={options?.cancel}
      />
    ),
    {
      id: options?.id,
      duration,
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose,
    }
  );
}

export const toast = Object.assign(
  (message: React.ReactNode, options?: CustomToastOptions) =>
    createCustomToast("default", message, options),
  {
    success: (message: React.ReactNode, options?: CustomToastOptions) =>
      createCustomToast("success", message, options),
    error: (message: React.ReactNode, options?: CustomToastOptions) =>
      createCustomToast("error", message, options),
    warning: (message: React.ReactNode, options?: CustomToastOptions) =>
      createCustomToast("warning", message, options),
    info: (message: React.ReactNode, options?: CustomToastOptions) =>
      createCustomToast("info", message, options),
    loading: (message: React.ReactNode, options?: CustomToastOptions) =>
      createCustomToast("loading", message, options),
    dismiss: sonnerToast.dismiss,
    custom: sonnerToast.custom,
    promise: sonnerToast.promise,
  }
);

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      closeButton={false}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-transparent group-[.toaster]:border-0 group-[.toaster]:p-0 group-[.toaster]:shadow-none",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
