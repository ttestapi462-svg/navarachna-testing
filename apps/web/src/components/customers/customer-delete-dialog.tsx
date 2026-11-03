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
import { useDeleteCustomer } from "@/services/customer-service";
import type { Customer } from "@/types/customer";
import { CircleAlertIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";

interface CustomerDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function CustomerDeleteDialog({
  open,
  onOpenChange,
  customer,
}: CustomerDeleteDialogProps) {
  const deleteMutation = useDeleteCustomer();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!customer) return null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await deleteMutation.mutateAsync(customer.id);
      toast.success("Customer removed", {
        description: `${customer.name} has been deleted successfully.`,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete customer.";
      setErrorMessage(msg);
      toast.error("Deletion failed", {
        description: msg,
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-[360px] p-0 gap-0 rounded-2xl shadow-2xl border border-border/80 bg-card overflow-hidden z-50">
        <div className="flex items-start gap-3 p-4 sm:p-5 min-w-0">
          <div className="bg-destructive/10 text-destructive rounded-full flex size-9 shrink-0 items-center justify-center mt-0.5 border border-destructive/20">
            <CircleAlertIcon className="size-4.5" />
          </div>
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <AlertDialogTitle className="text-sm font-semibold tracking-tight text-foreground leading-snug">
              Delete customer profile?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal mt-1">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {customer.name}
              </span>
              ? This will remove the customer profile from your atelier records.
            </AlertDialogDescription>
            {errorMessage && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-2 text-xs text-destructive font-medium mt-2">
                {errorMessage}
              </div>
            )}
          </div>
        </div>

        <AlertDialogFooter className="border-t border-border bg-muted/40 dark:bg-zinc-900/60 px-4 py-2.5 flex flex-row items-center justify-end gap-2">
          <AlertDialogCancel
            disabled={deleteMutation.isPending}
            className="h-8 px-3 rounded-full text-xs font-medium border border-border bg-card text-foreground hover:bg-muted cursor-pointer transition-colors shadow-2xs"
          >
            Keep Customer
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="h-8 px-3.5 rounded-full text-xs font-semibold cursor-pointer shadow-2xs transition-colors bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="size-3 animate-spin mr-1" />
                Deleting...
              </>
            ) : (
              "Delete Customer"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
