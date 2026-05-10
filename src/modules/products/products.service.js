import prisma from "../../config/prisma.js";
import { parseListQuery } from "../../core/utils/pagination.js";

const SEARCHABLE = ["name"];

const VARIANT_INCLUDE = {
  variants: {
    take: 1,
    orderBy: { id: "asc" },
    include: { size: true, type: true },
  },
};

function parseJsonMaybe(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Strips UI-only keys (e.g. `price` lives on ProductVariant, not Product).
 * Merges optional `nameAr` / `descriptionAr` into `nameI18n` / `descriptionI18n`.
 */
function buildProductWritePayload(body) {
  const b = body && typeof body === "object" ? body : {};
  const name = b.name !== undefined && b.name !== null ? String(b.name).trim() : undefined;
  const description =
    b.description !== undefined && b.description !== null ? String(b.description).trim() : undefined;
  const nameAr = b.nameAr !== undefined && b.nameAr !== null ? String(b.nameAr).trim() : undefined;
  const descriptionAr =
    b.descriptionAr !== undefined && b.descriptionAr !== null ? String(b.descriptionAr).trim() : undefined;

  const data = {};

  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description === "" ? null : description;

  if (b.categoryId !== undefined && b.categoryId !== null && b.categoryId !== "") {
    const n = Number(b.categoryId);
    if (!Number.isNaN(n)) data.categoryId = n;
  }

  if (b.imageUrl !== undefined) {
    const u = b.imageUrl == null ? "" : String(b.imageUrl).trim();
    data.imageUrl = u;
  }

  if (b.images !== undefined) {
    if (Array.isArray(b.images)) data.images = b.images.length ? b.images : null;
    else {
      const parsed = parseJsonMaybe(b.images);
      data.images = parsed === undefined ? undefined : parsed;
    }
  }

  if (b.isActive !== undefined) data.isActive = !!b.isActive;

  let nameI18n = parseJsonMaybe(b.nameI18n);
  let descriptionI18n = parseJsonMaybe(b.descriptionI18n);

  if (name !== undefined || nameAr !== undefined || nameI18n !== undefined) {
    const base = typeof nameI18n === "object" && nameI18n && !Array.isArray(nameI18n) ? { ...nameI18n } : {};
    if (name !== undefined) base.en = name;
    if (nameAr !== undefined) {
      if (nameAr === "") delete base.ar;
      else base.ar = nameAr;
    }
    if (Object.keys(base).length) data.nameI18n = base;
  }

  if (description !== undefined || descriptionAr !== undefined || descriptionI18n !== undefined) {
    const base =
      typeof descriptionI18n === "object" && descriptionI18n && !Array.isArray(descriptionI18n)
        ? { ...descriptionI18n }
        : {};
    if (description !== undefined) {
      if (description === "") delete base.en;
      else base.en = description;
    }
    if (descriptionAr !== undefined) {
      if (descriptionAr === "") delete base.ar;
      else base.ar = descriptionAr;
    }
    if (Object.keys(base).length) data.descriptionI18n = base;
  }

  return data;
}

function attachListPrice(row) {
  const v = row.variants?.[0];
  const { variants, ...rest } = row;
  const price = v?.price != null ? Number(v.price) : null;
  return { ...rest, price, variant: v || null };
}

function flattenForForm(row) {
  if (!row) return row;
  const ni = typeof row.nameI18n === "object" && row.nameI18n && !Array.isArray(row.nameI18n) ? row.nameI18n : {};
  const di =
    typeof row.descriptionI18n === "object" && row.descriptionI18n && !Array.isArray(row.descriptionI18n)
      ? row.descriptionI18n
      : {};
  return {
    ...row,
    nameAr: ni.ar != null ? String(ni.ar) : "",
    descriptionAr: di.ar != null ? String(di.ar) : "",
  };
}

export async function list(query) {
  const parsed = parseListQuery(query, { searchableFields: SEARCHABLE });
  const { skip, take, orderBy, where, page, limit } = parsed;
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy,
      include: { variants: { take: 1, orderBy: { id: "asc" } } },
    }),
    prisma.product.count({ where }),
  ]);
  const items = rows.map(attachListPrice);
  return { items, total, page, limit };
}

export async function getById(id) {
  const numId = Number(id);
  const row = await prisma.product.findUnique({
    where: { id: numId },
    include: VARIANT_INCLUDE,
  });
  if (!row) return null;
  return flattenForForm(attachListPrice(row));
}

export async function getProductsByCategoryId(categoryId) {
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
    where: { categoryId: Number(categoryId) },
    include: VARIANT_INCLUDE,
  }),
  prisma.product.count({ where: { categoryId: Number(categoryId) } }),
]);
  return { items: rows, total };
}
export async function create(body) {
  const data = buildProductWritePayload(body);
  if (!data.name) {
    const e = new Error("name required");
    e.statusCode = 400;
    throw e;
  }
  if (data.categoryId == null) {
    const e = new Error("categoryId required");
    e.statusCode = 400;
    throw e;
  }
  if (!data.imageUrl) {
    const e = new Error("imageUrl required");
    e.statusCode = 400;
    throw e;
  }
  const created = await prisma.product.create({ data });
  return flattenForForm(attachListPrice(await prisma.product.findUnique({
    where: { id: created.id },
    include: VARIANT_INCLUDE,
  })));
}

export async function update(id, body) {
  const numId = Number(id);
  const data = buildProductWritePayload(body);
  if (Object.keys(data).length === 0) {
    const row = await prisma.product.findUnique({
      where: { id: numId },
      include: VARIANT_INCLUDE,
    });
    return row ? flattenForForm(attachListPrice(row)) : null;
  }
  const updated = await prisma.product.update({
    where: { id: numId },
    data,
  });
  return flattenForForm(
    attachListPrice(
      await prisma.product.findUnique({
        where: { id: updated.id },
        include: VARIANT_INCLUDE,
      })
    )
  );
}

export async function remove(id) {
  const numId = Number(id);
  await prisma.product.delete({ where: { id: numId } });
}
