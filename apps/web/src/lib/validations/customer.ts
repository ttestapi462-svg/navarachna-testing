import { z } from "zod";

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .min(2, "Customer name must be at least 2 characters")
    .max(150, "Customer name cannot exceed 150 characters"),
  mobileNumber: z
    .string()
    .trim()
    .min(1, "Mobile number is required")
    .regex(
      /^[6-9]\d{9}$|^\+?[0-9]{10,15}$/,
      "Enter a valid mobile number (e.g. 9876543210)"
    ),
  whatsappNumber: z
    .string()
    .trim()
    .min(1, "WhatsApp number is required")
    .regex(
      /^[6-9]\d{9}$/,
      "Enter a valid 10-digit WhatsApp number (e.g. 9876543210)"
    ),
  alternateMobile: z.string().trim().optional(),
  address: z.string().trim().max(500, "Address cannot exceed 500 characters").optional(),
  area: z.string().trim().max(100, "Area cannot exceed 100 characters").optional(),
  city: z.string().trim().max(100, "City cannot exceed 100 characters").optional(),
  remarks: z.string().trim().max(250, "Remarks cannot exceed 250 characters").optional(),
  profilePhotoUrl: z.string().trim().optional(),
  isActive: z.boolean(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
