import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import rateLimit from "express-rate-limit";
import { loadEnv } from "./config/env.js";
import i18nMiddleware from "./core/middlewares/i18n.middleware.js";
import requestId from "./core/middlewares/requestId.middleware.js";
import securityAudit from "./core/middlewares/securityAudit.middleware.js";
import apiRoutes from "./routes/index.js";
import notFound from "./core/middlewares/notFound.middleware.js";
import errorHandler from "./core/middlewares/errorHandler.middleware.js";
import { ensureUploadDirs } from "./core/upload/mediaPaths.js";

loadEnv();

const app = express();

ensureUploadDirs();

app.set("trust proxy", 1);

app.use(helmet());
const allowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser clients (no origin header)
      if (!origin) return cb(null, true);
      if (!allowedOrigins.length) return cb(null, true);
      return allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error("CORS blocked"), false);
    },
    credentials: String(process.env.CORS_CREDENTIALS || "false").toLowerCase() === "true",
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestId);
app.use(i18nMiddleware);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 50,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

app.use("/api", apiRoutes);
app.use("/api", securityAudit());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Qarora API", version: "1.0.0" },
  },
  apis: ["./src/modules/**/*.routes.js"],
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(notFound);
app.use(errorHandler);

export default app;
