/**
 * Parse list query: page, limit, sort (field:asc|desc), q (contains search on string fields).
 */
export function parseListQuery(query, { searchableFields = [], defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(String(query.page || "1"), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(query.limit || String(defaultLimit)), 10) || defaultLimit));
  const skip = (page - 1) * limit;

  let orderBy = { id: "desc" };
  const sort = query.sort;
  if (typeof sort === "string" && sort.includes(":")) {
    const [field, dir] = sort.split(":");
    const direction = dir?.toLowerCase() === "asc" ? "asc" : "desc";
    if (field) orderBy = { [field]: direction };
  }

  const q = typeof query.q === "string" ? query.q.trim() : "";
  let where = {};
  if (q && searchableFields.length) {
    where = {
      OR: searchableFields.map((field) => ({
        [field]: { contains: q },
      })),
    };
  }

  return { page, limit, skip, take: limit, orderBy, where };
}
