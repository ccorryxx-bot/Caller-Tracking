import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

let app: any = null;
let initErr: any = null;

try {
  const a = express();
  a.use(express.json({ limit: "50mb" }));
  a.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );
  app = a;
} catch (e: any) {
  initErr = e;
}

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
