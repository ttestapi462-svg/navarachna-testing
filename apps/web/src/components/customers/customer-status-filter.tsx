"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/reui/badge";
import { Filter, Check, Users, CheckCircle2, XCircle, ChevronDown } from "lucide-react";

export type CustomerStatusFilterValue = "ALL" | "ACTIVE" | "INACTIVE";

interface CustomerStatusFilterProps {
  value: CustomerStatusFilterValue;
  onChange: (value: CustomerStatusFilterValue) => void;
  className?: string;
}

export function CustomerStatusFilter({
  value,
  onChange,
  className,
}: CustomerStatusFilterProps) {
  const labels: Record<
    CustomerStatusFilterValue,
    { label: string; icon: typeof Users; color: string }
  > = {
    ALL: { label: "All Clients", icon: Users, color: "text-muted-foreground" },
    ACTIVE: { label: "Active Only", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
    INACTIVE: { label: "Inactive Only", icon: XCircle, color: "text-red-600 dark:text-red-400" },
  };

  const current = labels[value];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            className ||
            "h-8 px-2.5 gap-1.5 rounded-lg text-xs font-medium border-border/70 bg-background hover:bg-muted/60 cursor-pointer"
          }
        >
          <Filter className="size-3 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Status:</span>
          <span className="font-semibold text-foreground">{current.label}</span>
          <ChevronDown className="size-3 text-muted-foreground shrink-0 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-44 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-md shadow-lg p-1 z-50"
      >
        <DropdownMenuItem
          onClick={() => onChange("ALL")}
          className="text-xs py-1.5 px-2 rounded-lg cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Users className="size-3.5 text-muted-foreground" />
            <span>All Clients</span>
          </div>
          {value === "ALL" && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onChange("ACTIVE")}
          className="text-xs py-1.5 px-2 rounded-lg cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Active Only</span>
          </div>
          {value === "ACTIVE" && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onChange("INACTIVE")}
          className="text-xs py-1.5 px-2 rounded-lg cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <XCircle className="size-3.5 text-red-600 dark:text-red-400" />
            <span>Inactive Only</span>
          </div>
          {value === "INACTIVE" && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
