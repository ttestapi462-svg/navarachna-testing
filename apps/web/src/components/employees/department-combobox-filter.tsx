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
import { Field } from "@/components/ui/field";

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
    <Field className={className}>
      <Combobox
        multiple
        autoHighlight
        items={departments as unknown as string[]}
        value={selectedDepartments}
        onValueChange={(values) => onSelectedChange(values as string[])}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(values: string[]) => (
              <Fragment>
                {values.map((value: string) => (
                  <ComboboxChip key={value}>{value}</ComboboxChip>
                ))}
                <ComboboxChipsInput
                  placeholder={
                    values.length === 0
                      ? "Filter role / designation..."
                      : "Add role..."
                  }
                />
              </Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent
          anchor={anchor}
          className="rounded-xl border border-border/60 shadow-lg bg-popover/95 backdrop-blur-md min-w-56"
        >
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList className="p-1">
            {(item: string) => (
              <ComboboxItem
                key={item}
                value={item}
                className="text-xs sm:text-sm py-1.5 px-2.5 rounded-lg cursor-pointer"
              >
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
