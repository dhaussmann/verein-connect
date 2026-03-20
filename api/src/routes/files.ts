import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like, inArray, sql, sum } from 'drizzle-orm';
import type { Env, AuthUser } from '../types/bindings';
import { files, fileCategories, groups, users, groupMembers } from '../db/schema';
import { NotFoundError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const fileRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const formatSize = (bytes: number | null) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// ─── GET /v1/files ───────────────────────────────────────────────────────────
fileRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();

  const conditions: any[] = [eq(files.orgId, user.orgId)];
  if (query.search) conditions.push(like(files.fileName, `%${query.search}%`));
  if (query.category_id) conditions.push(eq(files.categoryId, query.category_id));
  if (query.group_id) conditions.push(eq(files.groupId, query.group_id));
  if (query.visibility) conditions.push(eq(files.visibility, query.visibility));

  const rows = await db.select().from(files).where(and(...conditions)).orderBy(files.createdAt);

  // Enrich with category + group + uploader names
  const catIds = [...new Set(rows.map(f => f.categoryId).filter(Boolean))] as string[];
  const grpIds = [...new Set(rows.map(f => f.groupId).filter(Boolean))] as string[];
  const uploaderIds = [...new Set(rows.map(f => f.uploadedBy).filter(Boolean))] as string[];

  const catMap: Record<string, { name: string; color: string }> = {};
  if (catIds.length > 0) {
    const cats = await db.select({ id: fileCategories.id, name: fileCategories.name, color: fileCategories.color }).from(fileCategories).where(inArray(fileCategories.id, catIds));
    cats.forEach(c => { catMap[c.id] = { name: c.name, color: c.color || '#6b7280' }; });
  }

  const grpMap: Record<string, string> = {};
  if (grpIds.length > 0) {
    const grps = await db.select({ id: groups.id, name: groups.name }).from(groups).where(inArray(groups.id, grpIds));
    grps.forEach(g => { grpMap[g.id] = g.name; });
  }

  const uploaderMap: Record<string, string> = {};
  if (uploaderIds.length > 0) {
    const ups = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users).where(inArray(users.id, uploaderIds));
    ups.forEach(u => { uploaderMap[u.id] = `${u.firstName || ''} ${u.lastName || ''}`.trim(); });
  }

  const fileList = rows.map((f) => ({
    id: f.id,
    name: f.fileName,
    description: f.description || '',
    type: f.mimeType || 'application/octet-stream',
    size: formatSize(f.sizeBytes),
    sizeBytes: f.sizeBytes,
    uploadedBy: f.uploadedBy ? uploaderMap[f.uploadedBy] || '' : '',
    uploadedById: f.uploadedBy || '',
    uploadDate: f.createdAt ? new Date(f.createdAt).toLocaleDateString('de-DE') : '',
    createdAt: f.createdAt,
    categoryId: f.categoryId,
    category: f.categoryId ? catMap[f.categoryId] || null : null,
    groupId: f.groupId,
    groupName: f.groupId ? grpMap[f.groupId] || null : null,
    visibility: f.visibility || 'admin',
  }));

  return c.json({ data: fileList });
});

// ─── POST /v1/files/upload ───────────────────────────────────────────────────
fileRoutes.post('/upload', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const categoryId = (formData.get('category_id') as string) || null;
  const groupId = (formData.get('group_id') as string) || null;
  const visibility = (formData.get('visibility') as string) || 'admin';
  const description = (formData.get('description') as string) || null;

  if (!file) {
    return c.json({ error: 'Keine Datei angegeben' }, 400);
  }

  const r2Key = `${user.orgId}/materialbank/${crypto.randomUUID()}_${file.name}`;

  // Upload to R2
  await c.env.FILES.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const fileId = crypto.randomUUID();
  await db.insert(files).values({
    id: fileId,
    orgId: user.orgId,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    r2Key,
    uploadedBy: user.id,
    categoryId,
    groupId,
    visibility,
    description,
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Datei hochgeladen', 'file', fileId, file.name);

  return c.json({ id: fileId, name: file.name }, 201);
});

// ─── GET /v1/files/storage ──────────────────────────────────────────────────
fileRoutes.get('/storage', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const result = await db.select({ total: sum(files.sizeBytes), count: sql<number>`count(*)` }).from(files).where(eq(files.orgId, user.orgId));
  const usedBytes = Number(result[0]?.total || 0);
  const fileCount = Number(result[0]?.count || 0);
  const limitBytes = 1024 * 1024 * 1024; // 1 GB

  return c.json({
    usedBytes,
    usedFormatted: formatSize(usedBytes),
    limitBytes,
    limitFormatted: formatSize(limitBytes),
    percentUsed: Math.round((usedBytes / limitBytes) * 100),
    fileCount,
  });
});

// ─── POST /v1/files/bulk-delete ─────────────────────────────────────────────
fileRoutes.post('/bulk-delete', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const { file_ids } = await c.req.json();

  if (!Array.isArray(file_ids) || file_ids.length === 0) return c.json({ error: 'Keine Dateien angegeben' }, 400);

  const rows = await db.select().from(files).where(and(eq(files.orgId, user.orgId), inArray(files.id, file_ids)));

  for (const row of rows) {
    await c.env.FILES.delete(row.r2Key);
    await db.delete(files).where(eq(files.id, row.id));
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, `${rows.length} Dateien gelöscht`, 'file', '', '');
  return c.json({ success: true, deleted: rows.length });
});

// ─── GET /v1/files/:id/download ──────────────────────────────────────────────
fileRoutes.get('/:id/download', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const fileId = c.req.param('id');

  const rows = await db.select().from(files).where(and(eq(files.id, fileId), eq(files.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Datei', fileId);

  const fileRecord = rows[0];

  // Check access roles
  const accessRoles: string[] = JSON.parse(fileRecord.accessRoles || '[]');
  if (accessRoles.length > 0) {
    const hasAccess = user.roles.some((r) => accessRoles.includes(r)) || user.permissions.includes('*');
    if (!hasAccess) {
      return c.json({ error: 'Kein Zugriff auf diese Datei' }, 403);
    }
  }

  const r2Object = await c.env.FILES.get(fileRecord.r2Key);
  if (!r2Object) {
    return c.json({ error: 'Datei nicht im Speicher gefunden' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', fileRecord.mimeType || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${fileRecord.fileName}"`);
  if (r2Object.size) headers.set('Content-Length', r2Object.size.toString());

  return new Response(r2Object.body, { headers });
});

// ─── POST /v1/files/folder ───────────────────────────────────────────────────
fileRoutes.post('/folder', async (c) => {
  const { path } = await c.req.json();
  // Folders are virtual (derived from file paths), so just acknowledge
  return c.json({ success: true, path });
});

// ─── DELETE /v1/files/:id ────────────────────────────────────────────────────
fileRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const fileId = c.req.param('id');

  const rows = await db.select().from(files).where(and(eq(files.id, fileId), eq(files.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Datei', fileId);

  // Delete from R2
  await c.env.FILES.delete(rows[0].r2Key);

  // Delete from DB
  await db.delete(files).where(eq(files.id, fileId));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Datei gelöscht', 'file', fileId, rows[0].fileName);

  return c.json({ success: true });
});

// ─── PATCH /v1/files/:id ─────────────────────────────────────────────────────
fileRoutes.patch('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const fileId = c.req.param('id');
  const body = await c.req.json();

  const updateData: Record<string, any> = {};
  if (body.file_name !== undefined) updateData.fileName = body.file_name;
  if (body.category_id !== undefined) updateData.categoryId = body.category_id;
  if (body.group_id !== undefined) updateData.groupId = body.group_id;
  if (body.visibility !== undefined) updateData.visibility = body.visibility;
  if (body.description !== undefined) updateData.description = body.description;

  await db.update(files).set(updateData).where(and(eq(files.id, fileId), eq(files.orgId, user.orgId)));
  return c.json({ success: true });
});

