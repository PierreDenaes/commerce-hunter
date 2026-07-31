import { z } from "zod";

export const RegisterSchema = z.object({
  organizationName: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const InviteSchema = z.object({
  email: z.string().email().max(255),
});

export const AcceptInviteSchema = z.object({
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type InviteInput = z.infer<typeof InviteSchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
