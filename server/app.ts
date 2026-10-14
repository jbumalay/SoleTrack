import express, { type Express } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { config } from "./config";
import { errorMiddleware } from "./utils";
import { registerPublicRoutes } from "./routes/public";
import { registerAuthRoutes } from "./routes/auth";
import { registerCartRoutes } from "./routes/cart";
import { registerOrderRoutes } from "./routes/orders";
import { registerSellerRoutes } from "./routes/seller";
import { registerAdminRoutes } from "./routes/admin";

/**
 * Build the Express app: JSON body parsing, all /api/* routes, central error
 * middleware, then Vite (dev) or dist/ static serving (prod).
 *
 * CORS: intentionally NO permissive cors() middleware. The frontend is served
 * same-origin in both modes (Vite middleware in dev, dist/ static in prod),
 * and src/services/api.ts uses relative "/api" URLs — so same-origin clients
 * work identically with no CORS headers, while cross-origin access is denied
 * by default instead of allowed via Access-Control-Allow-Origin: *.
 */
export async function createApp(): Promise<Express> {
  const app = express();
  app.use(express.json());

  registerPublicRoutes(app);
  registerAuthRoutes(app);
  registerCartRoutes(app);
  registerOrderRoutes(app);
  registerSellerRoutes(app);
  registerAdminRoutes(app);

  if (config.nodeEnv !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.get("/manifest.webmanifest", (_req, res) => {
      res.type("application/manifest+json");
      res.sendFile(path.join(distPath, "manifest.webmanifest"));
    });
    app.get("/sw.js", (_req, res) => {
      res.type("application/javascript");
      res.sendFile(path.join(distPath, "sw.js"));
    });
    app.get(/^\/workbox-.+\.js$/, (req, res) => {
      res.type("application/javascript");
      res.sendFile(path.join(distPath, req.path));
    });
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Central JSON error handler — must be registered last.
  app.use(errorMiddleware);

  return app;
}
