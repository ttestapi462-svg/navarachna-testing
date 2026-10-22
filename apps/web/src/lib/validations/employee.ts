import { z } from "zod";

export const employeeSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name cannot exceed 50 characters"),
  lastName: z
    .string()
    .trim()
    .max(50, "Last name cannot exceed 50 characters")
    .refine(
      (val) => !val || val.length >= 2,
      "Last name must be at least 2 characters"
    )
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Enter a valid email address (e.g. name@example.com)"),
  mobile: z
    .string()
    .trim()
    .min(1, "Mobile number is required")
    .regex(
      /^[6-9]\d{9}$/,
      "Enter a valid 10-digit Indian mobile number (e.g. 9876543210)"
    ),
  panNumber: z
    .string()
    .trim()
    .regex(
      /^[A-Z]{5}[0-9]{4}[A-Z]$/,
      "Invalid PAN format (e.g. ABCDE1234F)"
    )
    .or(z.literal(""))
    .optional(),
  aadhaarNumber: z
    .string()
    .trim()
    .regex(/^[2-9]\d{11}$/, "Enter a valid 12-digit Aadhaar number")
    .or(z.literal(""))
    .optional(),
  department: z.string().min(1, "Department is required"),
  salary: z.coerce
    .number()
    .min(0, "Salary cannot be negative")
    .max(100000000, "Salary exceeds maximum"),
  dateOfJoining: z
    .string()
    .min(1, "Date of joining is required")
    .refine((val) => {
      if (!val) return false;
      const selected = new Date(val + "T00:00:00");
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return selected <= today;
    }, "Date of joining cannot be in the future"),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

export const DESIGNATIONS = [
  "Studio Receptionist",
  "Floor Supervisor",
  "Sourcing Specialist",
  "Cutting Master",
  "Master Tailor",
  "Finishing Specialist",
  "Packaging & Dispatch",
  "Other Employee",
] as const;

export const DEPARTMENTS = [
  "Studio Receptionist",
  "Floor Supervisor",
  "Sourcing Specialist",
  "Cutting Master",
  "Master Tailor",
  "Finishing Specialist",
  "Packaging & Dispatch",
  "Other Employee",
] as const;
