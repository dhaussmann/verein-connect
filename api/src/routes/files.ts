import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, like } from 'drizzle-orm';
import type { Env, AuthUser } from '../types/bindings';
import { files } from '../db/schema';
import { NotFoundError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const fileRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── GET /v1/files ───────────────────────────────────────────────────────────
fileRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const folderPath = query.folder_path || '/';

  const conditions: any[] = [eq(files.orgId, user.orgId)];
  if (query.search) {
    conditions.push(like(files.fileName, `%${query.search}%`));
  } else {
    conditions.push(eq(files.folderPath, folderPath));
  }

  const rows = await db.select().from(files).where(and(...conditions));

  // Derive folders from file paths
  const allFiles = await db.select({ folderPath: files.folderPath }).from(files).where(eq(files.orgId, user.orgId));
  const folderSet = new Set<string>();
  for (const f of allFiles) {
    if (f.folderPath && f.folderPath !== '/') {
      const parts = f.folderPath.split('/').filter(Boolean);
      let path = '';
      for (const part of parts) {
        path += '/' + part;
        folderSet.add(path);
      }
    }
  }

  // Filter to show subfolders of current path
  const subfolders = Array.from(folderSet).filter((fp) => {
    if (folderPath === '/') return fp.split('/').filter(Boolean).length === 1;
    return fp.startsWith(folderPath + '/') && fp.replace(folderPath + '/', '').split('/').filter(Boolean).length === 1;
  });

  const sizeMap: Record<string, string> = {};
  const formatSize = (bytes: number | null) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const fileList = rows.map((f) => ({
    id: f.id,
    name: f.fileName,
    folder: f.folderPath || '/',
    type: f.mimeType || 'application/octet-stream',
    size: formatSize(f.sizeBytes),
    sizeBytes: f.sizeBytes,
    uploadedBy: f.uploadedBy || '',
    uploadDate: f.createdAt ? new Date(f.createdAt).toLocaleDateString('de-DE') : '',
    accessRoles: JSON.parse(f.accessRoles || '[]'),
  }));

  return c.json({ folders: subfolders, files: fileList });
});

// ─── POST /v1/files/upload ───────────────────────────────────────────────────
fileRoutes.post('/upload', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const folderPath = (formData.get('folder_path') as string) || '/';
  const accessRolesStr = (formData.get('access_roles') as string) || '[]';

  if (!file) {
    return c.json({ error: 'Keine Datei angegeben' }, 400);
  }

  const r2Key = `${user.orgId}${folderPath === '/' ? '/' : folderPath + '/'}${file.name}`;

  // Upload to R2
  await c.env.FILES.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const fileId = crypto.randomUUID();
  await db.insert(files).values({
    id: fileId,
    orgId: user.orgId,
    folderPath,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    r2Key,
    uploadedBy: user.id,
    accessRoles: accessRolesStr,
  });

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Datei hochgeladen', 'file', fileId, file.name);

  return c.json({ id: fileId, name: file.name, r2Key }, 201);
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
  if (body.folder_path !== undefined) updateData.folderPath = body.folder_path;
  if (body.access_roles !== undefined) updateData.accessRoles = JSON.stringify(body.access_roles);

  await db.update(files).set(updateData).where(and(eq(files.id, fileId), eq(files.orgId, user.orgId)));
  return c.json({ success: true });
});
