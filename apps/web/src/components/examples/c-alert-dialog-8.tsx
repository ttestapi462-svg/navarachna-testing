"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CircleAlertIcon } from "lucide-react";

export function Pattern() {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Deactivate Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-[360px] p-0 gap-0 rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden">
        {/* Compact Content Body */}
        <div className="flex items-start gap-3 p-4 sm:p-4.5 min-w-0">
          <div className="bg-destructive/10 text-destructive rounded-full flex size-9 shrink-0 items-center justify-center mt-0.5 border border-destructive/20">
            <CircleAlertIcon className="size-4.5" />
          </div>
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <AlertDialogTitle className="text-sm font-semibold tracking-tight text-foreground leading-snug">
              Deactivate your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-normal mt-0.5">
              This will disable your account and remove your profile from all
              active searches.
            </AlertDialogDescription>
          </div>
        </div>

        {/* Full-width Divider & Tinted Footer with Compact Right-Aligned Pill Buttons */}
        <AlertDialogFooter className="border-t border-slate-200/90 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 px-4 py-2.5 flex flex-row items-center justify-end gap-2">
          <AlertDialogCancel
            onClick={() => setOpen(false)}
            className="h-8 px-3 rounded-full text-xs font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors shadow-2xs"
          >
            Keep My Account
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => setOpen(false)}
            className="h-8 px-3.5 rounded-full text-xs font-semibold cursor-pointer shadow-2xs transition-colors bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/90 dark:bg-rose-950/60 dark:hover:bg-rose-950/90 dark:text-rose-400 dark:border-rose-900/70"
          >
            Deactivate Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
