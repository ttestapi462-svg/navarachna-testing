"use client";

import React, { useId, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isAfter, startOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";

const ASHOKA_CHAKRA_SPOKES = Array.from({ length: 24 }).map((_, i) => (
  <line
    key={i}
    x1="0"
    y1="0"
    x2="0"
    y2="20"
    stroke="#000080"
    strokeWidth="0.9"
    transform={`rotate(${i * 15})`}
  />
));

function IndiaFlag({ className, title = "India" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 640 480" className={cn("w-5 h-3.5 rounded-2xs object-cover shrink-0", className)} aria-hidden="true">
      {title && <title>{title}</title>}
      <path fill="#FF9933" d="M0 0h640v160H0z" />
      <path fill="#FFFFFF" d="M0 160h640v160H0z" />
      <path fill="#128807" d="M0 320h640v160H0z" />
      <g transform="matrix(3.2 0 0 3.2 320 240)">
        <circle r="20" fill="none" stroke="#000080" strokeWidth="2" />
        <circle r="3.5" fill="#000080" />
        {ASHOKA_CHAKRA_SPOKES}
      </g>
    </svg>
  );
}
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  employeeSchema,
  type EmployeeFormData,
  DEPARTMENTS,
} from "@/lib/validations/employee";
import { getDesignationMeta } from "@/lib/designation-config";
import {
  useCreateEmployee,
  useUpdateEmployee,
} from "@/services/employee-service";
import type { EmployeeResponse, EmployeeRequest } from "@/types/employee";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  UserRoundPlus,
  UserRoundPen,
  Edit3,
  Loader2,
  ShieldAlert,
  User,
  Mail,
  Briefcase,
  Building2,
  CalendarIcon,
  CreditCard,
  Fingerprint,
  InfoIcon,
  X,
  Check,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeResponse | null;
}

export function EmployeeFormSheet({
  open,
  onOpenChange,
  employee,
}: EmployeeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <EmployeeFormDialogContent
          employee={employee}
          onOpenChange={onOpenChange}
        />
      )}
    </Dialog>
  );
}

function EmployeeFormDialogContent({
  employee,
  onOpenChange,
}: {
  employee?: EmployeeResponse | null;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(employee);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    mode: "onTouched",
    defaultValues: isEdit && employee
      ? {
          firstName: employee.firstName,
          lastName: employee.lastName || "",
          email: employee.email,
          mobile: employee.mobile,
          panNumber: "",
          aadhaarNumber: "",
          department: employee.department || "Master Tailor",
          salary: employee.salary,
          dateOfJoining: employee.dateOfJoining,
        }
      : {
          firstName: "",
          lastName: "",
          email: "",
          mobile: "",
          panNumber: "",
          aadhaarNumber: "",
          department: "Master Tailor",
          salary: 35000,
          dateOfJoining: new Date().toISOString().split("T")[0],
        },
  });

  const onSubmit = async (data: EmployeeFormData) => {
    setConflictError(null);
    try {
      if (isEdit && employee) {
        const payload: EmployeeRequest = {
          firstName: data.firstName.trim(),
          lastName: data.lastName?.trim() || undefined,
          email: data.email.trim(),
          mobile: data.mobile.trim(),
          panNumber: data.panNumber ? data.panNumber.toUpperCase().trim() : undefined,
          aadhaarNumber: data.aadhaarNumber ? data.aadhaarNumber.trim() : undefined,
          department: data.department,
          salary: Number(data.salary),
          dateOfJoining: data.dateOfJoining,
          version: employee.version,
        };
        await updateMutation.mutateAsync({ id: employee.id, data: payload });
      } else {
        const payload: EmployeeRequest = {
          firstName: data.firstName.trim(),
          lastName: data.lastName?.trim() || undefined,
          email: data.email.trim(),
          mobile: data.mobile.trim(),
          panNumber: data.panNumber ? data.panNumber.toUpperCase().trim() : undefined,
          aadhaarNumber: data.aadhaarNumber ? data.aadhaarNumber.trim() : undefined,
          department: data.department,
          salary: Number(data.salary),
          dateOfJoining: data.dateOfJoining,
        };
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setConflictError(msg);
    }
  };

  const isPending =
    isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <DialogContent
      showCloseButton={false}
      className="flex max-h-[calc(100vh-2rem)] w-full max-w-[calc(100vw-2rem)] sm:max-w-xl md:max-w-2xl flex-col overflow-hidden p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl bg-card animate-in fade-in-0 zoom-in-98 duration-100"
    >
        {/* Sticky Header with Light Pink Atelier Brand Identity */}
        <DialogHeader className="bg-gradient-to-r from-rose-50/95 via-pink-50/70 to-rose-50/95 dark:from-rose-950/40 dark:via-pink-950/25 dark:to-rose-950/40 sticky top-0 z-10 border-b border-rose-200/70 dark:border-rose-900/40 px-5 py-3 sm:py-3.5 text-left flex flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-white dark:bg-card text-primary border border-rose-200/90 dark:border-rose-900/60 shadow-xs shrink-0">
              {isEdit ? (
                <UserRoundPen className="size-4 stroke-[1.8]" />
              ) : (
                <UserRoundPlus className="size-4 stroke-[1.8]" />
              )}
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-foreground tracking-tight">
                {isEdit ? "Edit Employee Profile" : "Register New Employee"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
                {isEdit ? (
                  <span>
                    Updating profile for{" "}
                    <span className="font-semibold text-primary underline decoration-primary/40 underline-offset-2">
                      {employee?.firstName} {employee?.lastName || ""}
                    </span>
                    .
                  </span>
                ) : (
                  "Fill in employee details to create a staff record and profile."
                )}
              </DialogDescription>
            </div>
          </div>

          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-rose-100/70 dark:hover:bg-rose-900/40 active:bg-rose-200/50 cursor-pointer shrink-0 transition-colors"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogHeader>

        {/* Scrollable Form Body with Clean WebKit & Firefox Scrollbars */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3.5 sm:py-4 [scrollbar-width:thin] [scrollbar-color:var(--scrollbar-thumb)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <form
            id="employee-form"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-3"
          >
            {conflictError && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 flex items-start gap-2.5 text-xs text-destructive">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Conflict Detected</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    {conflictError}
                  </p>
                </div>
              </div>
            )}

            {/* ── CARD 1: Personal Information ──────────────────────────── */}
            <div className="rounded-xl border border-border/60 bg-muted/15 p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-1.5 pb-1 border-b border-border/40">
                <User className="size-3.5 text-primary shrink-0" />
                <h3 className="text-xs font-semibold text-foreground tracking-tight">
                  Personal Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* First Name: 2-50 characters */}
                <Field className="gap-1">
                  <FieldLabel className={cn("text-[11px] font-medium", errors.firstName ? "text-destructive" : "text-foreground/85")}>
                    First Name <span className="text-destructive font-bold">*</span>
                  </FieldLabel>
                  <InputGroup
                    aria-invalid={!!errors.firstName}
                    className={cn(
                      "h-8 transition-all",
                      errors.firstName
                        ? "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
                        : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
                    )}
                  >
                    <InputGroupInput
                      maxLength={50}
                      {...register("firstName")}
                      placeholder="Rajesh"
                      className="text-xs placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                      aria-invalid={!!errors.firstName}
                    />
                    <InputGroupAddon align="inline-end">
                      <User className={cn("size-3.5", errors.firstName ? "text-destructive" : "text-muted-foreground/70")} />
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.firstName && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.firstName.message}</span>
                    </FieldError>
                  )}
                </Field>

                {/* Last Name: 2-50 characters */}
                <Field className="gap-1">
                  <FieldLabel className={cn("text-[11px] font-medium", errors.lastName ? "text-destructive" : "text-foreground/85")}>
                    Last Name
                  </FieldLabel>
                  <InputGroup
                    aria-invalid={!!errors.lastName}
                    className={cn(
                      "h-8 transition-all",
                      errors.lastName
                        ? "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
                        : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
                    )}
                  >
                    <InputGroupInput
                      maxLength={50}
                      {...register("lastName")}
                      placeholder="Verma"
                      className="text-xs placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                      aria-invalid={!!errors.lastName}
                    />
                    <InputGroupAddon align="inline-end">
                      <User className={cn("size-3.5", errors.lastName ? "text-destructive" : "text-muted-foreground/70")} />
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.lastName && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.lastName.message}</span>
                    </FieldError>
                  )}
                </Field>

                {/* Email Address */}
                <Field className="gap-1">
                  <FieldLabel className={cn("text-[11px] font-medium", errors.email ? "text-destructive" : "text-foreground/85")}>
                    Email Address <span className="text-destructive font-bold">*</span>
                  </FieldLabel>
                  <InputGroup
                    aria-invalid={!!errors.email}
                    className={cn(
                      "h-8 transition-all",
                      errors.email
                        ? "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
                        : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
                    )}
                  >
                    <InputGroupInput
                      type="email"
                      {...register("email")}
                      placeholder="name@navarachna.com"
                      className="text-xs placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                      aria-invalid={!!errors.email}
                    />
                    <InputGroupAddon align="inline-end">
                      <Mail className={cn("size-3.5", errors.email ? "text-destructive" : "text-muted-foreground/70")} />
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.email && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.email.message}</span>
                    </FieldError>
                  )}
                </Field>

                {/* Mobile Number: Exactly 10 digits with Indian Flag only, no +91 text */}
                <Field className="gap-1">
                  <FieldLabel className={cn("text-[11px] font-medium", errors.mobile ? "text-destructive" : "text-foreground/85")}>
                    Mobile Number <span className="text-destructive font-bold">*</span>
                  </FieldLabel>
                  <InputGroup
                    aria-invalid={!!errors.mobile}
                    className={cn(
                      "h-8 transition-all",
                      errors.mobile
                        ? "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
                        : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
                    )}
                  >
                    <InputGroupAddon className="bg-muted/30 px-2.5 border-r border-border/70 select-none">
                      <span className="w-5 h-3.5 overflow-hidden rounded-xs shrink-0 flex items-center justify-center border border-border/40 shadow-2xs">
                        <IndiaFlag title="India" />
                      </span>
                    </InputGroupAddon>
                    <InputGroupInput
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                      {...register("mobile", {
                        onChange: (e) => {
                          // Restrict strictly to digits only, max 10 characters
                          e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
                        },
                      })}
                      placeholder="98765 43210"
                      className="text-xs placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                      aria-invalid={!!errors.mobile}
                    />
                  </InputGroup>
                  {errors.mobile && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.mobile.message}</span>
                    </FieldError>
                  )}
                </Field>
              </div>
            </div>

            {/* ── CARD 2: Atelier Employment ─────────────────────────── */}
            <div className="rounded-xl border border-border/60 bg-muted/15 p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-1.5 pb-1 border-b border-border/40">
                <Briefcase className="size-3.5 text-primary shrink-0" />
                <h3 className="text-xs font-semibold text-foreground tracking-tight">
                  Atelier Employment
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Department */}
                <Field className="gap-1">
                  <FieldLabel className={cn("text-[11px] font-medium", errors.department ? "text-destructive" : "text-foreground/85")}>
                    Department <span className="text-destructive font-bold">*</span>
                  </FieldLabel>
                  <Controller
                    name="department"
                    control={control}
                    render={({ field }) => {
                      return (
                        <Combobox
                          items={[...DEPARTMENTS]}
                          value={field.value}
                          onValueChange={(val) => field.onChange(val as string)}
                          itemToStringValue={(item: string) => item}
                        >
                          <ComboboxTrigger
                            render={
                              <Button
                                variant="outline"
                                className={cn(
                                  "h-8 w-full justify-between font-normal text-xs bg-background border-border/80 px-2.5",
                                  errors.department && "border-destructive ring-2 ring-destructive/20"
                                )}
                                disabled={isPending}
                                type="button"
                              />
                            }
                          >
                            <ComboboxValue placeholder="Select department">
                              {(val: string) => {
                                if (!val) {
                                  return (
                                    <span className="text-muted-foreground/60 text-xs">
                                      Select department
                                    </span>
                                  );
                                }
                                const meta = getDesignationMeta(val);
                                const Icon = meta.icon;
                                return (
                                  <span className="flex items-center gap-2 truncate text-left">
                                    <Icon className={cn("size-3.5 shrink-0", meta.iconColor)} />
                                    <span className="truncate text-foreground font-medium text-xs">
                                      {val}
                                    </span>
                                  </span>
                                );
                              }}
                            </ComboboxValue>
                          </ComboboxTrigger>
                          <ComboboxContent className="w-(--anchor-width) min-w-[240px] max-w-xs rounded-xl border border-border/70 shadow-xl bg-popover p-1.5 overflow-hidden flex flex-col">
                            <ComboboxInput
                              showTrigger={false}
                              placeholder="Search department..."
                              className="h-8 text-xs mb-1 shrink-0"
                            />
                            <ComboboxEmpty className="py-2.5 px-3 text-xs text-muted-foreground">
                              No departments found.
                            </ComboboxEmpty>
                            <ComboboxList className="max-h-52 overflow-y-auto overscroll-contain pr-1">
                              {(item: string) => {
                                const meta = getDesignationMeta(item);
                                const Icon = meta.icon;
                                return (
                                  <ComboboxItem
                                    key={item}
                                    value={item}
                                    className="text-xs py-1.5 px-2 rounded-md cursor-pointer flex items-center gap-2 hover:bg-muted/70 transition-colors"
                                  >
                                    <div
                                      className={cn(
                                        "flex size-5 items-center justify-center rounded-md shrink-0 shadow-2xs",
                                        meta.bgLight
                                      )}
                                    >
                                      <Icon className={cn("size-3", meta.iconColor)} />
                                    </div>
                                    <span className="font-medium text-foreground">{item}</span>
                                  </ComboboxItem>
                                );
                              }}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      );
                    }}
                  />
                  {errors.department && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.department.message}</span>
                    </FieldError>
                  )}
                </Field>

                {/* Monthly Compensation */}
                <Field className="gap-1">
                  <FieldLabel className={cn("text-[11px] font-medium", errors.salary ? "text-destructive" : "text-foreground/85")}>
                    Monthly Compensation <span className="text-destructive font-bold">*</span>
                  </FieldLabel>
                  <InputGroup
                    aria-invalid={!!errors.salary}
                    className={cn(
                      "h-8 transition-all",
                      errors.salary
                        ? "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
                        : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
                    )}
                  >
                    <InputGroupAddon>
                      <InputGroupText className={cn("font-semibold text-xs", errors.salary ? "text-destructive" : "text-foreground")}>
                        ₹
                      </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      type="number"
                      step="500"
                      min="0"
                      {...register("salary")}
                      placeholder="35000"
                      className="font-mono text-xs h-8"
                      disabled={isPending}
                      aria-invalid={!!errors.salary}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText className="text-[10px] text-muted-foreground font-medium uppercase">
                        INR / mo
                      </InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.salary && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.salary.message}</span>
                    </FieldError>
                  )}
                </Field>

                {/* Date of Joining: NO FUTURE DATES */}
                <Field className="gap-1">
                  <FieldLabel className={cn("text-[11px] font-medium", errors.dateOfJoining ? "text-destructive" : "text-foreground/85")}>
                    Date of Joining <span className="text-destructive font-bold">*</span>
                  </FieldLabel>
                  <Controller
                    name="dateOfJoining"
                    control={control}
                    render={({ field }) => (
                      <DatePickerField
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isPending}
                        hasError={!!errors.dateOfJoining}
                      />
                    )}
                  />
                  {errors.dateOfJoining && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.dateOfJoining.message}</span>
                    </FieldError>
                  )}
                </Field>
              </div>
            </div>

            {/* ── CARD 3: Identity & Statutory Compliance ───────────────── */}
            <div className="rounded-xl border border-border/60 bg-muted/15 p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary shrink-0" />
                  <h3 className="text-xs font-semibold text-foreground tracking-tight">
                    Identity & Statutory <span className="text-[11px] font-normal text-muted-foreground">(Optional)</span>
                  </h3>
                </div>
                {isEdit && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Leave blank to keep existing
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* PAN Number */}
                <Field className="gap-1">
                  <FieldLabel className={cn("text-[11px] font-medium", errors.panNumber ? "text-destructive" : "text-foreground/85")}>
                    PAN Number
                  </FieldLabel>
                  <InputGroup
                    aria-invalid={!!errors.panNumber}
                    className={cn(
                      "h-8 transition-all",
                      errors.panNumber
                        ? "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
                        : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
                    )}
                  >
                    <InputGroupAddon>
                      <CreditCard className={cn("size-3.5", errors.panNumber ? "text-destructive" : "text-muted-foreground/70")} />
                    </InputGroupAddon>
                    <InputGroupInput
                      maxLength={10}
                      {...register("panNumber")}
                      placeholder={
                        isEdit && employee?.panMasked
                          ? employee.panMasked
                          : "ABCDE1234F"
                      }
                      onChange={(e) =>
                        setValue("panNumber", e.target.value.toUpperCase())
                      }
                      className="font-mono uppercase text-xs placeholder:normal-case placeholder:font-sans placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                      aria-invalid={!!errors.panNumber}
                    />
                    <InputGroupAddon align="inline-end">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InputGroupButton
                              variant="ghost"
                              size="icon-xs"
                              tabIndex={-1}
                              className="size-5 rounded-md hover:bg-muted/60"
                            >
                              <InfoIcon className="size-3.5 text-muted-foreground/70" />
                            </InputGroupButton>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Permanent Account Number (10 alphanumeric chars: ABCDE1234F)
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.panNumber && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.panNumber.message}</span>
                    </FieldError>
                  )}
                  {isEdit && employee?.panMasked && (
                    <FieldDescription className="text-[10px] text-muted-foreground mt-0.5">
                      Current stored: {employee.panMasked}
                    </FieldDescription>
                  )}
                </Field>

                {/* 12-Digit Aadhaar */}
                <Field className="gap-1">
                  <FieldLabel className={cn("text-[11px] font-medium", errors.aadhaarNumber ? "text-destructive" : "text-foreground/85")}>
                    12-Digit Aadhaar
                  </FieldLabel>
                  <InputGroup
                    aria-invalid={!!errors.aadhaarNumber}
                    className={cn(
                      "h-8 transition-all",
                      errors.aadhaarNumber
                        ? "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
                        : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
                    )}
                  >
                    <InputGroupAddon>
                      <Fingerprint className={cn("size-3.5", errors.aadhaarNumber ? "text-destructive" : "text-muted-foreground/70")} />
                    </InputGroupAddon>
                    <InputGroupInput
                      maxLength={12}
                      {...register("aadhaarNumber", {
                        onChange: (e) => {
                          e.target.value = e.target.value.replace(/\D/g, "").slice(0, 12);
                        },
                      })}
                      placeholder={
                        isEdit && employee?.aadhaarMasked
                          ? employee.aadhaarMasked
                          : "2345 6789 0123"
                      }
                      className="font-mono text-xs placeholder:font-sans placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                      aria-invalid={!!errors.aadhaarNumber}
                    />
                    <InputGroupAddon align="inline-end">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InputGroupButton
                              variant="ghost"
                              size="icon-xs"
                              tabIndex={-1}
                              className="size-5 rounded-md hover:bg-muted/60"
                            >
                              <InfoIcon className="size-3.5 text-muted-foreground/70" />
                            </InputGroupButton>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            12-digit Indian Aadhaar UID (starts with 2-9)
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.aadhaarNumber && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.aadhaarNumber.message}</span>
                    </FieldError>
                  )}
                  {isEdit && employee?.aadhaarMasked && (
                    <FieldDescription className="text-[10px] text-muted-foreground mt-0.5">
                      Current stored: {employee.aadhaarMasked}
                    </FieldDescription>
                  )}
                </Field>
              </div>
            </div>
          </form>
        </div>

        {/* Sticky Footer Actions */}
        <DialogFooter className="bg-card sticky bottom-0 z-10 border-t border-border/70 px-5 py-2.5 sm:py-3 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-xs h-8 px-3 border-destructive/60 text-destructive hover:bg-destructive/10 hover:border-destructive hover:text-destructive cursor-pointer transition-colors inline-flex items-center gap-1.5"
          >
            <X className="size-3.5" />
            <span>Cancel</span>
          </Button>
          <Button
            type="submit"
            form="employee-form"
            size="sm"
            disabled={isPending}
            className="text-xs h-8 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium cursor-pointer shadow-xs transition-colors focus-visible:ring-emerald-500/30 inline-flex items-center gap-1.5"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : isEdit ? (
              <>
                <Check className="size-3.5" />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <UserRoundPlus className="size-3.5" />
                <span>Register Employee</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

// ─── Date Picker Sub-Component (ReUI c-calendar-1 Pattern with Strict Validation) ───
function DatePickerField({
  value,
  onChange,
  disabled,
  hasError,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const id = useId();
  const today = useMemo(() => startOfDay(new Date()), []);
  const dateValue = value ? new Date(value + "T00:00:00") : undefined;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          className={cn(
            "group/pick-date w-full justify-between text-xs h-8 bg-background border border-border/80 hover:bg-muted/40 font-normal",
            hasError && "border-destructive ring-2 ring-destructive/20"
          )}
          id={id}
          variant="outline"
          type="button"
        >
          <span
            className={cn(
              "truncate",
              !dateValue && "text-muted-foreground/60"
            )}
          >
            {dateValue ? format(dateValue, "LLL dd, y") : "Pick joining date"}
          </span>
          <CalendarIcon
            aria-hidden="true"
            className="text-muted-foreground/70 group-hover/pick-date:text-foreground shrink-0 size-3.5 transition-colors"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0 border-none shadow-xl bg-transparent">
        <Card className="p-0">
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={dateValue}
              defaultMonth={dateValue || today}
              endMonth={today}
              disabled={(d) => isAfter(startOfDay(d), today)}
              onSelect={(d) => {
                if (d) {
                  if (isAfter(startOfDay(d), today)) return;
                  onChange(format(d, "yyyy-MM-dd"));
                  setIsOpen(false);
                }
              }}
            />
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

export const EmployeeFormDialog = EmployeeFormSheet;
