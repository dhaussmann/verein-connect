import type { ZodIssue } from "zod";

export function getFirstFieldError(issues: ZodIssue[]): string | null {
  return issues[0]?.message ?? null;
}
