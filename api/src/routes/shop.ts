import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, AuthUser } from '../types/bindings';
import { shopProducts, shopOrders, shopOrderItems, users, invoices } from '../db/schema';
import { NotFoundError, ValidationError } from '../lib/errors';
import { writeAuditLog } from '../lib/audit';

type Variables = { user: AuthUser };

export const shopRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  category: z.string().optional(),
  stock: z.number().optional(),
  members_only: z.boolean().optional(),
  image_url: z.string().optional(),
});

const createOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().min(1).default(1),
  })),
});

// ─── GET /v1/shop/products ───────────────────────────────────────────────────
shopRoutes.get('/products', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const rows = await db.select().from(shopProducts)
    .where(and(eq(shopProducts.orgId, user.orgId), eq(shopProducts.isActive, 1)));

  return c.json(rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    price: `€${(p.price || 0).toFixed(2).replace('.', ',')}`,
    priceRaw: p.price,
    stock: p.stock,
    category: p.category || '',
    membersOnly: p.membersOnly === 1,
    imageUrl: p.imageUrl || '',
  })));
});

// ─── POST /v1/shop/products ──────────────────────────────────────────────────
shopRoutes.post('/products', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();

  await db.insert(shopProducts).values({
    id,
    orgId: user.orgId,
    name: parsed.data.name,
    description: parsed.data.description,
    price: parsed.data.price,
    category: parsed.data.category,
    stock: parsed.data.stock,
    membersOnly: parsed.data.members_only ? 1 : 0,
    imageUrl: parsed.data.image_url,
  });

  return c.json({ id }, 201);
});

// ─── PATCH /v1/shop/products/:id ─────────────────────────────────────────────
shopRoutes.patch('/products/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const productId = c.req.param('id');
  const body = await c.req.json();

  const updateData: Record<string, any> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.price !== undefined) updateData.price = body.price;
  if (body.stock !== undefined) updateData.stock = body.stock;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.members_only !== undefined) updateData.membersOnly = body.members_only ? 1 : 0;
  if (body.is_active !== undefined) updateData.isActive = body.is_active ? 1 : 0;

  await db.update(shopProducts).set(updateData).where(and(eq(shopProducts.id, productId), eq(shopProducts.orgId, user.orgId)));
  return c.json({ success: true });
});

// ─── DELETE /v1/shop/products/:id ────────────────────────────────────────────
shopRoutes.delete('/products/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const productId = c.req.param('id');

  await db.update(shopProducts).set({ isActive: 0 }).where(and(eq(shopProducts.id, productId), eq(shopProducts.orgId, user.orgId)));
  return c.json({ success: true });
});

// ─── POST /v1/shop/orders ────────────────────────────────────────────────────
shopRoutes.post('/orders', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validierungsfehler', parsed.error.flatten().fieldErrors);

  const db = drizzle(c.env.DB);
  const orderId = crypto.randomUUID();

  // Calculate total
  let total = 0;
  const itemDetails: { productId: string; quantity: number; unitPrice: number; total: number }[] = [];

  for (const item of parsed.data.items) {
    const product = await db.select().from(shopProducts).where(eq(shopProducts.id, item.product_id));
    if (product.length === 0) throw new NotFoundError('Produkt', item.product_id);

    const itemTotal = (product[0].price || 0) * item.quantity;
    total += itemTotal;
    itemDetails.push({
      productId: item.product_id,
      quantity: item.quantity,
      unitPrice: product[0].price || 0,
      total: itemTotal,
    });

    // Decrease stock
    if (product[0].stock !== null) {
      await db.update(shopProducts).set({ stock: (product[0].stock || 0) - item.quantity })
        .where(eq(shopProducts.id, item.product_id));
    }
  }

  // Generate order number
  const orderCount = await db.select({ count: count() }).from(shopOrders).where(eq(shopOrders.orgId, user.orgId));
  const orderNumber = `B-${new Date().getFullYear()}-${String((orderCount[0]?.count || 0) + 1).padStart(5, '0')}`;

  await db.insert(shopOrders).values({
    id: orderId,
    orgId: user.orgId,
    userId: user.id,
    orderNumber,
    status: 'pending',
    total,
  });

  for (const item of itemDetails) {
    await db.insert(shopOrderItems).values({
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    });
  }

  await writeAuditLog(c.env.DB, user.orgId, user.id, 'Bestellung aufgegeben', 'shop_order', orderId, orderNumber);

  return c.json({ id: orderId, order_number: orderNumber, total }, 201);
});

// ─── GET /v1/shop/orders ─────────────────────────────────────────────────────
shopRoutes.get('/orders', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);

  const isAdmin = user.permissions.includes('*') || user.permissions.includes('shop.admin');

  const conditions = [eq(shopOrders.orgId, user.orgId)];
  if (!isAdmin) {
    conditions.push(eq(shopOrders.userId, user.id));
  }

  const rows = await db.select().from(shopOrders)
    .where(and(...conditions))
    .orderBy(desc(shopOrders.createdAt));

  const enriched = await Promise.all(rows.map(async (order) => {
    const items = await db
      .select({ productName: shopProducts.name, quantity: shopOrderItems.quantity, total: shopOrderItems.total })
      .from(shopOrderItems)
      .innerJoin(shopProducts, eq(shopOrderItems.productId, shopProducts.id))
      .where(eq(shopOrderItems.orderId, order.id));

    const buyerRow = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, order.userId));
    const buyer = buyerRow[0] ? `${buyerRow[0].firstName} ${buyerRow[0].lastName}` : '';
    const initials = buyerRow[0] ? `${(buyerRow[0].firstName || '')[0]}${(buyerRow[0].lastName || '')[0]}`.toUpperCase() : '';

    const statusMap: Record<string, string> = {
      pending: 'Offen', paid: 'Bezahlt', shipped: 'Versendet', completed: 'Abgeschlossen', cancelled: 'Storniert',
    };

    return {
      id: order.id,
      orderNumber: order.orderNumber || '',
      buyer,
      buyerInitials: initials,
      products: items.map((i) => i.productName),
      total: `€${(order.total || 0).toFixed(2).replace('.', ',')}`,
      totalRaw: order.total,
      date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('de-DE') : '',
      status: statusMap[order.status || 'pending'] || order.status,
    };
  }));

  return c.json(enriched);
});

// ─── PATCH /v1/shop/orders/:id ───────────────────────────────────────────────
shopRoutes.patch('/orders/:id', async (c) => {
  const user = c.get('user');
  const db = drizzle(c.env.DB);
  const orderId = c.req.param('id');
  const { status } = await c.req.json();

  await db.update(shopOrders).set({ status }).where(and(eq(shopOrders.id, orderId), eq(shopOrders.orgId, user.orgId)));
  return c.json({ success: true });
});
