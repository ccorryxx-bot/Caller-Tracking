import type { VercelRequest, VercelResponse } from "@vercel/node";

let app: any = null;
let initErr: any = null;

function init() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const express = require("express");
    const { createExpressMiddleware } = require("@trpc/server/adapters/express");
    const { registerOAuthRoutes } = require("../server/_core/oauth");
    const { registerStorageProxy } = require("../server/_core/storageProxy");
    const { appRouter } = require("../server/routers");
    const { createContext } = require("../server/_core/context");

    const a = express();
    a.use(express.json({ limit: "50mb" }));
    a.use(express.urlencoded({ limit: "50mb", extended: true }));
    registerStorageProxy(a);
    registerOAuthRoutes(a);
    a.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
    app = a;
  } catch (e: any) {
    initErr = e;
  }
}

init();

export default (req: VercelRequest, res: VercelResponse) => {
  if (initErr || !app) {
    return res.status(500).json({
      error: "init failed",
      message: String(initErr),
      stack: initErr?.stack?.slice(0, 3000),
    });
  }
  app(req, res);
};
