import { loadEnv } from "./config/env.js";
import app from "./app.js";
import { createServer } from "node:http";
import { initWsServer } from "./realtime/wsServer.js";

loadEnv();

const PORT = Number(process.env.PORT) || 3000;

const server = createServer(app);

initWsServer(server);

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`API docs: http://localhost:${PORT}/api/docs`);
});
