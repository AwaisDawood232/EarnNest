import { z } from "zod";

export const syncSchema = z.object({
  fullName: z.string().trim().min(2).max(60).optional(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number").optional(),
  country: z.string().trim().max(60).optional(),
  referralCode: z.string().trim().max(12).optional().or(z.literal("")),
});