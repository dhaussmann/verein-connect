import { z } from "zod";

export const groupFormSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
  description: z.string().optional().default(""),
  category: z.string().optional().default("standard"),
});
