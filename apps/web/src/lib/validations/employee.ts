import { z } from "zod";

export const employeeSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "Max 100 characters"),
  lastName: z
    .string()
    .max(100, "Max 100 characters")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  panNumber: z
    .string()
    .regex(
      /^[A-Z]{5}[0-9]{4}[A-Z]$/,
      "Invalid PAN format (e.g., ABCDE1234F)"
    )
    .or(z.literal(""))
    .optional(),
  aadhaarNumber: z
    .string()
    .regex(/^[2-9]\d{11}$/, "Enter a valid 12-digit Aadhaar number")
    .or(z.literal(""))
    .optional(),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  salary: z.coerce
    .number()
    .min(0, "Salary cannot be negative")
    .max(100000000, "Salary exceeds maximum"),
  dateOfJoining: z.string().min(1, "Date of joining is required"),
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
