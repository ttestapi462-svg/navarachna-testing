"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PAGE_SIZES = [10, 20, 50, 100];

export function ExpensePagination({
  page,
  pageCount,
  pageSize,
  totalCount,
  loading,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  totalCount: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const siblingPages = 1;
  const visiblePages = siblingPages * 2 + 3;
  const pageButtons: Array<number | { label: string; target: number }> = pageCount <= visiblePages + 2
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : page <= siblingPages + 3
      ? [1, 2, 3, 4, 5, { label: "…", target: visiblePages + 1 }, pageCount]
      : page >= pageCount - siblingPages - 2
        ? [1, { label: "…", target: pageCount - visiblePages }, ...Array.from({ length: visiblePages }, (_, index) => pageCount - visiblePages + index + 1)]
        : [1, { label: "…", target: page - siblingPages - 1 }, ...Array.from({ length: visiblePages - 2 }, (_, index) => page - siblingPages + index), { label: "…", target: page + siblingPages + 1 }, pageCount];

  return (
    <div className="flex grow flex-col flex-wrap items-center justify-between gap-1.5 py-1.5 sm:flex-row sm:py-0">
      <div className="order-2 flex flex-wrap items-center gap-x-2 pb-1.5 sm:order-1 sm:pb-0">
        <div className="text-sm text-muted-foreground">Rows per page</div>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))} disabled={loading}>
          <SelectTrigger aria-label="Rows per page" className="w-fit min-w-16" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start" className="min-w-(--radix-select-trigger-width)">
            {PAGE_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="order-1 flex flex-col items-center justify-center gap-1.5 pt-1.5 sm:order-2 sm:flex-row sm:justify-end sm:pt-0">
        <div className="order-1 text-nowrap text-sm text-muted-foreground sm:order-1">
          {totalCount === 0 ? "No records to show" : `${from} - ${to} of ${totalCount}`}
        </div>
        {totalCount > 0 && (
          <div className="order-2 flex flex-wrap items-center justify-center gap-1 sm:order-2 sm:flex-nowrap">
            <Button size="icon-sm" variant="ghost" className="p-0 text-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1 || loading} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </Button>
            {pageButtons.map((item, index) => typeof item === "number" ? (
              <Button
                key={`page-${item}`}
                size="sm"
                variant="ghost"
                aria-label={`Go to page ${item}`}
                aria-current={page === item ? "page" : undefined}
                className={`min-w-8 px-1.5 text-sm text-muted-foreground ${page === item ? "bg-accent text-accent-foreground" : ""}`}
                onClick={() => onPageChange(item)}
                disabled={loading}
              >
                {item}
              </Button>
            ) : (
              <Button key={`ellipsis-${index}`} size="icon-sm" variant="ghost" className="p-0 text-sm" aria-label={`Go to page ${item.target}`} onClick={() => onPageChange(item.target)} disabled={loading}>
                {item.label}
              </Button>
            ))}
            <Button size="icon-sm" variant="ghost" className="p-0 text-sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount || loading} aria-label="Next page">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
