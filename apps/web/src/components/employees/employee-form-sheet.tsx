"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  employeeSchema,
  type EmployeeFormData,
  DEPARTMENTS,
  DESIGNATIONS,
} from "@/lib/validations/employee";
import {
  useCreateEmployee,
  useUpdateEmployee,
} from "@/services/employee-service";
import type { EmployeeResponse, EmployeeRequest } from "@/types/employee";
import {
  UserPlus,
  Edit3,
  Loader2,
  AlertCircle,
  ShieldAlert,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  CreditCard,
  Fingerprint,
} from "lucide-react";

interface EmployeeFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeResponse | null;
}

export function EmployeeFormSheet({
  open,
  onOpenChange,
  employee,
}: EmployeeFormSheetProps) {
  const isEdit = Boolean(employee);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      panNumber: "",
      aadhaarNumber: "",
      department: "Master Tailor",
      designation: "Master Tailor",
      salary: 0,
      dateOfJoining: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    setConflictError(null);
    if (employee && open) {
      reset({
        firstName: employee.firstName,
        lastName: employee.lastName || "",
        email: employee.email,
        mobile: employee.mobile,
        panNumber: "", // backend returns masked; leave blank unless updating
        aadhaarNumber: "", // backend returns masked; leave blank unless updating
        department: employee.department,
        designation: employee.designation,
        salary: employee.salary,
        dateOfJoining: employee.dateOfJoining,
      });
    } else if (!employee && open) {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        mobile: "",
        panNumber: "",
        aadhaarNumber: "",
        department: "Master Tailor",
        designation: "Master Tailor",
        salary: 35000,
        dateOfJoining: new Date().toISOString().split("T")[0],
      });
    }
  }, [employee, open, reset]);

  const onSubmit = async (data: EmployeeFormData) => {
    setConflictError(null);
    try {
      if (isEdit && employee) {
        const payload: EmployeeRequest = {
          firstName: data.firstName,
          lastName: data.lastName || undefined,
          email: data.email,
          mobile: data.mobile,
          panNumber: data.panNumber ? data.panNumber.toUpperCase() : undefined,
          aadhaarNumber: data.aadhaarNumber || undefined,
          department: data.department,
          designation: data.designation,
          salary: Number(data.salary),
          dateOfJoining: data.dateOfJoining,
          version: employee.version,
        };
        await updateMutation.mutateAsync({ id: employee.id, data: payload });
      } else {
        const payload: EmployeeRequest = {
          firstName: data.firstName,
          lastName: data.lastName || undefined,
          email: data.email,
          mobile: data.mobile,
          panNumber: data.panNumber ? data.panNumber.toUpperCase() : undefined,
          aadhaarNumber: data.aadhaarNumber || undefined,
          department: data.department,
          designation: data.designation,
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-2xl w-full flex flex-col p-0 gap-0"
      >
        {/* Sticky Header */}
        <SheetHeader className="px-6 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            {isEdit ? (
              <Edit3 className="size-4 text-primary" />
            ) : (
              <UserPlus className="size-4 text-primary" />
            )}
            <SheetTitle className="text-base font-semibold text-foreground">
              {isEdit ? "Edit Employee Profile" : "Register New Employee"}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-0.5">
            {isEdit ? (
              <span>
                Updating profile for{" "}
                <span className="font-mono text-primary font-medium">
                  {employee?.employeeCode}
                </span>
                . Changes maintain full audit history.
              </span>
            ) : (
              "Enter employee and atelier employment details below."
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Form Body using ReUI Field system */}
        <form
          id="employee-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {conflictError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 flex items-start gap-2.5 text-xs text-destructive">
              <ShieldAlert className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Conflict Detected</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  {conflictError}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Personal Details */}
          <FieldSet className="space-y-3">
            <div className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
              Personal Information
            </div>
            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field>
                <FieldLabel className="text-xs font-medium">
                  First Name <span className="text-destructive">*</span>
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <User className="size-3.5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    {...register("firstName")}
                    placeholder="e.g. Rajesh"
                    className="text-xs"
                    disabled={isPending}
                  />
                </InputGroup>
                {errors.firstName && (
                  <FieldError errors={[errors.firstName]} />
                )}
              </Field>

              <Field>
                <FieldLabel className="text-xs font-medium">Last Name</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <User className="size-3.5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    {...register("lastName")}
                    placeholder="e.g. Verma"
                    className="text-xs"
                    disabled={isPending}
                  />
                </InputGroup>
                {errors.lastName && <FieldError errors={[errors.lastName]} />}
              </Field>
            </FieldGroup>

            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field>
                <FieldLabel className="text-xs font-medium">
                  Email Address <span className="text-destructive">*</span>
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Mail className="size-3.5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="email"
                    {...register("email")}
                    placeholder="rajesh@navarachna.com"
                    className="text-xs"
                    disabled={isPending}
                  />
                </InputGroup>
                {errors.email && <FieldError errors={[errors.email]} />}
              </Field>

              <Field>
                <FieldLabel className="text-xs font-medium">
                  Mobile Number <span className="text-destructive">*</span>
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Phone className="size-3.5 text-muted-foreground" />
                    <InputGroupText className="font-mono text-xs font-semibold text-foreground/80 border-r border-border/70 pr-2">
                      +91
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    type="tel"
                    maxLength={10}
                    {...register("mobile")}
                    placeholder="9876543210"
                    className="font-mono text-xs"
                    disabled={isPending}
                  />
                </InputGroup>
                {errors.mobile && <FieldError errors={[errors.mobile]} />}
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator className="my-1" />

          {/* Section 2: Role & Employment */}
          <FieldSet className="space-y-3">
            <div className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
              Role & Employment
            </div>
            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field>
                <FieldLabel className="text-xs font-medium">
                  Role / Designation <span className="text-destructive">*</span>
                </FieldLabel>
                <Controller
                  name="designation"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        setValue("department", val);
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <div className="flex items-center gap-2">
                          <Briefcase className="size-3.5 text-muted-foreground" />
                          <SelectValue placeholder="Select role / designation" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {DESIGNATIONS.map((desig) => (
                            <SelectItem
                              key={desig}
                              value={desig}
                              className="cursor-pointer py-1.5 text-xs"
                            >
                              {desig}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.designation && (
                  <FieldError errors={[errors.designation]} />
                )}
              </Field>

              <Field>
                <FieldLabel className="text-xs font-medium">
                  Monthly Compensation (₹) <span className="text-destructive">*</span>
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText className="font-semibold text-foreground text-xs">
                      ₹
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    step="500"
                    {...register("salary")}
                    placeholder="35000"
                    className="font-mono text-xs"
                    disabled={isPending}
                  />
                </InputGroup>
                {errors.salary && <FieldError errors={[errors.salary]} />}
              </Field>
            </FieldGroup>

            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field>
                <FieldLabel className="text-xs font-medium">
                  Date of Joining <span className="text-destructive">*</span>
                </FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Calendar className="size-3.5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="date"
                    {...register("dateOfJoining")}
                    className="text-xs"
                    disabled={isPending}
                  />
                </InputGroup>
                {errors.dateOfJoining && (
                  <FieldError errors={[errors.dateOfJoining]} />
                )}
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSeparator className="my-1" />

          {/* Section 3: Compliance & Identification */}
          <FieldSet className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
                Identity & Tax (Optional)
              </div>
              {isEdit && (
                <span className="text-[11px] text-muted-foreground">
                  Leave blank to retain current
                </span>
              )}
            </div>

            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Field>
                <FieldLabel className="text-xs font-medium">PAN Number</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <CreditCard className="size-3.5 text-muted-foreground" />
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
                    className="font-mono uppercase text-xs"
                    disabled={isPending}
                  />
                </InputGroup>
                {errors.panNumber && (
                  <FieldError errors={[errors.panNumber]} />
                )}
                {isEdit && employee?.panMasked && (
                  <FieldDescription className="text-[11px]">
                    Current: {employee.panMasked}
                  </FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel className="text-xs font-medium">12-Digit Aadhaar</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <Fingerprint className="size-3.5 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput
                    maxLength={12}
                    {...register("aadhaarNumber")}
                    placeholder={
                      isEdit && employee?.aadhaarMasked
                        ? employee.aadhaarMasked
                        : "234567890123"
                    }
                    className="font-mono text-xs"
                    disabled={isPending}
                  />
                </InputGroup>
                {errors.aadhaarNumber && (
                  <FieldError errors={[errors.aadhaarNumber]} />
                )}
                {isEdit && employee?.aadhaarMasked && (
                  <FieldDescription className="text-[11px]">
                    Current: {employee.aadhaarMasked}
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>
          </FieldSet>
        </form>

        {/* Sticky Footer Actions */}
        <SheetFooter className="px-6 py-3.5 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-xs h-8.5 px-4 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="employee-form"
            size="sm"
            disabled={isPending}
            className="text-xs h-8.5 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium cursor-pointer shadow-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                Saving...
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Register Employee"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
