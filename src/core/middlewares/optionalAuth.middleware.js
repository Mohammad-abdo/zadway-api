import prisma from "../../config/prisma.js";
import { verifyToken } from "../utils/jwtHelper.js";

/**
 * Attaches `req.user` when a valid Bearer token is present; otherwise continues without user.
 */
export default async function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    next();
    return;
  }
  try {
    const decoded = verifyToken(token);
    const id = decoded?.id;
    if (!id) {
      next();
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        userType: true,
        status: true,
        name: true,
        displayName: true,
      },
    });
    if (user) req.user = user;
  } catch {
    // invalid token: treat as anonymous for public client routes
  }
  next();
}
