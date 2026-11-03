"use client";

import type { ReactNode } from "react";
import type { Table } from "@tanstack/react-table";
import {
  DataGrid,
  DataGridContainer,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import type { ExpenseGridRow } from "@/components/expenses/expense-types";

type ExpenseDataGridProps = {
  table: Table<DataGridFeatures, ExpenseGridRow>;
  recordCount: number;
  isLoading: boolean;
  emptyMessage: ReactNode;
  currentPageTotal: string;
  totalExpensesAmount: string;
};

export function ExpenseDataGrid({
  table,
  recordCount,
  isLoading,
  emptyMessage,
  currentPageTotal,
  totalExpensesAmount,
}: ExpenseDataGridProps) {
  return (
    <DataGrid
      table={table}
      recordCount={recordCount}
      isLoading={isLoading}
      loadingMode="skeleton"
      tableLayout={{ dense: true, rowBorder: true, stripped: true, rowRounded: false, headerSticky: true }}
      tableClassNames={{
        base: "w-full min-w-full",
        headerSticky: "sticky top-0 z-20 bg-muted",
        bodyRow: "[&[data-row-id^='group:']]:!bg-muted/70 [&[data-row-id^='group:']>td]:border-y-4 [&[data-row-id^='group:']>td]:border-white",
      }}
      emptyMessage={emptyMessage}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col justify-between">
        <DataGridContainer className="w-full flex-1 min-h-0 overflow-hidden flex flex-col">
          <DataGridScrollArea className="w-full flex-1 min-h-0">
            <DataGridTable />
          </DataGridScrollArea>
        </DataGridContainer>
        <div className="shrink-0 grid grid-cols-[140fr_130fr_105fr_150fr_175fr_135fr_105fr] items-center border-t border-border/50 px-1 py-2 text-xs">
          <span />
          <span className="flex min-w-0 items-baseline justify-end gap-1.5 pr-2 text-right text-muted-foreground">
            <span className="whitespace-nowrap">Current page total</span>
            <strong className="whitespace-nowrap font-semibold tabular-nums text-primary">{currentPageTotal}</strong>
          </span>
          <span /><span /><span /><span />
          <span className="flex min-w-0 items-baseline justify-end gap-1.5 text-right text-muted-foreground">
            <span className="whitespace-nowrap">Total expenses</span>
            <strong aria-live="polite" className="whitespace-nowrap font-semibold tabular-nums text-primary">{totalExpensesAmount}</strong>
          </span>
        </div>
        <div className="shrink-0 pt-1.5 mt-auto">
          <DataGridPagination sizes={[10, 20, 50, 100]} />
        </div>
      </div>
    </DataGrid>
  );
}
