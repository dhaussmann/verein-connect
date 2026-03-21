import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, count, like } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { files, fileCategories } from '../../db/schema';
import { parsePagination, buildMeta } from '../../lib/pagination';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const fileRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── GET / — List files ─────────────────────────────────────────────────────
fileRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(files.orgId, user.orgId)];
  if (query.folder) conditions.push(eq(files.folderPath, query.folder));
  if (query.category_id) conditions.push(eq(files.categoryId, query.category_id));
  if (query.search) conditions.push(like(files.fileName, `%${query.search}%`));

  const whereClause = and(...conditions);
  const totalResult = await db.select({ count: count() }).from(files).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(files).where(whereClause)
    .orderBy(desc(files.createdAt)).limit(perPage).offset(offset);

  return c.json({ data: rows, meta: buildMeta(total, page, perPage) });
});

// ─── POST /upload — Upload file ─────────────────────────────────────────────
fileRoutes.post('/upload', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) throw new ValidationError('Keine Datei angegeben');

  const folderPath = (formData.get('folder') as string) || '/';
  const categoryId = (formData.get('category_id') as string) || null;
  const visibility = (formData.get('visibility') as string) || 'admin';
  const description = (formData.get('description') as string) || null;

  const r2Key = `${user.orgId}/${folderPath}/${Date.now()}-${file.name}`.replace(/\/+/g, '/');

  await c.env.FILES.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const f = await db.insert(files).values({
    orgId: user.orgId,
    folderPath,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    r2Key,
    uploadedBy: user.id,
    categoryId,
    visibility,
    description,
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Datei hochgeladen', 'file', f[0].id, file.name);
  return c.json({ id: f[0].id, r2Key }, 201);
});

// ─── GET /:id/download — Download file ──────────────────────────────────────
fileRoutes.get('/:id/download', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(files).where(and(eq(files.id, id), eq(files.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Datei', id);

  const obj = await c.env.FILES.get(rows[0].r2Key);
  if (!obj) throw new NotFoundError('Datei im Speicher', id);

  return new Response(obj.body, {
    headers: {
      'Content-Type': rows[0].mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${rows[0].fileName}"`,
    },
  });
});

// ─── DELETE /:id — Delete file ──────────────────────────────────────────────
fileRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(files).where(and(eq(files.id, id), eq(files.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Datei', id);

  await c.env.FILES.delete(rows[0].r2Key);
  await db.delete(files).where(eq(files.id, id));

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Datei gelöscht', 'file', id, rows[0].fileName);
  return c.json({ success: true });
});

// ─── File Categories ────────────────────────────────────────────────────────
fileRoutes.get('/categories', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(fileCategories).where(eq(fileCategories.orgId, user.orgId));
  return c.json(rows);
});

fileRoutes.post('/categories', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const { name, color } = await c.req.json();
  const cat = await db.insert(fileCategories).values({ orgId: user.orgId, name, color: color || '#6b7280' }).returning();
  return c.json({ id: cat[0].id }, 201);
});

fileRoutes.delete('/categories/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  await db.delete(fileCategories).where(and(eq(fileCategories.id, id), eq(fileCategories.orgId, user.orgId)));
  return c.json({ success: true });
});
