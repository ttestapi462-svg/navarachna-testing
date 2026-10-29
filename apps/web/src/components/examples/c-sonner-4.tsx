"use client";

import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

export function SonnerVariantsDemo() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => toast("Default notification")}
      >
        Default
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full text-emerald-600 hover:text-emerald-700"
        onClick={() =>
          toast.success("Employee saved successfully", {
            description: "Profile changes have been committed.",
          })
        }
      >
        Success
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full text-destructive hover:text-destructive"
        onClick={() =>
          toast.error("Operation failed", {
            description: "An unexpected error occurred on the server.",
          })
        }
      >
        Error
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full text-amber-600 hover:text-amber-700"
        onClick={() =>
          toast.warning("Concurrency conflict detected", {
            description: "Record has been updated in another session.",
          })
        }
      >
        Warning
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full text-sky-600 hover:text-sky-700"
        onClick={() =>
          toast.info("Download started", {
            description: "Fetching employee audit document...",
          })
        }
      >
        Info
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => toast.loading("Processing employee data...")}
      >
        Loading
      </Button>
    </div>
  );
}
