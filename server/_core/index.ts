import "dotenv/config";
import express from "express";
import { createServer as createHttpServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => { server.close(() => resolve(true)); });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error("No available port found starting from " + startPort);
}

function buildApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app as any);
  registerOAuthRoutes(app as any);
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );
  return app;
}

// Exported for Vercel serverless handler
export async function createServer() {
  const app = buildApp();
  serveStatic(app as any);
  return app;
}

async function startServer() {
  const app = buildApp();
  const server = createHttpServer(app);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app as any, server);
  } else {
    serveStatic(app as any);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log("Port " + preferredPort + " busy, using " + port);

  server.listen(port, () => {
    console.log("Server running on http://localhost:" + port + "/");
  });
}

startServer().catch(console.error);
