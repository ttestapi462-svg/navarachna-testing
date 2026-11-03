"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { ArrowDownIcon, ArrowUpIcon, CalendarDays, ChevronDown, ChevronsUpDownIcon, Eye, FileImage, FileText, Pencil, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataGridTableRowExpand } from "@/components/reui/data-grid/data-grid-table";
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import type { Expense, ExpenseGridRow, SourcingSpecialist } from "@/components/expenses/expense-types";

type ExpenseColumnOptions = {
  currentUser?: { id?: number; firstName?: string | null } | null;
  dateSubtotals: Record<string, number> | null;
  groupByDate: boolean;
  setGroupByDate: Dispatch<SetStateAction<boolean>>;
  originalReceiptNames: Record<number, string>;
  displayReceiptName: (expense: Expense) => string;
  getEmployeeAvatarColorClass: (employee: SourcingSpecialist) => string;
  getEmployeeInitials: (displayName: string) => string;
  formatDate: (value?: string | null) => string;
  formatCurrency: (value: number | string) => string;
  formatAuditDateTime: (value?: string | null) => string;
  openDetails: (expense: Expense) => void;
  openEditForm: (expense: Expense) => void;
  requestDeleteExpense: (expense: Expense) => void;
  prefetchBill: (expense: Expense) => void;
};

function ExpenseCellTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 break-words">{label}</TooltipContent>
    </Tooltip>
  );
}

export function createExpenseColumns({
  currentUser, dateSubtotals, groupByDate, setGroupByDate, originalReceiptNames,
  displayReceiptName, getEmployeeAvatarColorClass, getEmployeeInitials, formatDate,
  formatCurrency, formatAuditDateTime, openDetails, openEditForm, requestDeleteExpense, prefetchBill,
}: ExpenseColumnOptions): ColumnDef<DataGridFeatures, ExpenseGridRow>[] {
  return [

  {
    accessorFn: (item) => item.expenseDate,
    id: "expenseDate",
    header: ({ column }) => (
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Date column options" className="-ms-2 inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-left text-xs font-semibold text-foreground/80 transition hover:bg-secondary data-[state=open]:bg-secondary">
                Date
                {column.getIsSorted() === "asc" ? <ArrowUpIcon className="size-3.25" aria-hidden="true" /> : column.getIsSorted() === "desc" ? <ArrowDownIcon className="size-3.25" aria-hidden="true" /> : <ChevronsUpDownIcon className="size-3.5 opacity-60" aria-hidden="true" />}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <DropdownMenuContent align="start" className="w-44 rounded-xl border border-border/60 bg-popover shadow-lg">
            <DropdownMenuItem onSelect={() => column.toggleSorting(false)} className="cursor-pointer text-xs">Sort oldest first</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => column.toggleSorting(true)} className="cursor-pointer text-xs">Sort newest first</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={groupByDate ? "date" : "none"} onValueChange={(value) => setGroupByDate(value === "date")}>
              <DropdownMenuRadioItem value="date" className="cursor-pointer text-xs">Group by date</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="none" className="cursor-pointer text-xs">Ungroup</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent side="top"><p className="text-xs">Date options</p></TooltipContent>
      </Tooltip>
    ),
    cell: ({ row }) => row.original.kind === "date-group" ? (
      <div className="flex min-w-0 items-center gap-1.5">
        <DataGridTableRowExpand row={row} indent={0}>
          <ChevronDown className="size-3.5 transition-transform in-aria-[expanded=false]:-rotate-90" />
        </DataGridTableRowExpand>
        <span className="shrink-0 whitespace-nowrap text-left text-xs font-semibold text-foreground">{row.original.expenseDate === "undated" ? "Undated expenses" : formatDate(row.original.expenseDate)}</span>
        <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">{row.original.expenseCount} {row.original.expenseCount === 1 ? "expense" : "expenses"}</span>
      </div>
    ) : groupByDate ? null : (
      <span className="block whitespace-nowrap text-left text-xs text-muted-foreground">{formatDate(row.original.expenseDate)}</span>
    ),
    meta: { skeleton: <Skeleton className="mx-auto h-3.5 w-20 rounded-md" /> },
    size: 140,
    enableSorting: true,
  },
  {
    accessorFn: (item) => item.kind === "date-group" ? dateSubtotals?.[item.expenseDate] ?? item.pageSubtotal : Number(item.expense.amount),
    id: "amount",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Amount" className="w-full justify-end text-right text-xs font-semibold text-foreground/80" />
    ),
    cell: ({ row }) => row.original.kind === "date-group" ? (
      <ExpenseCellTooltip label="Subtotal for all matching expenses on this date"><div className="flex flex-col items-end justify-center gap-0.5 text-right">
        <span className="whitespace-nowrap text-[10px] text-primary/80">Date subtotal</span>
        <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-primary">{dateSubtotals ? formatCurrency(dateSubtotals[row.original.expenseDate] || 0) : "—"}</span>
      </div></ExpenseCellTooltip>
    ) : <span className="block whitespace-nowrap text-right text-xs font-semibold tabular-nums text-foreground">{formatCurrency(row.original.expense.amount)}</span>,
    meta: { skeleton: <Skeleton className="mx-auto h-3.5 w-16 rounded-md" /> },
    size: 130,
    enableSorting: true,
  },
  {
    id: "handledBy",
    accessorFn: (item) => item.kind === "expense" ? item.expense.sourcingSpecialists.map((person) => person.displayName).join(", ") : "",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Handled By" className="w-full justify-start text-left text-xs font-semibold text-foreground/80" />
    ),
    cell: ({ row }) => {
      if (row.original.kind !== "expense") return null;
      const expense = row.original.expense;
      const specialists = expense.sourcingSpecialists || [];
      const name = specialists.map((person) => person.displayName).join(", ") || "Unassigned";
      const visibleSpecialists = specialists.slice(0, 2);
      const additionalCount = Math.max(0, specialists.length - visibleSpecialists.length);
      return (
        <div className="flex min-w-0 items-center gap-1.5 py-0.5">
          {visibleSpecialists.length ? visibleSpecialists.map((specialist) => <ExpenseCellTooltip key={specialist.id} label={specialist.displayName}><Avatar className="size-7 shrink-0">
            <AvatarFallback className={`text-[10px] font-bold ${getEmployeeAvatarColorClass(specialist)}`}>{getEmployeeInitials(specialist.displayName)}</AvatarFallback>
          </Avatar></ExpenseCellTooltip>) : <span className="text-xs text-muted-foreground">—</span>}
          {additionalCount > 0 ? <ExpenseCellTooltip label={specialists.slice(2).map((person) => person.displayName).join(", ")}><span aria-label={`${additionalCount} additional employees`} className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold leading-none text-primary">+{additionalCount}</span></ExpenseCellTooltip> : null}
        </div>
      );
    },
    meta: {
      skeleton: <Skeleton className="h-3.5 w-32 rounded-md" />,
    },
    size: 105,
    enableSorting: false,
  },
  {
    accessorFn: (item) => item.kind === "expense" ? item.expense.billFileName : "",
    id: "receipt",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Receipt" className="w-full justify-start text-left text-xs font-semibold text-foreground/80" />
    ),
    cell: ({ row }) => {
      if (row.original.kind !== "expense") return null;
      const expense = row.original.expense;
      return (
        <div className="flex min-w-0 justify-start pr-3">
        <ExpenseCellTooltip label={originalReceiptNames[expense.id] || expense.billFileName || "No receipt attached"}><div className="inline-flex w-fit max-w-full min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground">
          {expense.billFileName?.toLowerCase().endsWith(".pdf") ? <FileText className="size-3.5 shrink-0" /> : <FileImage className="size-3.5 shrink-0" />}
          <span className="min-w-0 truncate">{displayReceiptName(expense) || "View bill"}</span>
        </div></ExpenseCellTooltip>
        </div>
      );
    },
    meta: { skeleton: <Skeleton className="mx-auto h-7 w-32 rounded-lg" /> },
    size: 150,
    enableSorting: false,
  },
  {
    accessorFn: (item) => item.kind === "expense" ? item.expense.updatedAt ?? item.expense.createdAt : item.expenseDate,
    id: "updatedAt",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Updated At" className="w-full justify-start text-left text-xs font-semibold text-foreground/80" />
    ),
    cell: ({ row }) => {
      if (row.original.kind !== "expense") return null;
      const expense = row.original.expense;
      const isUpdated = expense.updatedAt != null;
      return (
        <ExpenseCellTooltip label={isUpdated ? "Last updated timestamp" : "No updates yet — showing created timestamp"}><span className="inline-block whitespace-nowrap text-left text-xs text-muted-foreground">
          {formatAuditDateTime(expense.updatedAt ?? expense.createdAt)}
        </span></ExpenseCellTooltip>
      );
    },
    meta: { skeleton: <Skeleton className="h-3.5 w-28 rounded-md" /> },
    size: 175,
    enableSorting: true,
  },
  {
    accessorFn: (item) => item.kind === "expense" ? item.expense.updatedBy ?? item.expense.createdBy : "",
    id: "updatedBy",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Updated By" className="w-full justify-start text-left text-xs font-semibold text-foreground/80" />
    ),
    cell: ({ row }) => {
      if (row.original.kind !== "expense") return null;
      const expense = row.original.expense;
      const isUpdated = expense.updatedBy != null;
      const actorId = expense.updatedBy ?? expense.createdBy;
      const currentActorName = actorId != null && actorId === currentUser?.id
        ? currentUser.firstName
        : null;
      const actorName = isUpdated
        ? expense.updatedByUsername ?? currentActorName ?? (actorId != null ? `#${actorId}` : "—")
        : expense.createdByUsername ?? currentActorName ?? (actorId != null ? `#${actorId}` : "—");
      return (
        <ExpenseCellTooltip label={isUpdated ? "Last updated by" : "No updates yet — showing created by"}><span className="inline-block max-w-[130px] truncate text-left text-xs text-muted-foreground">
          {actorName}
        </span></ExpenseCellTooltip>
      );
    },
    meta: { skeleton: <Skeleton className="h-3.5 w-16 rounded-md" /> },
    size: 135,
    enableSorting: true,
  },
  {
    id: "actions",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Actions" className="w-full justify-center text-center text-xs font-semibold text-foreground/80" />
    ),
    cell: ({ row }) => {
      if (row.original.kind !== "expense") return null;
      const expense = row.original.expense;
      return (
        <div className="flex items-center justify-center gap-1">
          <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => openEditForm(expense)} aria-label="Edit expense" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"><Pencil className="size-4" /></button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Edit expense</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button type="button" onPointerEnter={() => prefetchBill(expense)} onFocus={() => prefetchBill(expense)} onClick={() => openDetails(expense)} aria-label="View expense details" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"><Eye className="size-4" /></button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">View details</p></TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => requestDeleteExpense(expense)} aria-label="Delete expense" className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></TooltipTrigger><TooltipContent side="top"><p className="text-xs">Delete expense</p></TooltipContent></Tooltip>
        </div>
      );
    },
    meta: { skeleton: <Skeleton className="mx-auto h-7 w-20 rounded-md" /> },
    size: 105,
    enableSorting: false,
  },
  ];
}
