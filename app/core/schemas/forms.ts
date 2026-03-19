import { z } from "zod";

export const createUserFormSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname ist erforderlich"),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich"),
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
  role_ids: z.array(z.string()).default([]),
});

export const createMemberFormSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname ist erforderlich"),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich"),
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben"),
  phone: z.string().trim().optional().default(""),
  mobile: z.string().trim().optional().default(""),
  birthDate: z.string().trim().optional().default(""),
  gender: z.string().trim().optional().default(""),
  street: z.string().trim().optional().default(""),
  zip: z.string().trim().optional().default(""),
  city: z.string().trim().optional().default(""),
  status: z.enum(["Aktiv", "Inaktiv", "Ausstehend"]).default("Aktiv"),
});
