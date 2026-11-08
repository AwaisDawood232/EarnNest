import { z } from "zod";

const password = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[0-9]/, "Add a number");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    email: z.string().trim().email("Enter a valid email"),
    password,
    confirmPassword: z.string(),
    phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Enter a valid mobile number"),
    country: z.string().min(1, "Select a country"),
    referralCode: z.string().optional(),
    terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const forgotSchema = z.object({ email: z.string().trim().email("Enter a valid email") });



// Profile and password update schemas are also used in server/controllers/profile.controller.js, so we export them for reuse.

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(60, "Name is too long"),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Enter a valid mobile number"),
  country: z.string().min(1, "Select a country"),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different",
  });