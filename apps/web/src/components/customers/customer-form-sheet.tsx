"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useCreateCustomer,
  useUpdateCustomer,
} from "@/services/customer-service";
import {
  customerSchema,
  type CustomerFormValues,
} from "@/lib/validations/customer";
import type { Customer } from "@/types/customer";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  User,
  Phone,
  MessageCircle,
  MapPin,
  Building,
  FileText,
  Loader2,
  Check,
  UserRoundPen,
  UserRoundPlus,
  X,
  AlertCircle,
} from "lucide-react";

const MAX_REMARKS_CHARS = 250;

interface CustomerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

function IndiaFlag({
  className,
  title = "India",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 640 480"
      className={cn("w-5 h-3.5 rounded-2xs object-cover shrink-0", className)}
      aria-hidden="true"
    >
      {title && <title>{title}</title>}
      <path fill="#FF9933" d="M0 0h640v160H0z" />
      <path fill="#FFFFFF" d="M0 160h640v160H0z" />
      <path fill="#128807" d="M0 320h640v160H0z" />
      <circle
        cx="320"
        cy="240"
        r="28"
        fill="none"
        stroke="#000080"
        strokeWidth="5"
      />
    </svg>
  );
}

export function CustomerFormSheet({
  open,
  onOpenChange,
  customer,
}: CustomerFormSheetProps) {
  const isEdit = Boolean(customer);
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [sameAsMobile, setSameAsMobile] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      mobileNumber: "",
      whatsappNumber: "",
      alternateMobile: "",
      address: "",
      area: "",
      city: "",
      remarks: "",
      profilePhotoUrl: "",
      isActive: true,
    },
  });

  const mobileValue = watch("mobileNumber") || "";
  const whatsappValue = watch("whatsappNumber") || "";
  const isActiveValue = watch("isActive");
  const remarksValue = watch("remarks") || "";

  const remarksRemaining = MAX_REMARKS_CHARS - remarksValue.length;
  const isNearLimit = remarksRemaining <= 20;
  const isAtLimit = remarksRemaining === 0;

  const remarksTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleRemarksChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (newValue.length <= MAX_REMARKS_CHARS) {
        setValue("remarks", newValue, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      const textarea = remarksTextareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    },
    [setValue]
  );

  useEffect(() => {
    if (open) {
      if (customer) {
        const isSame =
          Boolean(customer.mobileNumber) &&
          Boolean(customer.whatsappNumber) &&
          customer.whatsappNumber === customer.mobileNumber;
        setSameAsMobile(isSame);
        reset({
          name: customer.name || "",
          mobileNumber: customer.mobileNumber || "",
          whatsappNumber: customer.whatsappNumber || (isSame ? customer.mobileNumber : "") || "",
          alternateMobile: customer.alternateMobile || "",
          address: customer.address || "",
          area: customer.area || "",
          city: customer.city || "",
          remarks: customer.remarks || "",
          profilePhotoUrl: customer.profilePhotoUrl || "",
          isActive: customer.isActive ?? true,
        });
      } else {
        setSameAsMobile(true);
        reset({
          name: "",
          mobileNumber: "",
          whatsappNumber: "",
          alternateMobile: "",
          address: "",
          area: "",
          city: "",
          remarks: "",
          profilePhotoUrl: "",
          isActive: true,
        });
      }

      // Auto-fit height when customer profile opens/loads
      requestAnimationFrame(() => {
        const textarea = remarksTextareaRef.current;
        if (textarea) {
          textarea.style.height = "auto";
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      });
    }
  }, [open, customer, reset]);

  const onInvalid = (fieldErrors: FieldErrors<CustomerFormValues>) => {
    const errorCount = Object.keys(fieldErrors).length;
    const firstMsg = Object.values(fieldErrors).find((e) => e?.message)?.message;
    toast.warning("Please check required fields", {
      description:
        typeof firstMsg === "string"
          ? firstMsg
          : `Please review ${errorCount} incomplete or invalid field${
              errorCount > 1 ? "s" : ""
            }.`,
    });
  };

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      const payload = {
        name: values.name.trim(),
        mobileNumber: values.mobileNumber.trim(),
        whatsappNumber: (sameAsMobile
          ? values.mobileNumber
          : values.whatsappNumber
        ).trim(),
        alternateMobile: values.alternateMobile?.trim() || null,
        address: values.address?.trim() || null,
        area: values.area?.trim() || null,
        city: values.city?.trim() || null,
        remarks: values.remarks?.trim() || null,
        profilePhotoUrl: values.profilePhotoUrl?.trim() || null,
        isActive: values.isActive,
      };

      if (isEdit && customer) {
        await updateMutation.mutateAsync({
          id: customer.id,
          data: payload,
        });
        toast.success("Customer profile updated", {
          description: `${values.name}'s information has been updated.`,
        });
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Customer created successfully", {
          description: `${values.name} has been enrolled in the atelier.`,
        });
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "An error occurred while saving the customer.";
      toast.error(isEdit ? "Update failed" : "Creation failed", {
        description: msg,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-[calc(100vw-2rem)] sm:max-w-xl md:max-w-2xl flex-col overflow-hidden p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl bg-card animate-in fade-in-0 zoom-in-98 duration-100 z-50"
      >
        {/* Sticky Header with Atelier Brand Identity */}
        <DialogHeader className="bg-gradient-to-r from-primary/10 via-accent/25 to-background sticky top-0 z-10 border-b border-border px-5 py-3 sm:py-3.5 text-left flex flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-8 items-center justify-center rounded-full bg-white dark:bg-card text-primary border border-border/80 shadow-xs shrink-0">
              {isEdit ? (
                <UserRoundPen className="size-4 stroke-[1.8]" />
              ) : (
                <UserRoundPlus className="size-4 stroke-[1.8]" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold text-foreground tracking-tight truncate">
                {isEdit ? "Edit Customer Profile" : "Register New Customer"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {isEdit ? (
                  <span>
                    Updating profile for{" "}
                    <span className="font-semibold text-primary underline decoration-primary/40 underline-offset-2">
                      {customer?.name}
                    </span>
                    .
                  </span>
                ) : (
                  "Capture client contact, delivery address, and atelier specifications."
                )}
              </DialogDescription>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer shrink-0 transition-colors"
                >
                  <X className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Close dialog (Esc)</p>
            </TooltipContent>
          </Tooltip>
        </DialogHeader>

        {/* Scrollable Form Body with Clean WebKit & Firefox Scrollbars */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3.5 sm:py-4 [scrollbar-width:thin] [scrollbar-color:var(--scrollbar-thumb)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <form
            id="customer-form"
            noValidate
            onSubmit={handleSubmit(onSubmit, onInvalid)}
            className="space-y-3"
          >
            {/* ── CARD 1: Personal & Contact Information (2x2 Symmetrical Grid) ── */}
            <div className="rounded-xl border border-border/60 bg-muted/15 p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-1.5 pb-1 border-b border-border/40">
                <User className="size-3.5 text-primary shrink-0" />
                <h3 className="text-xs font-semibold text-foreground tracking-tight">
                  Personal & Contact Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Customer Name */}
                <Field className="gap-1">
                  <FieldLabel
                    className={cn(
                      "text-[11px] font-medium",
                      errors.name ? "text-destructive" : "text-foreground/85"
                    )}
                  >
                    Customer Name <span className="text-destructive font-bold">*</span>
                  </FieldLabel>
                  <InputGroup
                    aria-invalid={!!errors.name}
                    className={cn(
                      "h-8 transition-all",
                      errors.name
                        ? "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
                        : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
                    )}
                  >
                    <InputGroupInput
                      maxLength={100}
                      {...register("name")}
                      placeholder="e.g. Priya Sundaram"
                      className="text-xs placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                      aria-invalid={!!errors.name}
                    />
                    <InputGroupAddon align="inline-end">
                      <User
                        className={cn(
                          "size-3.5",
                          errors.name
                            ? "text-destructive"
                            : "text-muted-foreground/70"
                        )}
                      />
                    </InputGroupAddon>
                  </InputGroup>
                  {errors.name && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.name.message}</span>
                    </FieldError>
                  )}
                </Field>

                {/* 2. Mobile Number (10 digits with India Flag) */}
                <Field className="gap-1">
                  <FieldLabel
                    className={cn(
                      "text-[11px] font-medium",
                      errors.mobileNumber ? "text-destructive" : "text-foreground/85"
                    )}
                  >
                    Mobile Number <span className="text-destructive font-bold">*</span>
                  </FieldLabel>
                  <InputGroup
                    aria-invalid={!!errors.mobileNumber}
                    className={cn(
                      "h-8 transition-all",
                      errors.mobileNumber
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
                      {...register("mobileNumber", {
                        onChange: (e) => {
                          const cleaned = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          e.target.value = cleaned;
                          setValue("mobileNumber", cleaned, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          if (sameAsMobile) {
                            setValue("whatsappNumber", cleaned, {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }
                        },
                      })}
                      placeholder="98765 43210"
                      className="text-xs placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                      aria-invalid={!!errors.mobileNumber}
                    />
                  </InputGroup>
                  {errors.mobileNumber && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.mobileNumber.message}</span>
                    </FieldError>
                  )}
                </Field>

                {/* 3. WhatsApp Number with Same as Mobile Checkbox */}
                <Field className="gap-1">
                  <div className="flex items-center justify-between">
                    <FieldLabel
                      htmlFor="whatsappNumber"
                      className={cn(
                        "text-[11px] font-medium",
                        errors.whatsappNumber
                          ? "text-destructive"
                          : "text-foreground/85"
                      )}
                    >
                      WhatsApp Number <span className="text-destructive font-bold">*</span>
                    </FieldLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[10.5px] text-muted-foreground hover:text-foreground select-none">
                          <Checkbox
                            checked={sameAsMobile}
                            onCheckedChange={(checked) => {
                              const isSame = Boolean(checked);
                              setSameAsMobile(isSame);
                              if (isSame) {
                                setValue("whatsappNumber", mobileValue || "", {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                              } else {
                                setValue("whatsappNumber", "", {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                              }
                            }}
                          />
                          <span>Same as Mobile</span>
                        </label>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Auto-sync with primary mobile</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <InputGroup
                    aria-invalid={!!errors.whatsappNumber}
                    className={cn(
                      "h-8 transition-all",
                      sameAsMobile
                        ? "bg-muted/40 opacity-80"
                        : "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15",
                      errors.whatsappNumber
                        ? "border-destructive ring-2 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20"
                        : ""
                    )}
                  >
                    <InputGroupAddon align="inline-start">
                      <WhatsAppIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    </InputGroupAddon>
                    <InputGroupInput
                      id="whatsappNumber"
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                      readOnly={sameAsMobile}
                      disabled={isPending}
                      value={sameAsMobile ? (mobileValue || "") : (whatsappValue || "")}
                      onChange={(e) => {
                        if (!sameAsMobile) {
                          const cleaned = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          setValue("whatsappNumber", cleaned, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }
                      }}
                      placeholder={sameAsMobile ? (mobileValue || "Same as mobile") : "98765 43210"}
                      className={cn(
                        "text-xs placeholder:text-muted-foreground/60 h-8",
                        sameAsMobile
                          ? "cursor-not-allowed select-none text-muted-foreground"
                          : "text-foreground"
                      )}
                      aria-invalid={!!errors.whatsappNumber}
                    />
                  </InputGroup>
                  {errors.whatsappNumber && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.whatsappNumber.message}</span>
                    </FieldError>
                  )}
                </Field>

                {/* 4. Alternate Phone Number */}
                <Field className="gap-1">
                  <FieldLabel
                    className={cn(
                      "text-[11px] font-medium",
                      errors.alternateMobile
                        ? "text-destructive"
                        : "text-foreground/85"
                    )}
                  >
                    Alternate Phone{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </FieldLabel>
                  <InputGroup
                    aria-invalid={!!errors.alternateMobile}
                    className={cn(
                      "h-8 transition-all",
                      errors.alternateMobile
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
                      {...register("alternateMobile", {
                        onChange: (e) => {
                          e.target.value = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                        },
                      })}
                      placeholder="91234 56780"
                      className="text-xs placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                      aria-invalid={!!errors.alternateMobile}
                    />
                  </InputGroup>
                  {errors.alternateMobile && (
                    <FieldError className="text-[11px] font-medium text-destructive flex items-center gap-1 mt-0.5">
                      <AlertCircle className="size-3 shrink-0" />
                      <span>{errors.alternateMobile.message}</span>
                    </FieldError>
                  )}
                </Field>

                {/* 5. Simple & Compact Segmented Client Status Selector */}
                <div className="sm:col-span-2 pt-1.5 border-t border-border/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <FieldLabel className="text-[11px] font-medium text-foreground/85 mb-0">
                      Client Status
                    </FieldLabel>
                    <span className="text-destructive font-bold text-xs">*</span>
                  </div>

                  <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/50 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        setValue("isActive", true, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                        isActiveValue
                          ? "bg-card text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold border border-emerald-500/25 ring-1 ring-emerald-500/15"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          isActiveValue
                            ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]"
                            : "bg-muted-foreground/30"
                        )}
                      />
                      <span>Active Client</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setValue("isActive", false, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                        !isActiveValue
                          ? "bg-card text-red-700 dark:text-red-400 shadow-2xs font-semibold border border-red-500/25 ring-1 ring-red-500/15"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          !isActiveValue
                            ? "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.6)]"
                            : "bg-muted-foreground/30"
                        )}
                      />
                      <span>Inactive Client</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CARD 2: Location & Delivery Details ── */}
            <div className="rounded-xl border border-border/60 bg-muted/15 p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-1.5 pb-1 border-b border-border/40">
                <MapPin className="size-3.5 text-primary shrink-0" />
                <h3 className="text-xs font-semibold text-foreground tracking-tight">
                  Location & Delivery Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* City */}
                <Field className="gap-1">
                  <FieldLabel className="text-[11px] font-medium text-foreground/85">
                    City
                  </FieldLabel>
                  <InputGroup className="h-8 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
                    <InputGroupInput
                      {...register("city")}
                      placeholder="e.g. Chennai"
                      className="text-xs placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                    />
                    <InputGroupAddon align="inline-end">
                      <Building className="size-3.5 text-muted-foreground/70" />
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                {/* Area / Landmark */}
                <Field className="gap-1">
                  <FieldLabel className="text-[11px] font-medium text-foreground/85">
                    Area / Landmark
                  </FieldLabel>
                  <InputGroup className="h-8 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
                    <InputGroupInput
                      {...register("area")}
                      placeholder="e.g. T. Nagar, Anna Nagar"
                      className="text-xs placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                    />
                    <InputGroupAddon align="inline-end">
                      <MapPin className="size-3.5 text-muted-foreground/70" />
                    </InputGroupAddon>
                  </InputGroup>
                </Field>

                {/* Street Address (Spans both cols symmetrically) */}
                <Field className="gap-1 sm:col-span-2">
                  <FieldLabel className="text-[11px] font-medium text-foreground/85">
                    Street Address{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </FieldLabel>
                  <InputGroup className="h-8 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
                    <InputGroupInput
                      {...register("address")}
                      placeholder="Door no., street name, apartment / flat details..."
                      className="text-xs placeholder:text-muted-foreground/60 h-8"
                      disabled={isPending}
                    />
                    <InputGroupAddon align="inline-end">
                      <MapPin className="size-3.5 text-muted-foreground/70" />
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
              </div>
            </div>

            {/* ── CARD 3: Preferences & Atelier Notes ── */}
            <div className="rounded-xl border border-border/60 bg-muted/15 p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-1.5 pb-1 border-b border-border/40">
                <FileText className="size-3.5 text-primary shrink-0" />
                <h3 className="text-xs font-semibold text-foreground tracking-tight">
                  Preferences & Atelier Notes
                </h3>
              </div>

              <Field className="w-full gap-1.5">
                <div className="flex items-center justify-between">
                  <FieldLabel
                    htmlFor="remarks"
                    className="text-[11px] font-medium text-foreground/85"
                  >
                    Special Remarks / Fitting Notes{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </FieldLabel>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      isAtLimit
                        ? "text-destructive font-semibold"
                        : isNearLimit
                          ? "text-amber-600 dark:text-amber-400 font-medium"
                          : "text-muted-foreground"
                    )}
                  >
                    {remarksValue.length}/{MAX_REMARKS_CHARS}
                  </span>
                </div>
                <Textarea
                  ref={remarksTextareaRef}
                  id="remarks"
                  value={remarksValue}
                  onChange={handleRemarksChange}
                  maxLength={MAX_REMARKS_CHARS}
                  placeholder="e.g. Prefers silk sarees, bridal couture, custom blouses, preferred neckline depth..."
                  rows={2}
                  className="resize-none overflow-hidden min-h-[48px] text-xs rounded-lg border border-border/80 bg-background px-3 py-2 transition-[height] duration-75 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15"
                  disabled={isPending}
                />
              </Field>
            </div>
          </form>
        </div>

        {/* Sticky Footer with Employee Page Styled Action Buttons */}
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
            form="customer-form"
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
                <span>Register Customer</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
