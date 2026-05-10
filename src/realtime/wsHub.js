let wss = null;

export function setWsServer(server) {
  wss = server;
}

export function broadcast(event, payload) {
  if (!wss) return;
  const msg = JSON.stringify({ event, payload, ts: Date.now() });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try {
        client.send(msg);
      } catch {
        // ignore
      }
    }
  }
}

