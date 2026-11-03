"use client";

import { CalendarDays, ChevronRight, LoaderCircle, Receipt } from "lucide-react";
import type { RefObject, TouchEvent, UIEvent } from "react";
import { EmptyState as ExpenseEmptyState } from "@/components/expenses/expense-empty-state";
import { ExpensePagination } from "@/components/expenses/expense-pagination";
import type { Expense } from "@/components/expenses/expense-types";

type ExpenseMobileListProps = {
  pullDelta: number;
  refreshing: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  handleTouchStart: (event: TouchEvent<HTMLDivElement>) => void;
  handleTouchMove: (event: TouchEvent<HTMLDivElement>) => void;
  handleTouchEnd: () => Promise<void> | void;
  handleMobileScroll: (event: UIEvent<HTMLDivElement>) => void;
  loading: boolean;
  expenses: Expense[];
  hasFilters: boolean;
  clearFilters: () => void;
  openDetails: (expense: Expense) => Promise<void> | void;
  formatDate: (value?: string | null) => string;
  formatCurrency: (value: number | string) => string;
  currentPageTotal: number;
  totalExpensesAmount: number | null;
  page: number;
  pageCount: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function ExpenseMobileList({
  pullDelta,
  refreshing,
  listRef,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleMobileScroll,
  loading,
  expenses,
  hasFilters,
  clearFilters,
  openDetails,
  formatDate,
  formatCurrency,
  currentPageTotal,
  totalExpensesAmount,
  page,
  pageCount,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: ExpenseMobileListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:hidden">
      {pullDelta > 0 ? (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-100 ease-out"
          style={{ height: pullDelta }}
        >
          <LoaderCircle className="size-5 animate-spin text-primary" />
        </div>
      ) : null}
      {refreshing && pullDelta === 0 ? (
        <div className="flex items-center justify-center py-2">
          <LoaderCircle className="size-5 animate-spin text-primary" />
        </div>
      ) : null}

      <div
        ref={listRef}
        className="min-h-0 max-h-[calc(100dvh-11.5rem)] flex-1 overflow-y-auto overscroll-y-contain px-2.5 pb-3 sm:px-3 md:max-h-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => void handleTouchEnd()}
        onScroll={handleMobileScroll}
      >
        {loading ? (
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`mobile-loading-${index}`} className="h-[68px] animate-pulse rounded-[16px] bg-muted/70" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-8 text-center">
            <ExpenseEmptyState hasFilters={hasFilters} onClear={clearFilters} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {expenses.map((expense) => (
              <article
                key={expense.id}
                onClick={() => void openDetails(expense)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void openDetails(expense);
                  }
                }}
                aria-label={`View expense for ${(expense.sourcingSpecialists || []).map((employee) => employee.displayName).join(", ") || "unassigned specialist"}, ${formatCurrency(expense.amount)}`}
                className="group flex min-h-[68px] w-full cursor-pointer flex-col justify-between rounded-xl border border-border/70 bg-card p-2.5 shadow-2xs transition hover:border-primary/25 hover:shadow-xs active:bg-muted/40"
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate text-xs font-medium">
                      {formatDate(expense.expenseDate)}
                    </span>
                  </div>
                  <span className="shrink-0 text-right text-sm font-semibold leading-tight tabular-nums text-foreground">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Receipt className="size-3.5" />
                    </span>
                    <div className="flex min-w-0 items-center gap-1.5" title={expense.sourcingSpecialists?.map((employee) => employee.displayName).join(", ") || "Unassigned"}>
                      <span className="min-w-0 truncate text-xs font-semibold text-foreground">{expense.sourcingSpecialists?.[0]?.displayName || "Unassigned"}</span>
                      {(expense.sourcingSpecialists?.length || 0) > 1 && (
                        <span aria-label={`${expense.sourcingSpecialists.length - 1} additional ${expense.sourcingSpecialists.length === 2 ? "employee" : "employees"}`} className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold leading-none text-primary">
                          +{expense.sourcingSpecialists.length - 1}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70" />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-border/50 px-2.5 pt-1.5 sm:px-3">
        <div className="flex items-center justify-between gap-2 pb-1.5 text-[11px]">
          <span className="text-muted-foreground">Current page total <strong className="ml-1 font-semibold tabular-nums text-primary">{formatCurrency(currentPageTotal)}</strong></span>
          <span className="text-muted-foreground">Total expenses <strong className="ml-1 font-semibold tabular-nums text-primary">{totalExpensesAmount === null ? "—" : formatCurrency(totalExpensesAmount)}</strong></span>
        </div>
        <ExpensePagination
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          totalCount={totalCount}
          loading={loading}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
