import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { collectHttpMetrics, serveMetrics } from "./metrics";
import { log } from "./logger";

export async function createApp() {
  const app = express();

  app.use(cors());
  app.use(collectHttpMetrics);
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app.get("/metrics", serveMetrics);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.once("finish", () => {
      if (path.startsWith("/api")) {
        log(`${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`);
      }
    });

    next();
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    console.error("Request failed:", err instanceof Error ? err.name : "Unknown error");
    res.status(status).json({ message: "Internal server error" });
  });

  return { app, server };
}
