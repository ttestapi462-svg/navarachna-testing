"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteEmployee } from "@/services/employee-service";
import type { EmployeeResponse } from "@/types/employee";
import { CircleAlertIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";

interface EmployeeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeResponse | null;
}

export function EmployeeDeleteDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeDeleteDialogProps) {
  const deleteMutation = useDeleteEmployee();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!employee) return null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await deleteMutation.mutateAsync(employee.id);
      toast.success("Employee deactivated", {
        description: `${fullName} has been archived successfully.`,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to deactivate employee.";
      setErrorMessage(msg);
      toast.error("Deactivation failed", {
        description: msg,
      });
    }
  };

  const fullName = `${employee.firstName} ${employee.lastName || ""}`.trim();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="w-[calc(100vw-2rem)] sm:w-full max-w-[360px] p-0 gap-0 rounded-2xl shadow-2xl border border-border/80 bg-card overflow-hidden z-[70]"
      >
        {/* Compact Content Body */}
        <div className="flex items-start gap-3 p-4 sm:p-4.5 min-w-0">
          <div className="bg-destructive/10 text-destructive rounded-full flex size-9 shrink-0 items-center justify-center mt-0.5 border border-destructive/20">
            <CircleAlertIcon className="size-4.5" />
          </div>
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <AlertDialogTitle className="text-sm font-semibold tracking-tight text-foreground leading-snug">
              Deactivate employee?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal mt-0.5">
              This will disable account access and remove{" "}
              <span className="font-semibold text-foreground">{fullName}</span>&apos;s
              record from active directory searches.
            </AlertDialogDescription>
            {errorMessage && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-2 text-xs text-destructive font-medium mt-2">
                {errorMessage}
              </div>
            )}
          </div>
        </div>

        {/* Full-width Divider & Tinted Footer with Compact Right-Aligned Pill Buttons */}
        <AlertDialogFooter className="border-t border-slate-200/90 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 px-4 py-2.5 flex flex-row items-center justify-end gap-2">
          <AlertDialogCancel
            disabled={deleteMutation.isPending}
            className="h-8 px-3 rounded-full text-xs font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors shadow-2xs"
          >
            Keep Employee
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="h-8 px-3.5 rounded-full text-xs font-semibold cursor-pointer shadow-2xs transition-colors bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/90 dark:bg-rose-950/60 dark:hover:bg-rose-950/90 dark:text-rose-400 dark:border-rose-900/70"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="size-3 animate-spin mr-1" />
                Deactivating...
              </>
            ) : (
              "Deactivate Anyway"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
