import { z } from "zod";

// Display mask for the (unreversible) stored password in Edit mode.
// Never sent to the API — typed-over values replace the password instead.
export const STORED_PASSWORD_MASK = "••••••••";

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
    .regex(/^[2-9]\d{11}$|^\d{4}$/, "Enter a valid 12-digit Aadhaar number")
    .or(z.literal(""))
    .optional(),
  department: z.string().min(1, "Department is required"),
  salary: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce
      .number()
      .min(0, "Salary cannot be negative")
      .max(100000000, "Salary exceeds maximum")
      .optional()
  ),
  credentialsEnabled: z.boolean().optional(),
  credentialsUsername: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username cannot exceed 50 characters")
    .or(z.literal(""))
    .optional(),
  credentialsPassword: z
    .string()
    .min(8, "At least 8 characters with an uppercase letter, a lowercase letter, a number and a special character.")
    .regex(/[A-Z]/, "At least 8 characters with an uppercase letter, a lowercase letter, a number and a special character.")
    .regex(/[a-z]/, "At least 8 characters with an uppercase letter, a lowercase letter, a number and a special character.")
    .regex(/[0-9]/, "At least 8 characters with an uppercase letter, a lowercase letter, a number and a special character.")
    .regex(/[^A-Za-z0-9]/, "At least 8 characters with an uppercase letter, a lowercase letter, a number and a special character.")
    .or(z.literal(""))
    .optional(),
  credentialsConfirmPassword: z
    .string()
    .max(50, "Confirm password cannot exceed 50 characters")
    .optional(),
  // Edit-mode optional login update: blank means "keep current".
  loginUsername: z.string().trim().optional().or(z.literal("")),
  loginPassword: z.string().optional().or(z.literal("")),
  loginConfirmPassword: z.string().optional().or(z.literal("")),
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
  })
  .superRefine((data, ctx) => {
    // Login credential fields (Register mode) are only enforced when the admin opts in.
    if (data.credentialsEnabled) {
      if (!data.credentialsUsername) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["credentialsUsername"],
          message: "Username is required",
        });
      }
      if (!data.credentialsPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["credentialsPassword"],
          message: "Password is required",
        });
      }
      if (data.credentialsConfirmPassword !== data.credentialsPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["credentialsConfirmPassword"],
          message: "Passwords do not match",
        });
      }
    }

    // Edit-mode optional login update: validate only what was actually typed.
    const newUsername = data.loginUsername?.trim() ?? "";
    const newPassword = data.loginPassword ?? "";
    const confirmNewPassword = data.loginConfirmPassword ?? "";

    if (newUsername && !/^[a-zA-Z0-9_.-]{3,50}$/.test(newUsername)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["loginUsername"],
        message:
          "Username must be 3-50 characters (letters, numbers, dot, underscore or hyphen).",
      });
    }

    if (newPassword && newPassword !== STORED_PASSWORD_MASK) {
      if (
        newPassword.length < 8 ||
        !/[A-Z]/.test(newPassword) ||
        !/[a-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword) ||
        !/[^A-Za-z0-9]/.test(newPassword)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["loginPassword"],
          message:
            "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character.",
        });
      } else if (confirmNewPassword !== newPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["loginConfirmPassword"],
          message: "Passwords do not match",
        });
      }
    }
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
