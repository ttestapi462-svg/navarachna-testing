"use client";

import { Fragment } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { getDesignationMeta } from "@/lib/designation-config";
import { cn } from "@/lib/utils";

interface DepartmentComboboxFilterProps {
  departments: readonly string[];
  selectedDepartments: string[];
  onSelectedChange: (departments: string[]) => void;
  className?: string;
}

export function DepartmentComboboxFilter({
  departments,
  selectedDepartments,
  onSelectedChange,
  className,
}: DepartmentComboboxFilterProps) {
  const anchor = useComboboxAnchor();

  return (
    <div className={className || "w-48 sm:w-56"}>
      <Combobox
        multiple
        autoHighlight
        items={departments as unknown as string[]}
        value={selectedDepartments}
        onValueChange={(values) => onSelectedChange(values as string[])}
      >
        <ComboboxChips
          ref={anchor}
          className="h-8 min-h-8 py-0 px-2 text-xs rounded-lg border-border/70 overflow-hidden bg-background"
        >
          <ComboboxValue>
            {(values: string[]) => (
              <Fragment>
                {values.map((value: string) => {
                  const meta = getDesignationMeta(value);
                  const Icon = meta.icon;
                  return (
                    <ComboboxChip
                      key={value}
                      className="h-5 text-[10px] py-0 px-1.5 gap-1 inline-flex items-center"
                    >
                      <Icon className={cn("size-2.5 shrink-0", meta.iconColor)} />
                      <span>{value}</span>
                    </ComboboxChip>
                  );
                })}
                <ComboboxChipsInput
                  className="text-xs placeholder:text-xs"
                  placeholder={
                    values.length === 0
                      ? "Filter department..."
                      : "Add..."
                  }
                />
              </Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent
          anchor={anchor}
          className="rounded-xl border border-border/60 shadow-lg bg-popover/95 backdrop-blur-md min-w-56 max-h-80 overflow-hidden"
        >
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList className="p-0.5 pr-1.5 max-h-60 overflow-y-auto space-y-0.5">
            {(item: string) => {
              const meta = getDesignationMeta(item);
              const Icon = meta.icon;
              return (
                <ComboboxItem
                  key={item}
                  value={item}
                  className="text-xs py-1.5 pr-7 pl-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-muted/70 transition-colors"
                >
                  <div
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full shrink-0 shadow-2xs",
                      meta.bgLight
                    )}
                  >
                    <Icon className={cn("size-3", meta.iconColor)} />
                  </div>
                  <span className="font-medium text-foreground truncate">{item}</span>
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
