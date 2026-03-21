import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, count } from 'drizzle-orm';
import type { Env, AuthUser } from '../../types/env';
import { shopProducts, shopOrders, shopOrderItems, users, invoices, invoiceItems } from '../../db/schema';
import { parsePagination, buildMeta } from '../../lib/pagination';
import { NotFoundError } from '../../lib/errors';
import { writeAuditLog } from '../../lib/audit';

type Variables = { user: AuthUser };

export const shopRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Products ───────────────────────────────────────────────────────────────
shopRoutes.get('/products', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const rows = await db.select().from(shopProducts).where(eq(shopProducts.orgId, user.orgId)).orderBy(desc(shopProducts.createdAt));
  return c.json(rows);
});

shopRoutes.get('/products/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const rows = await db.select().from(shopProducts).where(and(eq(shopProducts.id, id), eq(shopProducts.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Produkt', id);
  return c.json(rows[0]);
});

shopRoutes.post('/products', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const p = await db.insert(shopProducts).values({
    orgId: user.orgId,
    category: body.category || null,
    name: body.name,
    description: body.description || null,
    price: body.price,
    stock: body.stock ?? null,
    imageUrl: body.image_url || null,
    isActive: body.is_active !== false ? 1 : 0,
    membersOnly: body.members_only ? 1 : 0,
  }).returning();

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Produkt erstellt', 'product', p[0].id, body.name);
  return c.json({ id: p[0].id }, 201);
});

shopRoutes.put('/products/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const u: Record<string, any> = {};
  if (body.name !== undefined) u.name = body.name;
  if (body.description !== undefined) u.description = body.description;
  if (body.price !== undefined) u.price = body.price;
  if (body.stock !== undefined) u.stock = body.stock;
  if (body.category !== undefined) u.category = body.category;
  if (body.image_url !== undefined) u.imageUrl = body.image_url;
  if (body.is_active !== undefined) u.isActive = body.is_active ? 1 : 0;
  if (body.members_only !== undefined) u.membersOnly = body.members_only ? 1 : 0;

  await db.update(shopProducts).set(u).where(and(eq(shopProducts.id, id), eq(shopProducts.orgId, user.orgId)));
  return c.json({ success: true });
});

shopRoutes.delete('/products/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  await db.delete(shopProducts).where(and(eq(shopProducts.id, id), eq(shopProducts.orgId, user.orgId)));
  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Produkt gelöscht', 'product', id);
  return c.json({ success: true });
});

// ─── Orders ─────────────────────────────────────────────────────────────────
shopRoutes.get('/orders', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  const { page, perPage, offset } = parsePagination(query);

  const conditions: any[] = [eq(shopOrders.orgId, user.orgId)];
  if (query.status) conditions.push(eq(shopOrders.status, query.status));

  const whereClause = and(...conditions);
  const totalResult = await db.select({ count: count() }).from(shopOrders).where(whereClause);
  const total = totalResult[0]?.count || 0;

  const rows = await db.select().from(shopOrders).where(whereClause)
    .orderBy(desc(shopOrders.createdAt)).limit(perPage).offset(offset);

  const enriched = await Promise.all(rows.map(async (o) => {
    const member = await db.select({ firstName: users.firstName, lastName: users.lastName })
      .from(users).where(eq(users.id, o.userId));
    return { ...o, memberName: member[0] ? `${member[0].firstName} ${member[0].lastName}` : null };
  }));

  return c.json({ data: enriched, meta: buildMeta(total, page, perPage) });
});

shopRoutes.get('/orders/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');

  const rows = await db.select().from(shopOrders).where(and(eq(shopOrders.id, id), eq(shopOrders.orgId, user.orgId)));
  if (rows.length === 0) throw new NotFoundError('Bestellung', id);

  const items = await db
    .select({
      id: shopOrderItems.id,
      productId: shopOrderItems.productId,
      quantity: shopOrderItems.quantity,
      unitPrice: shopOrderItems.unitPrice,
      total: shopOrderItems.total,
      productName: shopProducts.name,
    })
    .from(shopOrderItems)
    .innerJoin(shopProducts, eq(shopOrderItems.productId, shopProducts.id))
    .where(eq(shopOrderItems.orderId, id));

  const member = await db.select().from(users).where(eq(users.id, rows[0].userId));

  return c.json({ ...rows[0], items, member: member[0] || null });
});

shopRoutes.post('/orders', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  let total = 0;
  const orderItems: { productId: string; quantity: number; unitPrice: number; total: number }[] = [];

  for (const item of body.items) {
    const product = await db.select().from(shopProducts).where(eq(shopProducts.id, item.product_id));
    if (product.length === 0) throw new NotFoundError('Produkt', item.product_id);
    const qty = item.quantity || 1;
    const lineTotal = product[0].price * qty;
    total += lineTotal;
    orderItems.push({ productId: item.product_id, quantity: qty, unitPrice: product[0].price, total: lineTotal });

    // Reduce stock
    if (product[0].stock !== null) {
      await db.update(shopProducts).set({ stock: Math.max(0, (product[0].stock || 0) - qty) })
        .where(eq(shopProducts.id, item.product_id));
    }
  }

  const orderCount = await db.select({ count: count() }).from(shopOrders).where(eq(shopOrders.orgId, user.orgId));
  const orderNumber = `B-${new Date().getFullYear()}-${String((orderCount[0]?.count || 0) + 1).padStart(5, '0')}`;

  const order = await db.insert(shopOrders).values({
    orgId: user.orgId,
    userId: body.user_id || user.id,
    orderNumber,
    status: 'pending',
    total,
  }).returning();

  for (const item of orderItems) {
    await db.insert(shopOrderItems).values({ orderId: order[0].id, ...item });
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Bestellung erstellt', 'order', order[0].id);
  return c.json({ id: order[0].id, orderNumber, total }, 201);
});

shopRoutes.put('/orders/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json();

  const u: Record<string, any> = {};
  if (body.status !== undefined) u.status = body.status;

  await db.update(shopOrders).set(u).where(and(eq(shopOrders.id, id), eq(shopOrders.orgId, user.orgId)));
  return c.json({ success: true });
});
