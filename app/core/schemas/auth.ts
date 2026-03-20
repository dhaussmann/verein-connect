import { z } from "zod";

export const loginApiSchema = z.object({
  email: z.string().trim().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, "Refresh-Token fehlt"),
});

export const forgotPasswordApiSchema = z.object({
  email: z.string().trim().email("Ungültige E-Mail-Adresse"),
});

export const resetPasswordApiSchema = z.object({
  token: z.string().min(1, "Token fehlt"),
  new_password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
});

export const loginFormSchema = z.object({
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

export const forgotPasswordFormSchema = z.object({
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben"),
});
