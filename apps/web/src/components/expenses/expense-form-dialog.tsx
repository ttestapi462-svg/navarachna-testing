"use client";

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { AlertCircle, CalendarDays, Check, ChevronDown, LoaderCircle, UserRoundPlus, Users as UsersIcon, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DialogShell } from "@/components/expenses/expense-dialog-shell";
import type { Expense, ExpenseFormValues, SourcingSpecialist } from "@/components/expenses/expense-types";

type ExpenseFormDialogProps = {
  editingExpense: Expense | null;
  formValues: ExpenseFormValues;
  fieldErrors: Partial<Record<keyof ExpenseFormValues, string>>;
  formError: string;
  saving: boolean;
  expenseDatePickerOpen: boolean;
  setExpenseDatePickerOpen: Dispatch<SetStateAction<boolean>>;
  expenseCalendarMonth: Date;
  setExpenseCalendarMonth: Dispatch<SetStateAction<Date>>;
  expenseCalendarDays: Date[];
  specialistPickerOpen: boolean;
  setSpecialistPickerOpen: Dispatch<SetStateAction<boolean>>;
  sourcingSpecialists: SourcingSpecialist[];
  specialistSearch: string;
  setSpecialistSearch: Dispatch<SetStateAction<string>>;
  receiptPicker: ReactNode;
  requestCloseExpenseForm: () => void;
  submitExpense: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  updateFormField: (field: keyof ExpenseFormValues, value: string | File | number[] | null) => void;
  toggleSourcingSpecialist: (id: number) => void;
  getEmployeeAvatarColorClass: (employee: SourcingSpecialist) => string;
  getEmployeeInitials: (displayName: string) => string;
  formatDate: (value?: string | null) => string;
  todayLocalIso: () => string;
};

export function ExpenseFormDialog({
  editingExpense, formValues, fieldErrors, formError, saving, expenseDatePickerOpen,
  setExpenseDatePickerOpen, expenseCalendarMonth, setExpenseCalendarMonth, expenseCalendarDays,
  specialistPickerOpen, setSpecialistPickerOpen, sourcingSpecialists, specialistSearch,
  setSpecialistSearch, receiptPicker, requestCloseExpenseForm, submitExpense, updateFormField,
  toggleSourcingSpecialist, getEmployeeAvatarColorClass, getEmployeeInitials, formatDate, todayLocalIso,
}: ExpenseFormDialogProps) {
  return (
    <DialogShell
      title={editingExpense ? "Edit expense" : "Add a new expense"}
      description={editingExpense ? "Update the expense details, assigned employees, and receipt." : "Record the expense date, amount, assigned employees, and receipt."}
      onClose={requestCloseExpenseForm}
    >
<form noValidate onSubmit={submitExpense} className="space-y-2.5">
  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
    {/* Date field: Normal field with calendar icon on left, date text, no dropdown arrow */}
    <label className="block text-sm font-medium text-foreground">
      Expense date <span className="text-primary">*</span>
      <span className="relative mt-1.5 block">
        <button
          type="button"
          aria-invalid={Boolean(fieldErrors.expenseDate)}
          onClick={() => {
            const selected = formValues.expenseDate ? new Date(`${formValues.expenseDate}T00:00:00`) : new Date();
            setExpenseCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
            setExpenseDatePickerOpen((open) => !open);
          }}
          className={`flex h-9 w-full items-center gap-2.5 rounded-[12px] border bg-background px-3 text-left text-sm outline-none transition ${fieldErrors.expenseDate ? "border-destructive ring-2 ring-destructive/20 focus:border-destructive focus:ring-destructive/20" : "border-input hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
        >
          <CalendarDays className="size-4 text-primary shrink-0" />
          <span className="flex-1 font-medium text-foreground">
            {formValues.expenseDate ? formatDate(formValues.expenseDate) : "Choose expense date"}
          </span>
        </button>
        {expenseDatePickerOpen ? (
          <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[min(21rem,calc(100vw-3rem))] rounded-2xl border border-border bg-background p-2.5 shadow-xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <button type="button" aria-label="Previous month" onClick={() => setExpenseCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><ChevronDown className="size-4 rotate-90" /></button>
              <p className="text-sm font-semibold">{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(expenseCalendarMonth)}</p>
              <button type="button" aria-label="Next month" disabled={expenseCalendarMonth.getFullYear() === new Date().getFullYear() && expenseCalendarMonth.getMonth() >= new Date().getMonth()} onClick={() => setExpenseCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30"><ChevronDown className="size-4 -rotate-90" /></button>
            </div>
            <div className="grid grid-cols-7 text-center">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="py-1.5 text-[10px] font-medium text-muted-foreground">{day}</span>)}
              {expenseCalendarDays.map((day) => {
                const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                const selected = iso === formValues.expenseDate;
                const inMonth = day.getMonth() === expenseCalendarMonth.getMonth();
                const disabled = iso > todayLocalIso();
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      updateFormField("expenseDate", iso);
                      setExpenseDatePickerOpen(false);
                    }}
                    className={`mx-auto my-0.5 flex aspect-square w-full max-w-8 items-center justify-center rounded-lg text-xs ${selected ? "bg-primary font-bold text-primary-foreground" : inMonth ? "text-foreground hover:bg-muted" : "text-muted-foreground/40"} ${disabled ? "cursor-not-allowed opacity-30" : ""}`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex justify-end border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  updateFormField("expenseDate", todayLocalIso());
                  setExpenseDatePickerOpen(false);
                }}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                Today
              </button>
            </div>
          </div>
        ) : null}
      </span>
      {fieldErrors.expenseDate ? <span className="mt-1 block text-xs text-destructive">{fieldErrors.expenseDate}</span> : null}
    </label>

    {/* Amount field */}
    <label className="block text-sm font-medium text-foreground">
      Amount (INR) <span className="text-primary">*</span>
      <span className="relative mt-1.5 block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">₹</span>
        <Input
          type="number"
          name="amount"
          min="0.01"
          max="9999999.99"
          step="0.01"
          inputMode="decimal"
          value={formValues.amount}
          onChange={(event) => updateFormField("amount", event.target.value)}
          required
          aria-invalid={Boolean(fieldErrors.amount)}
          placeholder="0.00"
          className={`h-9 w-full rounded-[12px] border bg-background pl-8 pr-3 text-sm outline-none transition ${fieldErrors.amount ? "border-destructive ring-2 ring-destructive/20 focus:border-destructive focus:ring-destructive/20" : "border-input focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
        />
      </span>
      {fieldErrors.amount ? <span className="mt-1 block text-xs text-destructive">{fieldErrors.amount}</span> : null}
    </label>
  </div>

  <div className="relative block text-sm font-medium text-foreground">
    <span>Handled By <span className="text-primary">*</span></span>
    <Popover open={specialistPickerOpen} onOpenChange={setSpecialistPickerOpen}>
    <PopoverTrigger asChild><button
      type="button"
      aria-expanded={specialistPickerOpen}
      aria-haspopup="listbox"
      aria-invalid={Boolean(fieldErrors.sourcingSpecialistIds)}
      className={`mt-1 flex h-9 w-full items-center gap-2 rounded-[12px] border bg-background px-3 text-left text-sm outline-none transition ${fieldErrors.sourcingSpecialistIds ? "border-destructive ring-2 ring-destructive/20 focus:border-destructive focus:ring-destructive/20" : "border-input hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
    >
      <UsersIcon className="size-4 shrink-0 text-primary" />
      <span className="flex-1 truncate text-foreground">
        {formValues.sourcingSpecialistIds.length
          ? `${formValues.sourcingSpecialistIds.length} selected`
          : "Choose one or more employees"}
      </span>
      <ChevronDown className={`size-4 text-muted-foreground transition ${specialistPickerOpen ? "rotate-180" : ""}`} />
    </button></PopoverTrigger>
    {formValues.sourcingSpecialistIds.length ? (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {sourcingSpecialists.filter((employee) => formValues.sourcingSpecialistIds.includes(employee.id)).map((employee) => (
          <button
            key={employee.id}
            type="button"
            onClick={() => toggleSourcingSpecialist(employee.id)}
            aria-label={`Remove ${employee.displayName}`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary/10"
          >
            <span className="truncate">{employee.displayName}</span><X className="size-3 shrink-0 text-primary" />
          </button>
        ))}
      </div>
    ) : null}
    {fieldErrors.sourcingSpecialistIds ? <p className="mt-1 text-xs text-destructive">{fieldErrors.sourcingSpecialistIds}</p> : null}
    <PopoverContent align="start" side="bottom" sideOffset={5} style={{ width: "min(34rem, var(--radix-popover-trigger-width))" }} className="z-[80] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-background p-0 shadow-lg">
        <div className="border-b border-border p-2">
          <Input
            type="search"
            value={specialistSearch}
            onChange={(event) => setSpecialistSearch(event.target.value)}
            placeholder="Search employees"
            aria-label="Search employees for Handled By"
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div role="listbox" aria-multiselectable="true" aria-label="Employees available for Handled By" className="max-h-[220px] overflow-y-auto">
          <div className="sticky top-0 z-10 grid grid-cols-[1rem_minmax(0,1fr)_9rem] items-center gap-2 border-b border-border bg-background px-2 py-2 text-[11px] font-semibold text-muted-foreground"><span aria-hidden="true" /><span>Name</span><span className="text-center">Phone number</span></div>
          {sourcingSpecialists.filter((employee) => `${employee.displayName} ${employee.mobile || ""}`.toLowerCase().includes(specialistSearch.trim().toLowerCase())).length ? (
            sourcingSpecialists
              .filter((employee) => `${employee.displayName} ${employee.mobile || ""}`.toLowerCase().includes(specialistSearch.trim().toLowerCase()))
              .map((employee) => {
                const selected = formValues.sourcingSpecialistIds.includes(employee.id);
                return (
                  <button
                    key={employee.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggleSourcingSpecialist(employee.id)}
                    className="grid min-h-8 w-full grid-cols-[1rem_minmax(0,1fr)_9rem] items-center gap-2 rounded-md px-2 text-left text-sm text-foreground hover:bg-muted"
                  >
                    <span className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>
                      {selected ? <Check className="size-3 stroke-[3]" /> : null}
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar className="size-6 shrink-0"><AvatarFallback className={`text-[9px] font-bold ${getEmployeeAvatarColorClass(employee)}`}>{getEmployeeInitials(employee.displayName)}</AvatarFallback></Avatar>
                      <span className="truncate">{employee.displayName}</span>
                    </span>
                    <span className="whitespace-nowrap text-center text-xs text-muted-foreground">{employee.mobile || "—"}</span>
                  </button>
                );
              })
          ) : (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">No active employees found.</p>
          )}
        </div>
    </PopoverContent>
    </Popover>
  </div>

  {receiptPicker}

  {/* Category / notes with a live character counter */}
  <label className="block text-sm font-medium text-foreground">
    <span className="flex items-center justify-between gap-3">
      <span>Category / notes <span className="text-muted-foreground">(optional)</span></span>
      <span aria-live="polite" className="shrink-0 text-xs font-normal text-muted-foreground">{formValues.categoryNotes.length}/250</span>
    </span>
    <textarea
      name="categoryNotes"
      rows={3}
      maxLength={250}
      value={formValues.categoryNotes}
      onChange={(event) => updateFormField("categoryNotes", event.target.value)}
      aria-invalid={Boolean(fieldErrors.categoryNotes)}
      placeholder="e.g. Fabric purchase, tailoring supplies, 2 Shirts order"
      className={`mt-1 block w-full resize-none rounded-[12px] border bg-background px-3 py-1.5 text-sm leading-relaxed outline-none transition placeholder:text-muted-foreground/80 ${fieldErrors.categoryNotes ? "border-destructive ring-2 ring-destructive/20 focus:border-destructive focus:ring-destructive/20" : "border-input focus:border-primary focus:ring-4 focus:ring-primary/10"}`}
    />
    {fieldErrors.categoryNotes ? <span className="mt-1 block text-xs text-destructive">{fieldErrors.categoryNotes}</span> : null}
  </label>

  {formError ? (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3 py-2.5 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{formError}</span>
    </div>
  ) : null}

  {/* Fixed footer: Cancel + Create expense */}
  <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-3 sm:flex-row sm:justify-end">
    <button
      type="button"
      onClick={requestCloseExpenseForm}
      disabled={saving}
      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-destructive/60 bg-background px-3 text-xs font-medium text-destructive shadow-2xs transition-colors hover:border-destructive hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
    >
      <X className="size-3.5" />
      Cancel
    </button>
    <button
      type="submit"
      disabled={saving}
      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {saving ? <LoaderCircle className="size-3.5 animate-spin" /> : editingExpense ? <Check className="size-3.5" /> : <UserRoundPlus className="size-3.5" />}
      {saving ? "Saving..." : editingExpense ? "Save Changes" : "Create expense"}
    </button>
  </div>
</form>
    </DialogShell>
  );
}
