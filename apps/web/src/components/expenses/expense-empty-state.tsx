import { Receipt } from "lucide-react";

export function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/10 bg-primary/[0.07] text-primary">
        <Receipt className="size-6" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-foreground">
        {hasFilters ? "No expenses found" : "Your expense list is empty"}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {hasFilters ? "Try a different search or date range." : "Add your first expense and attach its receipt to get started."}
      </p>
      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
