export default async (req: any, res: any) => {
  const steps: string[] = [];
  try {
    steps.push("1: start");
    const express = (await import("express")).default;
    steps.push("2: express ok");
    const { createExpressMiddleware } = await import("@trpc/server/adapters/express");
    steps.push("3: trpc-express ok");
    const { registerOAuthRoutes } = await import("../server/_core/oauth");
    steps.push("4: oauth ok");
    const { registerStorageProxy } = await import("../server/_core/storageProxy");
    steps.push("5: storageProxy ok");
    const { sdk } = await import("../server/_core/sdk");
    steps.push("6: sdk ok");
    const { createContext } = await import("../server/_core/context");
    steps.push("7: context ok");
    const { appRouter } = await import("../server/routers");
    steps.push("8: routers ok");
    res.json({ ok: true, steps });
  } catch (err: any) {
    res.status(500).json({ ok: false, steps, error: String(err), stack: err?.stack?.slice(0, 3000) });
  }
};
