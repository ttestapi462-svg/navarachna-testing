import * as z from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, "Username or email is required")
    .refine(
      (val) => {
        // If it's an email, validate email format
        if (val.includes("@")) {
          return z.string().email().safeParse(val).success;
        }
        // If it's a username, ensure alphanumeric + underscores
        return /^[a-zA-Z0-9_.-]+$/.test(val);
      },
      {
        message: "Enter a valid email address or username (letters, numbers, underscores only).",
      }
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberDevice: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
