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
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to deactivate employee.";
      setErrorMessage(msg);
    }
  };

  const fullName = `${employee.firstName} ${employee.lastName || ""}`.trim();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        size="sm"
        className="max-w-[360px] sm:max-w-[380px] p-4.5 gap-3.5 rounded-2xl shadow-xl border-border/60"
      >
        <div className="flex items-start gap-3">
          <div className="bg-destructive/10 dark:bg-destructive/10 rounded-full flex size-8 shrink-0 items-center justify-center mt-0.5">
            <CircleAlertIcon className="text-destructive size-4" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <AlertDialogTitle className="text-sm font-semibold tracking-tight text-foreground">
              Deactivate employee?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">
              Are you sure you want to deactivate{" "}
              <span className="font-semibold text-foreground">{fullName}</span>? This will disable their account and archive their profile.
            </AlertDialogDescription>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-md bg-destructive/10 p-2 text-[11px] text-destructive font-medium">
            {errorMessage}
          </div>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-2 pt-0.5">
          <AlertDialogCancel
            size="sm"
            disabled={deleteMutation.isPending}
            className="h-8 px-3 text-xs"
          >
            Keep Employee
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="h-8 px-3 text-xs cursor-pointer"
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
