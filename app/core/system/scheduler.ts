import { format, addDays } from 'date-fns';
import type { Env } from "../types/bindings";

export const SCHEDULED_JOBS = {
  weekly_overdue: "0 8 * * 1",
  daily_maintenance: "0 2 * * *",
  daily_expiration: "0 3 * * *",
  monthly_membership: "0 0 1 * *",
} as const;

export type ScheduledJobName = keyof typeof SCHEDULED_JOBS;
export type SupportedCron = (typeof SCHEDULED_JOBS)[ScheduledJobName];

export function resolveScheduledCron(value: string): SupportedCron {
  if (value in SCHEDULED_JOBS) {
    return SCHEDULED_JOBS[value as ScheduledJobName];
  }

  const cronValues = Object.values(SCHEDULED_JOBS) as string[];
  if (cronValues.includes(value)) {
    return value as SupportedCron;
  }

  throw new Error("Unbekannter Cron-Job");
}

export async function runScheduledJob(env: Pick<Env, "DB">, cron: SupportedCron) {
  if (cron === SCHEDULED_JOBS.weekly_overdue) {
    const today = format(new Date(), 'yyyy-MM-dd');
    await env.DB.prepare(
      "UPDATE invoices SET status = 'overdue' WHERE status = 'sent' AND due_date < ?",
    ).bind(today).run();
    return { cron, message: "overdue invoices updated" };
  }

  if (cron === SCHEDULED_JOBS.daily_maintenance) {
    await env.DB.prepare(`
      DELETE FROM profile_field_values WHERE field_id IN (
        SELECT id FROM profile_field_definitions
        WHERE gdpr_retention_days IS NOT NULL
        AND gdpr_retention_days > 0
      ) AND datetime(updated_at, '+' || (
        SELECT gdpr_retention_days FROM profile_field_definitions WHERE id = field_id
      ) || ' days') < datetime('now')
    `).run();

    const cutoff = format(addDays(new Date(), 30), 'yyyy-MM-dd');

    await env.DB.prepare(`
      UPDATE contracts SET
        end_date = date(end_date, '+' || renewal_duration_months || ' months'),
        updated_at = datetime('now')
      WHERE auto_renew = 1
        AND status = 'ACTIVE'
        AND end_date IS NOT NULL
        AND end_date <= ?
        AND cancellation_date IS NULL
        AND renewal_duration_months IS NOT NULL
    `).bind(cutoff).run();

    return { cron, message: "maintenance complete" };
  }

  if (cron === SCHEDULED_JOBS.daily_expiration) {
    const today = format(new Date(), 'yyyy-MM-dd');

    await env.DB.prepare(`
      UPDATE contracts SET status = 'CANCELLED', updated_at = datetime('now')
      WHERE status = 'ACTIVE'
        AND cancellation_effective_date IS NOT NULL
        AND cancellation_effective_date <= ?
    `).bind(today).run();

    await env.DB.prepare(`
      UPDATE contracts SET status = 'EXPIRED', updated_at = datetime('now')
      WHERE status = 'ACTIVE'
        AND auto_renew = 0
        AND end_date IS NOT NULL
        AND end_date < ?
        AND cancellation_date IS NULL
    `).bind(today).run();

    return { cron, message: "contract expiration complete" };
  }

  if (cron === SCHEDULED_JOBS.monthly_membership) {
    return { cron, message: "monthly membership placeholder" };
  }

  throw new Error("Cron-Job wird nicht unterstützt");
}

export async function scheduledHandler(event: ScheduledEvent, env: Pick<Env, "DB">) {
  await runScheduledJob(env, resolveScheduledCron(event.cron));
}
