import { WebSocketServer } from "ws";
import prisma from "../config/prisma.js";
import { verifyToken } from "../core/utils/jwtHelper.js";
import { registerUserSocket, setWsServer } from "./wsHub.js";

function parseToken(req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

function safeSend(socket, payload) {
  if (socket.readyState !== socket.OPEN) return;
  try {
    socket.send(payload);
  } catch {
    // Connection dropped between the readyState check and send() — ignore,
    // the socket's own "close"/"error" handlers will clean up registration.
  }
}

export function initWsServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  setWsServer(wss);

  // Without this handler, an 'error' event on the server itself would be an
  // unhandled EventEmitter error and crash the whole Node process.
  wss.on("error", () => {
    // ignore — per-connection errors are handled via each socket's own
    // "error" listener registered below.
  });

  wss.on("connection", async (socket, req) => {
    socket.on("error", () => {
      // Prevent an unhandled 'error' event on this socket (e.g. an abrupt
      // TCP reset) from crashing the process.
    });

    const token = parseToken(req);
    if (!token) {
      socket.close(1008, "Missing token");
      return;
    }

    try {
      const decoded = verifyToken(token);
      socket.userId = decoded?.id;
    } catch {
      socket.close(1008, "Invalid token");
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: Number(socket.userId) },
        select: { userType: true },
      });
      socket.userType = user?.userType ?? null;
    } catch {
      socket.userType = null;
    }

    registerUserSocket(socket, socket.userId);

    safeSend(
      socket,
      JSON.stringify({
        event: "connected",
        payload: { ok: true, userId: socket.userId, userType: socket.userType },
        ts: Date.now(),
      }),
    );

    socket.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.event === "ping") {
          safeSend(socket, JSON.stringify({ event: "pong", ts: Date.now() }));
        }
      } catch {
        // ignore
      }
    });
  });

  return wss;
}
