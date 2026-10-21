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
      <AlertDialogContent className="sm:max-w-md">
        <div className="flex items-start gap-3 py-1">
          <div className="bg-destructive/10 dark:bg-destructive/10 rounded-full flex size-10 shrink-0 items-center justify-center">
            <CircleAlertIcon className="text-destructive size-5" />
          </div>
          <div className="flex flex-col justify-center gap-1">
            <AlertDialogTitle className="text-sm font-semibold">
              Deactivate employee?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Are you sure you want to deactivate{" "}
              <span className="font-semibold text-foreground">{fullName}</span> (
              <span className="font-mono text-primary font-medium">
                {employee.employeeCode}
              </span>
              )? This will disable their account and archive their profile from
              active studio operations.
            </AlertDialogDescription>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
            {errorMessage}
          </div>
        )}

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Keep Employee
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="cursor-pointer"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
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
