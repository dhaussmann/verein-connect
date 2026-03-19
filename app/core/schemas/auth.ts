import { z } from "zod";

export const registerApiSchema = z.object({
  org_name: z.string().trim().min(2, "Vereinsname muss mindestens 2 Zeichen lang sein"),
  org_type: z.string().trim().optional(),
  first_name: z.string().trim().min(1, "Vorname ist erforderlich"),
  last_name: z.string().trim().min(1, "Nachname ist erforderlich"),
  email: z.string().trim().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
});

export const loginApiSchema = z.object({
  email: z.string().trim().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort ist erforderlich"),
  org_slug: z.string().trim().optional(),
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

export const registerFormSchema = z.object({
  clubName: z.string().trim().min(2, "Vereinsname muss mindestens 2 Zeichen lang sein"),
  clubType: z.string().trim().min(1, "Vereinstyp ist erforderlich"),
  firstName: z.string().trim().min(1, "Vorname ist erforderlich"),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich"),
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
  passwordConfirm: z.string().min(1, "Bitte Passwort bestätigen"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwörter stimmen nicht überein",
  path: ["passwordConfirm"],
});

export const forgotPasswordFormSchema = z.object({
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben"),
});
