"use client"

import * as React from "react"
import * as RPNInput from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { ChevronDownIcon, PhoneIcon } from "lucide-react"

type PhoneInputProps = Omit<
  React.ComponentProps<typeof RPNInput.default>,
  "onChange"
> & {
  onChange?: (value: RPNInput.Value) => void
}

function PhoneInput({
  className,
  onChange,
  ...props
}: PhoneInputProps) {
  return (
    <div
      data-slot="phone-input-wrapper"
      className={cn(
        "group/phone relative flex h-9 w-full items-center rounded-lg border border-border/80 bg-background shadow-2xs transition-[color,box-shadow,border-color] focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-2 has-[[aria-invalid=true]]:ring-destructive/20",
        className
      )}
    >
      <RPNInput.default
        className="flex w-full items-center"
        flagComponent={FlagComponent}
        countrySelectComponent={CountrySelect}
        inputComponent={PhoneInputInput}
        smartCaret={false}
        onChange={(value) => onChange?.(value || ("" as RPNInput.Value))}
        {...props}
      />
    </div>
  )
}

function PhoneInputInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="phone-input"
      className={cn(
        "flex-1 border-0 rounded-none rounded-e-lg bg-transparent shadow-none ring-0 focus-visible:ring-0 px-3 text-xs placeholder:text-muted-foreground/60 font-sans tracking-normal h-9",
        className
      )}
      {...props}
    />
  )
}

type CountryEntry = { label: string; value: RPNInput.Country | undefined }

function CountrySelect({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: {
  disabled?: boolean
  value: RPNInput.Country
  options: CountryEntry[]
  onChange: (country: RPNInput.Country) => void
}) {
  return (
    <div className="relative inline-flex items-center self-stretch rounded-s-lg border-r border-border/70 bg-muted/30 px-2.5 text-muted-foreground hover:bg-muted/50 transition-colors">
      <div className="inline-flex items-center gap-1.5" aria-hidden="true">
        <FlagComponent country={selectedCountry} countryName={selectedCountry} />
        <ChevronDownIcon className="size-3 text-muted-foreground/70" aria-hidden="true" />
      </div>
      <select
        disabled={disabled}
        value={selectedCountry}
        onChange={(e) => onChange(e.target.value as RPNInput.Country)}
        className="absolute inset-0 text-xs opacity-0 cursor-pointer disabled:cursor-not-allowed"
        aria-label="Select country"
      >
        <option key="default" value="">
          Select country
        </option>
        {countryList
          .filter((x): x is CountryEntry & { value: RPNInput.Country } => !!x.value)
          .map((option, i) => (
            <option key={option.value ?? `empty-${i}`} value={option.value}>
              {option.label}{" "}
              {option.value &&
                `+${RPNInput.getCountryCallingCode(option.value)}`}
            </option>
          ))}
      </select>
    </div>
  )
}

function FlagComponent({ country, countryName }: RPNInput.FlagProps) {
  const Flag = flags[country]

  return (
    <span className="w-5 overflow-hidden rounded-xs shrink-0 flex items-center justify-center">
      {Flag ? (
        <Flag title={countryName} />
      ) : (
        <PhoneIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
      )}
    </span>
  )
}

export { PhoneInput }
export type { PhoneInputProps }
