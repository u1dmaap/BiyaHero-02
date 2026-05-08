import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Build an explicit origin allowlist.
// In production/deployment, set ALLOWED_ORIGINS to a comma-separated list of trusted origins.
// In development, allow the Replit dev domain and localhost automatically.
const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

const devOrigins =
  process.env.NODE_ENV !== "production"
    ? [
        process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
      ].filter(Boolean) as string[]
    : [];

const allowedOrigins = [...configuredOrigins, ...devOrigins];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server or same-origin requests (no Origin header).
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some((o) => origin === o || origin.startsWith(o));
      if (allowed) return callback(null, true);
      // In dev with no explicit list configured, allow any origin so local curl/tools still work.
      if (process.env.NODE_ENV !== "production" && configuredOrigins.length === 0) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not in allowlist`));
    },
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
