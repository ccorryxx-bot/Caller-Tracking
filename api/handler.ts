import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { initTRPC, TRPCError } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import superjson from "superjson";
import { SignJWT, jwtVerify } from "jose";
import { createClient } from "@supabase/supabase-js";
import { parse as parseCookies } from "cookie";
import { createHash } from "crypto";
import { z } from "zod";

// ── Env ───────────────────────────────────────────────────────────────────────
const ENV = {
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE ?? "",
};

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(ENV.supabaseUrl, ENV.supabaseServiceRole);

// ── JWT helpers ───────────────────────────────────────────────────────────────
const secretKey = () => new TextEncoder().encode(ENV.jwtSecret);
const COOKIE_NAME = "app_session_id";
const ONE_YEAR_S = 60 * 60 * 24 * 365;

async function signToken(username: string, name: string) {
  return new SignJWT({ username, name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${ONE_YEAR_S}s`)
    .sign(secretKey());
}
async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as { username: string; name: string };
  } catch { return null; }
}
function hashPw(pw: string) { return createHash("sha256").update(pw).digest("hex"); }

// ── tRPC ──────────────────────────────────────────────────────────────────────
type Ctx = { req: any; res: any; user: any };
const t = initTRPC.context<Ctx>().create({ transformer: superjson });

// ── DB helpers ────────────────────────────────────────────────────────────────
async function getUserByUsername(username: string) {
  const { data } = await supabase.from("ct_users").select("*").eq("username", username).single();
  if (!data) return null;
  return {
    id: data.id, username: data.username, passwordHash: data.password_hash,
    name: data.name, role: data.role, isActive: data.is_active,
  };
}

// ── Router ────────────────────────────────────────────────────────────────────
const appRouter = t.router({
  "auth.me": t.procedure.query(async ({ ctx }) => {
    const raw = ctx.req.headers.cookie;
    if (!raw) return null;
    const cookies = parseCookies(raw);
    const token = cookies[COOKIE_NAME];
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload) return null;
    const user = await getUserByUsername(payload.username);
    return user ? { username: user.username, name: user.name, role: user.role } : null;
  }),
  "auth.login": t.procedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserByUsername(input.username);
      if (!user || user.passwordHash !== hashPw(input.password)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }
      if (!user.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Account inactive" });
      const token = await signToken(user.username, user.name || "");
      ctx.res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Max-Age=${ONE_YEAR_S}; SameSite=None; Secure`);
      return { success: true, user: { username: user.username, name: user.name, role: user.role } };
    }),
  "auth.logout": t.procedure.mutation(({ ctx }) => {
    ctx.res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=None; Secure`);
    return { success: true };
  }),
  "healthz": t.procedure.query(() => ({ ok: true, ts: Date.now() })),
});

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api/trpc", createExpressMiddleware({
  router: appRouter,
  createContext: ({ req, res }) => ({ req, res, user: null }),
}));

export default (req: VercelRequest, res: VercelResponse) => { app(req as any, res as any); };
