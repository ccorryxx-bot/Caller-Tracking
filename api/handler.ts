import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

// Catch top-level initialization errors
let appInstance: ReturnType<typeof express> | null = null;
let initErr: string | null = null;

try {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  appInstance = app;
} catch (e: any) {
  initErr = String(e) + "\n" + (e?.stack || "");
}

export default (req: VercelRequest, res: VercelResponse) => {
  if (initErr || !appInstance) {
    return res.status(500).json({ initError: initErr, ok: false });
  }
  (appInstance as any)(req, res);
};
