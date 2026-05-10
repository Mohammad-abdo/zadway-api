import { randomUUID } from "node:crypto";

export default function requestId(req, res, next) {
  const existing = req.headers["x-request-id"];
  const id = typeof existing === "string" && existing.trim() ? existing.trim() : randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}

