const COUNTER_NAME_PATTERN = /^[a-z0-9_:-]+$/i;

function assertScope(scope: string) {
  if (!COUNTER_NAME_PATTERN.test(scope)) {
    throw new Error(`Ungueltiger Counter-Scope: ${scope}`);
  }
}

export async function nextCounterValue(db: D1Database, orgId: string, scope: string) {
  assertScope(scope);

  const row = await db
    .prepare(`
      INSERT INTO db_counters (id, org_id, scope, value, updated_at)
      VALUES (?1, ?2, ?3, 1, datetime('now'))
      ON CONFLICT(org_id, scope)
      DO UPDATE SET value = value + 1, updated_at = datetime('now')
      RETURNING value
    `)
    .bind(crypto.randomUUID(), orgId, scope)
    .first<{ value: number }>();

  if (!row) {
    throw new Error(`Counter konnte nicht aktualisiert werden: ${scope}`);
  }

  return Number(row.value);
}

export async function nextFormattedCounter(
  db: D1Database,
  orgId: string,
  scope: string,
  prefix: string,
  minDigits = 5,
) {
  const value = await nextCounterValue(db, orgId, scope);
  return `${prefix}${String(value).padStart(minDigits, "0")}`;
}

export async function nextMemberNumber(db: D1Database, orgId: string) {
  const year = new Date().getFullYear();
  return nextFormattedCounter(db, orgId, `member_number_${year}`, `M-${year}-`, 3);
}
