import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address, such as name@example.com."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be 128 characters or fewer."),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(100, "Name must be 100 characters or fewer."),
  email: z.string().email("Enter a valid email address, such as name@example.com."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be 128 characters or fewer."),
});

export const adminProvisioningSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100, "Name must be 100 characters or fewer."),
  email: z.string().email("Enter a valid email address, such as name@example.com.").max(254, "Email must be 254 characters or fewer."),
  password: z.string().min(12, "Password must be at least 12 characters.").max(128, "Password must be 128 characters or fewer."),
  provisioningKey: z.string().min(8, "Provisioning key must be at least 8 characters.").max(256, "Provisioning key must be 256 characters or fewer."),
});

export const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(100, "Name must be 100 characters or fewer."),
  email: z.string().email("Enter a valid email address, such as name@example.com."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be 128 characters or fewer.")
    .optional(),
  role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
});
