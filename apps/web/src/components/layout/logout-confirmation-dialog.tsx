"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldQuestionMarkIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/context/dashboard-auth-context";

interface LogoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoutConfirmationDialog({
  open,
  onOpenChange,
}: LogoutConfirmationDialogProps) {
  const { handleLogout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const onConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setIsLoggingOut(true);
      await handleLogout();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        size="sm"
        className="gap-0 overflow-hidden p-0 sm:max-w-sm rounded-3xl border border-border/70 bg-popover/95 backdrop-blur-xl shadow-2xl duration-200"
      >
        <div className="flex flex-col items-center justify-center gap-2.5 p-6 sm:p-8 text-center">
          <AlertDialogMedia className="rounded-full size-12 bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200/70 dark:border-red-900/50 shadow-xs mb-1">
            <ShieldQuestionMarkIcon className="size-6" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-center text-base font-semibold text-foreground tracking-tight">
            Are you sure?
          </AlertDialogTitle>
          <AlertDialogDescription className="p-0 text-center text-xs sm:text-sm text-muted-foreground font-normal leading-relaxed max-w-xs">
            You can always log in later to your atelier account.
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter className="grid flex-none grid-cols-2 sm:grid-cols-2 gap-0 divide-x divide-border/60 border-t border-border/60 pt-0">
          <AlertDialogCancel
            variant="ghost"
            disabled={isLoggingOut}
            className="border-border/60 h-12 flex-1 rounded-none border-0 border-r p-0 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            No
          </AlertDialogCancel>
          <AlertDialogAction
            variant="ghost"
            disabled={isLoggingOut}
            className="h-12 flex-1 rounded-none border-0 p-0 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/20 transition-colors cursor-pointer flex items-center justify-center gap-2"
            onClick={onConfirm}
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Logging out...</span>
              </>
            ) : (
              "Yes, Logout"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
