import prisma from "../../config/prisma.js";
import { getPlatformCommissionPct } from "../platform-settings/platform-settings.service.js";

function i18nPayload(name, nameAr) {
  const base = {};
  if (name != null && String(name).trim()) base.en = String(name).trim();
  if (nameAr != null && String(nameAr).trim()) base.ar = String(nameAr).trim();
  return Object.keys(base).length ? base : undefined;
}

function descI18nPayload(description, descriptionAr) {
  const base = {};
  if (description != null && String(description).trim()) base.en = String(description).trim();
  if (descriptionAr != null && String(descriptionAr).trim()) base.ar = String(descriptionAr).trim();
  return Object.keys(base).length ? base : undefined;
}

async function assertOwnedCategory(driverId, categoryId) {
  const cat = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
  if (!cat) {
    const e = new Error("category not found");
    e.statusCode = 404;
    throw e;
  }
  if (cat.ownerDriverId !== Number(driverId)) {
    const e = new Error("forbidden: category not owned by this driver");
    e.statusCode = 403;
    throw e;
  }
  return cat;
}

async function assertOwnedProduct(driverId, productId) {
  const product = await prisma.product.findUnique({
    where: { id: Number(productId) },
    include: { variants: true, category: true },
  });
  if (!product) {
    const e = new Error("product not found");
    e.statusCode = 404;
    throw e;
  }
  if (product.ownerDriverId !== Number(driverId)) {
    const e = new Error("forbidden: product not owned by this driver");
    e.statusCode = 403;
    throw e;
  }
  return product;
}

/**
 * Find-or-create Size / ProductType by display name (driver-friendly).
 * @param {"size"|"type"} kind
 * @param {string} name
 */
async function findOrCreateNamed(kind, name) {
  const label = String(name || "").trim() || (kind === "size" ? "Default" : "Standard");
  if (kind === "size") {
    const existing = await prisma.size.findFirst({
      where: { OR: [{ name: label }, { nameAr: label }] },
    });
    if (existing) return existing;
    return prisma.size.create({
      data: { name: label, nameAr: label, nameI18n: { ar: label, en: label } },
    });
  }
  const existing = await prisma.productType.findFirst({
    where: { OR: [{ name: label }, { nameAr: label }] },
  });
  if (existing) return existing;
  return prisma.productType.create({
    data: { name: label, nameAr: label, nameI18n: { ar: label, en: label } },
  });
}

async function syncInventoryForVariant(driverId, variantId, price, quantityOnHand, currency) {
  const existing = await prisma.driverInventoryItem.findUnique({
    where: {
      driverId_variantId: { driverId: Number(driverId), variantId: Number(variantId) },
    },
  });
  if (existing) {
    return prisma.driverInventoryItem.update({
      where: { id: existing.id },
      data: {
        price: Number(price),
        quantityOnHand: Number(quantityOnHand ?? existing.quantityOnHand),
        currency: currency || existing.currency || "IQD",
      },
    });
  }
  return prisma.driverInventoryItem.create({
    data: {
      driverId: Number(driverId),
      variantId: Number(variantId),
      price: Number(price),
      quantityOnHand: Number(quantityOnHand ?? 0),
      currency: currency || "IQD",
    },
  });
}

const productDetailInclude = {
  category: true,
  variants: {
    orderBy: { id: "asc" },
    include: {
      size: true,
      type: true,
      driverInventoryItems: true,
    },
  },
};

function enrichDriverProduct(product, driverId) {
  if (!product) return product;
  const variants = (product.variants || []).map((v) => {
    const inv = (v.driverInventoryItems || []).find((i) => i.driverId === Number(driverId));
    const { driverInventoryItems: _d, ...rest } = v;
    return {
      ...rest,
      price: rest.price != null ? Number(rest.price) : rest.price,
      inventory: inv
        ? { id: inv.id, quantityOnHand: inv.quantityOnHand, price: inv.price, currency: inv.currency }
        : null,
    };
  });
  return { ...product, variants };
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function listMyCategories(driverId) {
  return prisma.category.findMany({
    where: { ownerDriverId: Number(driverId) },
    orderBy: [{ parentId: "asc" }, { id: "asc" }],
    include: {
      children: { orderBy: { id: "asc" } },
      _count: { select: { products: true, children: true } },
    },
  });
}

export async function createMyCategory(driverId, body) {
  const name = String(body?.name || "").trim();
  if (!name) {
    const e = new Error("name required");
    e.statusCode = 400;
    throw e;
  }
  const nameAr = body?.nameAr != null ? String(body.nameAr).trim() : name;
  let parentId = null;
  if (body?.parentId != null && String(body.parentId).trim() !== "") {
    const parent = await assertOwnedCategory(driverId, body.parentId);
    if (parent.parentId != null) {
      const e = new Error("subcategories cannot have children (max 2 levels)");
      e.statusCode = 400;
      throw e;
    }
    parentId = parent.id;
  }

  return prisma.category.create({
    data: {
      name,
      nameI18n: i18nPayload(name, nameAr),
      description: body?.description != null ? String(body.description).trim() || null : null,
      descriptionI18n: descI18nPayload(body?.description, body?.descriptionAr),
      image_url: body?.imageUrl || body?.image_url || null,
      ownerDriverId: Number(driverId),
      parentId,
    },
    include: { children: true, _count: { select: { products: true, children: true } } },
  });
}

export async function updateMyCategory(driverId, id, body) {
  await assertOwnedCategory(driverId, id);
  /** @type {Record<string, unknown>} */
  const data = {};
  if (body?.name != null) data.name = String(body.name).trim();
  if (body?.name != null || body?.nameAr != null) {
    data.nameI18n = i18nPayload(body?.name ?? data.name, body?.nameAr);
  }
  if (body?.description !== undefined) {
    data.description = body.description == null || body.description === "" ? null : String(body.description);
  }
  if (body?.description !== undefined || body?.descriptionAr !== undefined) {
    data.descriptionI18n = descI18nPayload(body?.description, body?.descriptionAr);
  }
  if (body?.imageUrl !== undefined || body?.image_url !== undefined) {
    data.image_url = body.imageUrl ?? body.image_url ?? null;
  }
  if (body?.parentId !== undefined) {
    if (body.parentId == null || body.parentId === "") {
      data.parentId = null;
    } else {
      const parent = await assertOwnedCategory(driverId, body.parentId);
      if (Number(parent.id) === Number(id)) {
        const e = new Error("category cannot be its own parent");
        e.statusCode = 400;
        throw e;
      }
      if (parent.parentId != null) {
        const e = new Error("subcategories cannot have children (max 2 levels)");
        e.statusCode = 400;
        throw e;
      }
      data.parentId = parent.id;
    }
  }
  return prisma.category.update({
    where: { id: Number(id) },
    data,
    include: { children: true, _count: { select: { products: true, children: true } } },
  });
}

export async function removeMyCategory(driverId, id) {
  await assertOwnedCategory(driverId, id);
  const productCount = await prisma.product.count({ where: { categoryId: Number(id) } });
  if (productCount > 0) {
    const e = new Error("category has products — move or delete them first");
    e.statusCode = 400;
    throw e;
  }
  const childCount = await prisma.category.count({ where: { parentId: Number(id) } });
  if (childCount > 0) {
    const e = new Error("category has subcategories — delete them first");
    e.statusCode = 400;
    throw e;
  }
  await prisma.category.delete({ where: { id: Number(id) } });
}

// ─── Products ───────────────────────────────────────────────────────────────

export async function listMyProducts(driverId) {
  const rows = await prisma.product.findMany({
    where: { ownerDriverId: Number(driverId) },
    orderBy: { id: "desc" },
    include: productDetailInclude,
  });
  return rows.map((p) => enrichDriverProduct(p, driverId));
}

export async function getMyProduct(driverId, productId) {
  const product = await assertOwnedProduct(driverId, productId);
  const full = await prisma.product.findUnique({
    where: { id: product.id },
    include: productDetailInclude,
  });
  return enrichDriverProduct(full, driverId);
}

/**
 * Create captain-owned product (+ optional variants).
 * Variants may be omitted so the captain can fill the variants tab after create.
 */
export async function createMyProduct(driverId, body) {
  const name = String(body?.name || "").trim();
  if (!name) {
    const e = new Error("name required");
    e.statusCode = 400;
    throw e;
  }
  const categoryId = Number(body?.categoryId);
  if (!categoryId) {
    const e = new Error("categoryId required");
    e.statusCode = 400;
    throw e;
  }
  await assertOwnedCategory(driverId, categoryId);

  const imageUrl = String(body?.imageUrl || "").trim();
  if (!imageUrl) {
    const e = new Error("imageUrl required");
    e.statusCode = 400;
    throw e;
  }

  const variantsInput = Array.isArray(body?.variants) ? body.variants : [];
  const nameAr = body?.nameAr != null ? String(body.nameAr).trim() : name;
  const description = body?.description != null ? String(body.description).trim() : null;

  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name,
        nameI18n: i18nPayload(name, nameAr),
        description,
        descriptionI18n: descI18nPayload(description, body?.descriptionAr),
        categoryId,
        imageUrl,
        images: Array.isArray(body?.images) ? body.images : undefined,
        isActive: body?.isActive !== false,
        ownerDriverId: Number(driverId),
      },
    });

    for (const v of variantsInput) {
      let sizeId = v.sizeId != null ? Number(v.sizeId) : null;
      let typeId = v.typeId != null ? Number(v.typeId) : null;
      if (!sizeId) {
        const size = await findOrCreateNamed("size", v.sizeName || v.size || "Default");
        sizeId = size.id;
      }
      if (!typeId) {
        const type = await findOrCreateNamed("type", v.typeName || v.type || "Standard");
        typeId = type.id;
      }
      const price = Number(v.price);
      if (!Number.isFinite(price) || price < 0) {
        const e = new Error("variant price required");
        e.statusCode = 400;
        throw e;
      }
      const qty = Number(v.quantityOnHand ?? v.stock ?? 0);
      const currency = v.currency || "IQD";
      const variant = await tx.productVariant.create({
        data: {
          productId: product.id,
          sizeId,
          typeId,
          price,
          stock: qty,
          currency,
          sku: v.sku ? String(v.sku).trim() || null : null,
          imageUrl: v.imageUrl || null,
          images: Array.isArray(v.images) ? v.images : undefined,
        },
      });
      await tx.driverInventoryItem.create({
        data: {
          driverId: Number(driverId),
          variantId: variant.id,
          quantityOnHand: qty,
          price,
          currency,
        },
      });
    }

    return product.id;
  });

  const full = await prisma.product.findUnique({
    where: { id: created },
    include: productDetailInclude,
  });
  return enrichDriverProduct(full, driverId);
}

export async function updateMyProduct(driverId, id, body) {
  await assertOwnedProduct(driverId, id);
  /** @type {Record<string, unknown>} */
  const data = {};
  if (body?.name != null) data.name = String(body.name).trim();
  if (body?.name != null || body?.nameAr != null) {
    data.nameI18n = i18nPayload(body?.name ?? data.name, body?.nameAr);
  }
  if (body?.description !== undefined) {
    data.description = body.description == null || body.description === "" ? null : String(body.description);
  }
  if (body?.description !== undefined || body?.descriptionAr !== undefined) {
    data.descriptionI18n = descI18nPayload(body?.description, body?.descriptionAr);
  }
  if (body?.imageUrl != null) data.imageUrl = String(body.imageUrl).trim();
  if (body?.images !== undefined) {
    data.images = Array.isArray(body.images) ? (body.images.length ? body.images : null) : null;
  }
  if (body?.isActive !== undefined) data.isActive = !!body.isActive;
  if (body?.categoryId != null) {
    await assertOwnedCategory(driverId, body.categoryId);
    data.categoryId = Number(body.categoryId);
  }

  await prisma.product.update({ where: { id: Number(id) }, data });
  const full = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: productDetailInclude,
  });
  return enrichDriverProduct(full, driverId);
}

export async function removeMyProduct(driverId, id) {
  const product = await assertOwnedProduct(driverId, id);
  const variantIds = product.variants.map((v) => v.id);
  await prisma.$transaction(async (tx) => {
    if (variantIds.length) {
      await tx.driverInventoryItem.deleteMany({
        where: { driverId: Number(driverId), variantId: { in: variantIds } },
      });
      await tx.productVariant.deleteMany({ where: { productId: Number(id) } });
    }
    await tx.product.delete({ where: { id: Number(id) } });
  });
}

/**
 * Add a variant to an owned product and sync inventory.
 */
export async function addMyProductVariant(driverId, productId, body) {
  await assertOwnedProduct(driverId, productId);
  let sizeId = body?.sizeId != null ? Number(body.sizeId) : null;
  let typeId = body?.typeId != null ? Number(body.typeId) : null;
  if (!sizeId) {
    sizeId = (await findOrCreateNamed("size", body?.sizeName || body?.size || "Default")).id;
  }
  if (!typeId) {
    typeId = (await findOrCreateNamed("type", body?.typeName || body?.type || "Standard")).id;
  }
  const price = Number(body?.price);
  if (!Number.isFinite(price) || price < 0) {
    const e = new Error("price required");
    e.statusCode = 400;
    throw e;
  }
  const qty = Number(body?.quantityOnHand ?? body?.stock ?? 0);
  const currency = body?.currency || "IQD";

  const variant = await prisma.productVariant.create({
    data: {
      productId: Number(productId),
      sizeId,
      typeId,
      price,
      stock: qty,
      currency,
      sku: body?.sku ? String(body.sku).trim() || null : null,
      imageUrl: body?.imageUrl || null,
      images: Array.isArray(body?.images) ? body.images : undefined,
    },
    include: { size: true, type: true },
  });
  await syncInventoryForVariant(driverId, variant.id, price, qty, currency);

  const full = await prisma.product.findUnique({
    where: { id: Number(productId) },
    include: productDetailInclude,
  });
  return enrichDriverProduct(full, driverId);
}

export async function updateMyProductVariant(driverId, productId, variantId, body) {
  await assertOwnedProduct(driverId, productId);
  const variant = await prisma.productVariant.findUnique({ where: { id: Number(variantId) } });
  if (!variant || variant.productId !== Number(productId)) {
    const e = new Error("variant not found");
    e.statusCode = 404;
    throw e;
  }
  /** @type {Record<string, unknown>} */
  const data = {};
  if (body?.price != null) data.price = Number(body.price);
  if (body?.stock != null) data.stock = Number(body.stock);
  if (body?.currency != null) data.currency = String(body.currency);
  if (body?.imageUrl !== undefined) data.imageUrl = body.imageUrl || null;
  if (body?.images !== undefined) {
    data.images = Array.isArray(body.images) ? (body.images.length ? body.images : null) : null;
  }
  if (body?.sku !== undefined) data.sku = body.sku ? String(body.sku).trim() || null : null;
  if (body?.sizeId != null) data.sizeId = Number(body.sizeId);
  if (body?.typeId != null) data.typeId = Number(body.typeId);

  await prisma.productVariant.update({ where: { id: Number(variantId) }, data });

  const price = body?.price != null ? Number(body.price) : Number(variant.price);
  const qty =
    body?.quantityOnHand != null
      ? Number(body.quantityOnHand)
      : body?.stock != null
        ? Number(body.stock)
        : undefined;
  if (qty != null || body?.price != null || body?.currency != null) {
    await syncInventoryForVariant(
      driverId,
      variantId,
      price,
      qty ?? undefined,
      body?.currency || variant.currency,
    );
  }

  const full = await prisma.product.findUnique({
    where: { id: Number(productId) },
    include: productDetailInclude,
  });
  return enrichDriverProduct(full, driverId);
}

export async function removeMyProductVariant(driverId, productId, variantId) {
  await assertOwnedProduct(driverId, productId);
  const variant = await prisma.productVariant.findUnique({ where: { id: Number(variantId) } });
  if (!variant || variant.productId !== Number(productId)) {
    const e = new Error("variant not found");
    e.statusCode = 404;
    throw e;
  }
  await prisma.$transaction(async (tx) => {
    await tx.driverInventoryItem.deleteMany({
      where: { driverId: Number(driverId), variantId: Number(variantId) },
    });
    await tx.productVariant.delete({ where: { id: Number(variantId) } });
  });
  const full = await prisma.product.findUnique({
    where: { id: Number(productId) },
    include: productDetailInclude,
  });
  return enrichDriverProduct(full, driverId);
}

// ─── Reports / accounts ─────────────────────────────────────────────────────

export async function getMyReports(driverId) {
  const commissionPct = await getPlatformCommissionPct();
  const delivered = await prisma.productOrder.findMany({
    where: { driverId: Number(driverId), status: "DELIVERED" },
    select: {
      id: true,
      subtotal: true,
      commissionPct: true,
      commissionAmt: true,
      total: true,
      currency: true,
      deliveredAt: true,
      createdAt: true,
    },
    orderBy: { deliveredAt: "desc" },
    take: 200,
  });

  const gross = delivered.reduce((s, o) => s + Number(o.subtotal || 0), 0);
  const fees = delivered.reduce((s, o) => s + Number(o.commissionAmt || 0), 0);
  const net = gross - fees;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const sumIn = (from) => {
    const rows = delivered.filter((o) => {
      const t = o.deliveredAt || o.createdAt;
      return t && new Date(t) >= from;
    });
    const g = rows.reduce((s, o) => s + Number(o.subtotal || 0), 0);
    const f = rows.reduce((s, o) => s + Number(o.commissionAmt || 0), 0);
    return { orders: rows.length, gross: Number(g.toFixed(2)), fees: Number(f.toFixed(2)), net: Number((g - f).toFixed(2)) };
  };

  const [productCount, categoryCount, inventoryRows] = await Promise.all([
    prisma.product.count({ where: { ownerDriverId: Number(driverId) } }),
    prisma.category.count({ where: { ownerDriverId: Number(driverId) } }),
    prisma.driverInventoryItem.findMany({
      where: { driverId: Number(driverId) },
      select: { quantityOnHand: true, price: true },
    }),
  ]);

  const stockUnits = inventoryRows.reduce((s, i) => s + i.quantityOnHand, 0);
  const stockValue = inventoryRows.reduce((s, i) => s + i.quantityOnHand * Number(i.price), 0);

  return {
    platformCommissionPct: commissionPct,
    catalog: {
      categories: categoryCount,
      products: productCount,
      stockUnits,
      stockValue: Number(stockValue.toFixed(2)),
    },
    earnings: {
      allTime: {
        orders: delivered.length,
        gross: Number(gross.toFixed(2)),
        fees: Number(fees.toFixed(2)),
        net: Number(net.toFixed(2)),
      },
      today: sumIn(startOfDay),
      week: sumIn(startOfWeek),
      month: sumIn(startOfMonth),
    },
    recentOrders: delivered.slice(0, 20).map((o) => ({
      id: o.id,
      subtotal: o.subtotal,
      commissionPct: o.commissionPct,
      commissionAmt: o.commissionAmt,
      net: Number((Number(o.subtotal) - Number(o.commissionAmt)).toFixed(2)),
      currency: o.currency,
      deliveredAt: o.deliveredAt,
    })),
  };
}
