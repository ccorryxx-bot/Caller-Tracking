import type { VercelRequest, VercelResponse } from "@vercel/node";

const results: Record<string, string> = {};

try {
  const superjson = await import("superjson");
  results.superjson = "ok v" + (superjson as any).default?.version;
} catch (e: any) { results.superjson = String(e); }

try {
  const { createClient } = await import("@supabase/supabase-js");
  results.supabase = "ok typeof=" + typeof createClient;
} catch (e: any) { results.supabase = String(e); }

try {
  const { SignJWT } = await import("jose");
  results.jose = "ok typeof=" + typeof SignJWT;
} catch (e: any) { results.jose = String(e); }

try {
  const env = await import("../server/_core/env");
  results.env = "ok supabaseUrl=" + (env.ENV.supabaseUrl ? "SET" : "EMPTY");
} catch (e: any) { results.env = String(e); }

try {
  const c = await import("../shared/const");
  results.sharedConst = "ok COOKIE=" + c.COOKIE_NAME;
} catch (e: any) { results.sharedConst = String(e); }

try {
  const trpc = await import("../server/_core/trpc");
  results.trpc = "ok router=" + typeof trpc.router;
} catch (e: any) { results.trpc = String(e); }

export default async (_req: VercelRequest, res: VercelResponse) => {
  res.json({ results, node: process.version });
};
