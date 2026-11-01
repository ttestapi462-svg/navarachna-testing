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
import { useRemoveEmployeeLogin } from "@/services/employee-service";
import type { EmployeeResponse } from "@/types/employee";
import { ShieldOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";

interface EmployeeRemoveLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeResponse | null;
}

export function EmployeeRemoveLoginDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeRemoveLoginDialogProps) {
  const removeLoginMutation = useRemoveEmployeeLogin();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!employee) return null;

  const fullName = `${employee.firstName} ${employee.lastName || ""}`.trim();

  const handleRemoveLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await removeLoginMutation.mutateAsync(employee.id);
      toast.success("Login access removed", {
        description: `${fullName}'s login credentials have been revoked.`,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to remove login access.";
      setErrorMessage(msg);
      toast.error("Failed to remove login", {
        description: msg,
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="w-[calc(100vw-2rem)] sm:w-full max-w-[360px] p-0 gap-0 rounded-2xl shadow-2xl border border-border/80 bg-card overflow-hidden z-[70]"
      >
        {/* Content Body */}
        <div className="flex items-start gap-3 p-4 sm:p-4.5 min-w-0">
          <div className="bg-amber-500/10 text-amber-600 rounded-full flex size-9 shrink-0 items-center justify-center mt-0.5 border border-amber-500/20">
            <ShieldOff className="size-4.5" />
          </div>
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <AlertDialogTitle className="text-sm font-semibold tracking-tight text-foreground leading-snug">
              Remove login access?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal mt-0.5">
              This will permanently revoke{" "}
              <span className="font-semibold text-foreground">{fullName}</span>
              &apos;s ability to sign in. Their employee record will remain
              intact.
            </AlertDialogDescription>
            {errorMessage && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-2 text-xs text-destructive font-medium mt-2">
                {errorMessage}
              </div>
            )}
          </div>
        </div>

        {/* Full-width Divider & Footer */}
        <AlertDialogFooter className="border-t border-border bg-muted/40 dark:bg-zinc-900/60 px-4 py-2.5 flex flex-row items-center justify-end gap-2">
          <AlertDialogCancel
            disabled={removeLoginMutation.isPending}
            className="h-8 px-3 rounded-full text-xs font-medium border border-border bg-card text-foreground hover:bg-muted cursor-pointer transition-colors shadow-2xs"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleRemoveLogin}
            disabled={removeLoginMutation.isPending}
            className="h-8 px-3.5 rounded-full text-xs font-semibold cursor-pointer shadow-2xs transition-colors bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/90 dark:bg-amber-950/60 dark:hover:bg-amber-950/90 dark:text-amber-400 dark:border-amber-900/70"
          >
            {removeLoginMutation.isPending ? (
              <>
                <Loader2 className="size-3 animate-spin mr-1" />
                Removing...
              </>
            ) : (
              "Remove Login"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
