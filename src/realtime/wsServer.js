import { WebSocketServer } from "ws";
import { verifyToken } from "../core/utils/jwtHelper.js";
import { setWsServer } from "./wsHub.js";

function parseToken(req) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

export function initWsServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  setWsServer(wss);

  wss.on("connection", (socket, req) => {
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

    socket.send(
      JSON.stringify({
        event: "connected",
        payload: { ok: true },
        ts: Date.now(),
      })
    );

    socket.on("message", (raw) => {
      // optional: handle subscriptions/pings
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.event === "ping") {
          socket.send(JSON.stringify({ event: "pong", ts: Date.now() }));
        }
      } catch {
        // ignore
      }
    });
  });

  return wss;
}

