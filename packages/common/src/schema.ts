import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z.string().min(3, {message: "First name must be atleast 3 characters long"}),
  lastName: z.string().optional(),
  email: z.email({ message: "Invalid email format" }),
  password: z.string().min(6, {message: "Password must be at least 6 characters long"})
});

export const loginSchema = z.object({
  email: z.email({message: "Invalid email format"}),
  password: z.string().min(6, {message: "Password must be at least 6 characters long"})
});

export const googleUserSchema = z.object({
  firstName: z.string().min(3, {message: "First name must be atleast 3 characters long"}),
  lastName: z.string().optional(),
  email: z.email({ message: "Invalid email format" })
});