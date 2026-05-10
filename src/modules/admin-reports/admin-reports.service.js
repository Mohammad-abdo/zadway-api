import prisma from "../../config/prisma.js";
import { parseUtcRangeInclusive } from "./parseRange.js";

/** @param {string[]} permissionNames */
function hasPerm(permissionNames, viewName, manageName) {
  if (!permissionNames?.length) return false;
  if (permissionNames.includes("*")) return true;
  return permissionNames.includes(viewName) || permissionNames.includes(manageName);
}

function num(v) {
  if (typeof v === "bigint") return Number(v);
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Line-level revenue by product/variant for orders created in the UTC range.
 * @param {Date} from
 * @param {Date} toExclusive
 */
async function productSalesInRange(from, toExclusive) {
  const orderRows = await prisma.productOrder.findMany({
    where: { createdAt: { gte: from, lt: toExclusive } },
    select: { id: true },
  });
  const orderIds = orderRows.map((o) => o.id);
  if (!orderIds.length) return [];

  const agg = await prisma.productOrderItem.groupBy({
    by: ["variantId"],
    where: { orderId: { in: orderIds } },
    _sum: { lineTotal: true, quantity: true },
  });
  const variantIds = agg.map((a) => a.variantId);
  if (!variantIds.length) return [];

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: { select: { id: true, name: true } },
      size: { select: { name: true } },
      type: { select: { name: true } },
    },
  });
  const vMap = new Map(variants.map((v) => [v.id, v]));

  return agg
    .map((row) => {
      const v = vMap.get(row.variantId);
      return {
        variantId: row.variantId,
        productId: v?.productId ?? null,
        productName: v?.product?.name ?? "",
        sku: v?.sku ?? "",
        sizeName: v?.size?.name ?? "",
        typeName: v?.type?.name ?? "",
        quantity: num(row._sum.quantity),
        revenue: Math.round(num(row._sum.lineTotal) * 100) / 100,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

/** Catalog snapshot for shop reports (not date-filtered). */
async function getShopSnapshot() {
  const [totalProducts, activeProducts, totalVariants, categories, sizes, types, products] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.productVariant.count(),
    prisma.category.count(),
    prisma.size.count(),
    prisma.productType.count(),
    prisma.product.findMany({
      take: 150,
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        category: { select: { name: true } },
        variants: {
          take: 1,
          select: { sku: true, price: true, stock: true, currency: true },
        },
      },
    }),
  ]);

  const catalog = products.map((p) => {
    const v0 = p.variants[0];
    return {
      id: p.id,
      name: p.name,
      categoryName: p.category?.name ?? "",
      isActive: p.isActive,
      sku: v0?.sku ?? "",
      price: v0?.price != null ? Math.round(num(v0.price) * 100) / 100 : null,
      stock: v0?.stock ?? 0,
      currency: v0?.currency ?? "",
    };
  });

  return {
    counts: {
      products: totalProducts,
      productsActive: activeProducts,
      variants: totalVariants,
      categories,
      sizes,
      productTypes: types,
    },
    catalog,
  };
}

/**
 * @param {string[]} permissionNames
 * @param {string} fromYmd
 * @param {string} toYmd
 */
export async function getReportsRange(permissionNames, fromYmd, toYmd) {
  const canOrders = hasPerm(permissionNames, "orders.view", "orders.manage");
  const canShop = hasPerm(permissionNames, "products.view", "products.manage");
  const { from, toExclusive } = parseUtcRangeInclusive(fromYmd, toYmd);

  /** @type {import("@prisma/client").Prisma.ProductOrderWhereInput} */
  const where = {
    createdAt: {
      gte: from,
      lt: toExclusive,
    },
  };

  let orders = null;
  if (canOrders) {
    const [orderCount, sumAgg, byStatus, dailyRows, productSales] = await Promise.all([
      prisma.productOrder.count({ where }),
      prisma.productOrder.aggregate({
        where,
        _sum: { total: true },
      }),
      prisma.productOrder.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.$queryRaw`
        SELECT DATE(created_at) AS d,
               COUNT(*) AS orderCount,
               COALESCE(SUM(total), 0) AS revenue
        FROM Product_orders
        WHERE created_at >= ${from}
          AND created_at < ${toExclusive}
        GROUP BY DATE(created_at)
        ORDER BY d ASC
      `,
      productSalesInRange(from, toExclusive),
    ]);

    const daily = (Array.isArray(dailyRows) ? dailyRows : []).map((row) => ({
      date: row.d instanceof Date ? row.d.toISOString().slice(0, 10) : String(row.d),
      orders: num(row.orderCount),
      revenue: Math.round(num(row.revenue) * 100) / 100,
    }));

    const statusBreakdown = byStatus.map((r) => ({
      status: r.status,
      count: r._count._all,
      revenue: Math.round(num(r._sum.total) * 100) / 100,
    }));

    orders = {
      count: orderCount,
      revenue: Math.round(num(sumAgg._sum.total) * 100) / 100,
      byStatus: statusBreakdown,
      daily,
      productSales,
    };
  }

  let shop = null;
  if (canShop) {
    shop = await getShopSnapshot();
  }

  if (!canOrders && !canShop) {
    return {
      from: fromYmd,
      to: toYmd,
      orders: null,
      shop: null,
      access: { orders: false, shop: false },
      message: "no_report_access",
    };
  }

  return {
    from: fromYmd,
    to: toYmd,
    orders,
    shop,
    access: { orders: canOrders, shop: !!shop },
    ...(!canOrders && canShop ? { message: "no_order_access" } : {}),
  };
}
