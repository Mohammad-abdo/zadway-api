import prisma from "../../config/prisma.js";

function safeStr(v, max = 512) {
  if (v == null) return null;
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

export default function securityAudit() {
  return (req, res, next) => {
    const startedAt = Date.now();

    res.on("finish", async () => {
      try {
        // Avoid logging uploads/static
        if (req.path?.startsWith("/uploads")) return;
        const user = req.user;
        const ip =
          safeStr(req.headers["x-real-ip"]) ||
          safeStr(req.ip) ||
          safeStr(req.connection?.remoteAddress);
        const forwardedFor = safeStr(req.headers["x-forwarded-for"], 2000);
        const userAgent = safeStr(req.headers["user-agent"], 512);

        await prisma.securityAuditLog.create({
          data: {
            category: "api",
            userId: user?.id ?? null,
            userType: user?.userType ?? null,
            ip,
            forwardedFor,
            userAgent,
            method: safeStr(req.method, 10) || "GET",
            route: safeStr(req.originalUrl, 512) || safeStr(req.url, 512) || "/",
            requestId: safeStr(req.requestId, 64),
            statusCode: res.statusCode,
            metadata: {
              durationMs: Date.now() - startedAt,
            },
          },
        });
      } catch {
        // Never break the request if audit logging fails
      }
    });

    next();
  };
}

