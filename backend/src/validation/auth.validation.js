import { z } from "zod";

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const validateRegistration = (data) => {
  const schema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email format"),
    password: passwordSchema,
    role: z.enum(["admin", "staff", "viewer"]).optional()
  });
  
  return schema.safeParse(data);
};

export const validateLogin = (data) => {
  const schema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password required")
  });
  
  return schema.safeParse(data);
};

export const validatePasswordReset = {
  request: (data) => {
    const schema = z.object({
      email: z.string().email("Invalid email")
    });
    return schema.safeParse(data);
  },
  confirm: (data) => {
    const schema = z.object({
      token: z.string().min(1, "Token required"),
      newPassword: passwordSchema
    });
    return schema.safeParse(data);
  }
};
