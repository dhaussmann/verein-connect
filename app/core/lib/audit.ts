import { drizzle } from 'drizzle-orm/d1';
import { auditLog } from '../db/schema';

export async function writeAuditLog(
  db: D1Database,
  orgId: string,
  userId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: string,
  ipAddress?: string,
) {
  const d = drizzle(db);
  await d.insert(auditLog).values({
    orgId,
    userId,
    action,
    entityType,
    entityId,
    details,
    ipAddress,
  });
}
