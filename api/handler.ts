import type { VercelRequest, VercelResponse } from "@vercel/node";

let app: any = null;
let initError: any = null;

async function initApp() {
  try {
    const express = (await import("express")).default;
    const { createExpressMiddleware } = await import("@trpc/server/adapters/express");
    const { registerOAuthRoutes } = await import("../server/_core/oauth");
    const { registerStorageProxy } = await import("../server/_core/storageProxy");
    const { appRouter } = await import("../server/routers");
    const { createContext } = await import("../server/_core/context");

    const a = express();
    a.use(express.json({ limit: "50mb" }));
    a.use(express.urlencoded({ limit: "50mb", extended: true }));
    registerStorageProxy(a);
    registerOAuthRoutes(a);
    a.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
    return a;
  } catch (err) {
    initError = err;
    throw err;
  }
}

const appPromise = initApp();

export default async (req: VercelRequest, res: VercelResponse) => {
  if (initError) {
    return res.status(500).json({
      error: "Init failed",
      message: String(initError),
      stack: initError?.stack?.slice(0, 2000),
    });
  }
  try {
    const a = await appPromise;
    a(req, res);
  } catch (err: any) {
    res.status(500).json({ error: "Handler failed", message: String(err), stack: err?.stack?.slice(0, 2000) });
  }
};
