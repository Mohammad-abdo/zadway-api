import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma's default pool is `cpus * 2 + 1` connections per process, which exceeds MySQL
 * `max_connections` on small hosts (and multiplies under PM2 cluster mode) → "Too many connections".
 * Cap it unless the URL already sets `connection_limit`.
 */
function datasourceUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", String(Number(process.env.DB_CONNECTION_LIMIT) || 5));
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", String(Number(process.env.DB_POOL_TIMEOUT) || 20));
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const url = datasourceUrl();

const prisma = new PrismaClient({
  ...(url ? { datasources: { db: { url } } } : {}),
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export default prisma;
