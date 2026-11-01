import React from "react";
import {
  ConciergeBell,
  ClipboardCheck,
  PackageSearch,
  Scissors,
  Shirt,
  Sparkles,
  Package,
  Briefcase,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DesignationMeta {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  iconColor: string;
  bgLight: string;
}

export const DESIGNATION_CONFIG: Record<string, DesignationMeta> = {
  "Studio Receptionist": {
    label: "Studio Receptionist",
    icon: ConciergeBell,
    badgeClass:
      "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:border-primary/40",
    iconColor: "text-primary dark:text-primary-foreground",
    bgLight: "bg-primary/15 dark:bg-primary/30",
  },
  "Floor Supervisor": {
    label: "Floor Supervisor",
    icon: ClipboardCheck,
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    bgLight: "bg-amber-100/70 dark:bg-amber-900/40",
  },
  "Sourcing Specialist": {
    label: "Sourcing Specialist",
    icon: PackageSearch,
    badgeClass:
      "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/40",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    bgLight: "bg-indigo-100/70 dark:bg-indigo-900/40",
  },
  "Cutting Master": {
    label: "Cutting Master",
    icon: Scissors,
    badgeClass:
      "bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/40",
    iconColor: "text-teal-600 dark:text-teal-400",
    bgLight: "bg-teal-100/70 dark:bg-teal-900/40",
  },
  "Master Tailor": {
    label: "Master Tailor",
    icon: Shirt,
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    bgLight: "bg-blue-100/70 dark:bg-blue-900/40",
  },
  "Finishing Specialist": {
    label: "Finishing Specialist",
    icon: Sparkles,
    badgeClass:
      "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40",
    iconColor: "text-purple-600 dark:text-purple-400",
    bgLight: "bg-purple-100/70 dark:bg-purple-900/40",
  },
  "Packaging & Dispatch": {
    label: "Packaging & Dispatch",
    icon: Package,
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgLight: "bg-emerald-100/70 dark:bg-emerald-900/40",
  },
  "Other Employee": {
    label: "Other Employee",
    icon: Briefcase,
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60",
    iconColor: "text-slate-600 dark:text-slate-400",
    bgLight: "bg-slate-200/70 dark:bg-slate-700/40",
  },
};

export function getDesignationMeta(name?: string | null): DesignationMeta {
  if (!name) {
    return {
      label: "Unassigned",
      icon: Building2,
      badgeClass:
        "bg-muted text-muted-foreground border-border",
      iconColor: "text-muted-foreground",
      bgLight: "bg-muted/70",
    };
  }
  return (
    DESIGNATION_CONFIG[name] || {
      label: name,
      icon: Building2,
      badgeClass:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60",
      iconColor: "text-slate-600 dark:text-slate-400",
      bgLight: "bg-slate-200/70",
    }
  );
}

export function DesignationBadge({
  name,
  className,
  showIcon = true,
}: {
  name?: string | null;
  className?: string;
  showIcon?: boolean;
}) {
  const meta = getDesignationMeta(name);
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border whitespace-nowrap transition-colors",
        meta.badgeClass,
        className
      )}
    >
      {showIcon && <Icon className={cn("size-3 shrink-0", meta.iconColor)} />}
      <span>{meta.label}</span>
    </span>
  );
}
