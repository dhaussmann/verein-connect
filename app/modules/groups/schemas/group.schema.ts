import { z } from "zod";

export const groupFormSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
  description: z.string().optional().default(""),
  category: z.string().optional().default("standard"),
  groupType: z.string().optional().default("standard"),
  ageBand: z.string().optional().default(""),
  genderScope: z.string().optional().default("mixed"),
  season: z.string().optional().default(""),
  league: z.string().optional().default(""),
  location: z.string().optional().default(""),
  trainingFocus: z.string().optional().default(""),
  visibility: z.string().optional().default("internal"),
  admissionOpen: z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")]).optional().default("true"),
  maxMembers: z.string().optional().default(""),
  maxGoalies: z.string().optional().default(""),
});
