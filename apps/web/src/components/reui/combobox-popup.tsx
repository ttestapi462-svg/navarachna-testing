"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox"
import { Field, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

export interface ComboboxPopupOption {
  value: string
  label: string
  icon?: React.ReactNode
  badgeClass?: string
}

export interface ComboboxPopupProps<T = ComboboxPopupOption | string> {
  items: readonly T[]
  value?: string | null
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  label?: string
  required?: boolean
  disabled?: boolean
  error?: boolean
  className?: string
  renderItem?: (item: T) => React.ReactNode
  renderValue?: (item: T | null) => React.ReactNode
  itemToStringValue?: (item: T) => string
}

export function ComboboxPopup<T extends string | ComboboxPopupOption>({
  items,
  value,
  onValueChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found.",
  label,
  required = false,
  disabled = false,
  error = false,
  className,
  renderItem,
  renderValue,
  itemToStringValue = (item) => (typeof item === "string" ? item : item.label),
}: ComboboxPopupProps<T>) {
  const getItemValue = (item: T): string => {
    return typeof item === "string" ? item : item.value
  }

  const selectedItem = React.useMemo(() => {
    if (!value) return null
    return items.find((item) => getItemValue(item) === value) ?? null
  }, [items, value])

  return (
    <Field className={cn("w-full max-w-xs gap-1.5", className)}>
      {label && (
        <FieldLabel className={cn("text-xs font-medium", error ? "text-destructive" : "text-foreground/85")}>
          {label} {required && <span className="text-destructive font-bold">*</span>}
        </FieldLabel>
      )}

      <Combobox<T>
        items={items as T[]}
        value={selectedItem}
        onValueChange={(val) => {
          if (!val) {
            onValueChange?.("")
          } else {
            onValueChange?.(getItemValue(val))
          }
        }}
        itemToStringValue={itemToStringValue}
      >
        <ComboboxTrigger
          render={
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "h-8 w-full justify-between font-normal text-xs rounded-xl bg-muted/30 border-border/70 px-2.5 hover:bg-muted/50 transition-colors",
                error && "border-destructive ring-2 ring-destructive/20"
              )}
              type="button"
            />
          }
        >
          <ComboboxValue placeholder={placeholder}>
            {() => {
              if (!selectedItem) {
                return <span className="text-muted-foreground/60 text-xs">{placeholder}</span>
              }

              if (renderValue) {
                return renderValue(selectedItem)
              }

              if (typeof selectedItem !== "string" && selectedItem.icon) {
                return (
                  <span className="flex items-center gap-2 truncate">
                    {selectedItem.icon}
                    <span className="truncate text-foreground font-medium text-xs">
                      {selectedItem.label}
                    </span>
                  </span>
                )
              }

              return (
                <span className="truncate text-foreground font-medium text-xs">
                  {typeof selectedItem === "string" ? selectedItem : selectedItem.label}
                </span>
              )
            }}
          </ComboboxValue>
        </ComboboxTrigger>

        <ComboboxContent className="w-(--anchor-width) min-w-[240px] max-w-xs rounded-xl border border-border/70 shadow-lg bg-popover p-1.5 overflow-hidden flex flex-col">
          <ComboboxInput
            showTrigger={false}
            placeholder={searchPlaceholder}
            className="h-8 text-xs mb-1 rounded-lg border border-border/70 shrink-0"
          />

          <ComboboxEmpty className="py-2 px-2.5 text-xs text-muted-foreground text-center">
            {emptyMessage}
          </ComboboxEmpty>

          <ComboboxList className="max-h-48 overflow-y-auto overscroll-contain p-0.5 pr-1.5 space-y-0.5">
            {(item: T) => {
              const itemKey = getItemValue(item)
              if (renderItem) {
                return (
                  <ComboboxItem
                    key={itemKey}
                    value={item}
                    className="text-xs py-1.5 pr-7 pl-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-muted/70 transition-colors"
                  >
                    {renderItem(item)}
                  </ComboboxItem>
                )
              }

              if (typeof item !== "string" && item.icon) {
                return (
                  <ComboboxItem
                    key={itemKey}
                    value={item}
                    className="text-xs py-1.5 pr-7 pl-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-muted/70 transition-colors"
                  >
                    <div
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full shrink-0 shadow-2xs",
                        item.badgeClass || "bg-muted"
                      )}
                    >
                      {item.icon}
                    </div>
                    <span className="font-medium text-foreground truncate">{item.label}</span>
                  </ComboboxItem>
                )
              }

              return (
                <ComboboxItem
                  key={itemKey}
                  value={item}
                  className="text-xs py-1.5 pr-7 pl-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-muted/70 transition-colors"
                >
                  <span className="font-medium text-foreground truncate">
                    {typeof item === "string" ? item : item.label}
                  </span>
                </ComboboxItem>
              )
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}

/**
 * Pattern export matching ReUI example requirements (corrected from c-combobox-8 to c-combobox-10 structure)
 */
const largeListItems = Array.from({ length: 100 }, (_, i) => `Item ${i + 1}`)

export function Pattern() {
  const [value, setValue] = React.useState<string>(largeListItems[0])

  return (
    <Field className="max-w-xs">
      <Combobox items={largeListItems} value={value} onValueChange={(v) => setValue(v as string)}>
        <ComboboxTrigger
          render={
            <Button
              variant="outline"
              className="h-8 w-full justify-between font-normal text-xs rounded-xl bg-muted/30 border-border/70 px-2.5 hover:bg-muted/50"
            />
          }
        >
          <ComboboxValue placeholder="Search from 100 items">
            {(val: string) => (
              <span className="font-medium text-foreground text-xs">{val || "Search from 100 items"}</span>
            )}
          </ComboboxValue>
        </ComboboxTrigger>
        <ComboboxContent className="w-(--anchor-width) min-w-[240px] max-w-xs rounded-xl border border-border/70 shadow-lg bg-popover p-1.5 overflow-hidden flex flex-col">
          <ComboboxInput
            showTrigger={false}
            placeholder="Search from 100 items..."
            className="h-8 text-xs mb-1 rounded-lg border border-border/70 shrink-0"
          />
          <ComboboxEmpty className="py-2 px-2.5 text-xs text-muted-foreground text-center">
            No items found.
          </ComboboxEmpty>
          <ComboboxList className="max-h-48 overflow-y-auto overscroll-contain p-0.5 pr-1.5 space-y-0.5">
            {(item: string) => (
              <ComboboxItem
                key={item}
                value={item}
                className="text-xs py-1.5 pr-7 pl-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-muted/70 transition-colors"
              >
                <span className="font-medium text-foreground truncate">{item}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}
