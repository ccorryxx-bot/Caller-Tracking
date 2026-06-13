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
const db = createClient(ENV.supabaseUrl, ENV.supabaseServiceRole);

// ── Auth helpers ──────────────────────────────────────────────────────────────
const COOKIE_NAME = "app_session_id";
const ONE_YEAR_S = 60 * 60 * 24 * 365;
const secretKey = () => new TextEncoder().encode(ENV.jwtSecret);
const hashPw = (pw: string) => createHash("sha256").update(pw).digest("hex");

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
function setCookie(res: any, value: string, maxAge: number) {
  const isSecure = true;
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Max-Age=${maxAge}; SameSite=None${isSecure ? "; Secure" : ""}`);
}
async function getSessionUser(req: any) {
  const raw = req.headers?.cookie;
  if (!raw) return null;
  const cookies = parseCookies(raw);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return getUserByUsername(payload.username);
}

// ── DB ────────────────────────────────────────────────────────────────────────
function mapUser(r: any) {
  return { id: r.id, username: r.username, passwordHash: r.password_hash, name: r.name ?? null, email: r.email ?? null, role: r.role as "agent" | "admin", isActive: r.is_active, createdAt: new Date(r.created_at) };
}
function mapPhone(r: any) {
  return { id: r.id, phoneNumber: r.phone_number, agentId: r.agent_id, campaign: r.campaign ?? null, isActive: r.is_active, createdAt: new Date(r.created_at) };
}
function mapLog(r: any) {
  return { id: r.id, agentId: r.agent_id, callType: r.call_type as any, callerName: r.caller_name ?? null, callerPhone: r.caller_phone, duration: r.duration, outcome: r.outcome as any, notes: r.notes ?? null, recordedAt: new Date(r.recorded_at) };
}
function mapCallback(r: any) {
  return { id: r.id, agentId: r.agent_id, callerName: r.caller_name, callerPhone: r.caller_phone, scheduledTime: new Date(r.scheduled_time), priority: r.priority as any, notes: r.notes ?? null, isCompleted: r.is_completed, completedAt: r.completed_at ? new Date(r.completed_at) : null, createdAt: new Date(r.created_at) };
}
async function getUserByUsername(username: string) {
  const { data } = await db.from("ct_users").select("*").eq("username", username).single();
  return data ? mapUser(data) : null;
}
async function getAllAgents() {
  const { data } = await db.from("ct_users").select("*").eq("role", "agent").order("created_at", { ascending: false });
  return (data ?? []).map(mapUser);
}
async function createAgent(username: string, passwordHash: string, name: string, email?: string) {
  await db.from("ct_users").insert({ username, password_hash: passwordHash, name, email, role: "agent", is_active: true });
}
async function updateAgent(id: number, patch: { name?: string; email?: string }) {
  await db.from("ct_users").update({ name: patch.name, email: patch.email, updated_at: new Date().toISOString() }).eq("id", id);
}
async function deactivateAgent(id: number) {
  await db.from("ct_users").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
}
async function getAllPhoneNumbers() {
  const { data } = await db.from("ct_phone_numbers").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(mapPhone);
}
async function getPhoneNumbersByAgent(agentId: number) {
  const { data } = await db.from("ct_phone_numbers").select("*").eq("agent_id", agentId).eq("is_active", true);
  return (data ?? []).map(mapPhone);
}
async function assignPhoneNumber(phoneNumber: string, agentId: number, campaign?: string) {
  await db.from("ct_phone_numbers").upsert({ phone_number: phoneNumber, agent_id: agentId, campaign, is_active: true }, { onConflict: "phone_number" });
}
async function updatePhoneNumber(id: number, patch: { campaign?: string; isActive?: boolean }) {
  await db.from("ct_phone_numbers").update({ campaign: patch.campaign, is_active: patch.isActive, updated_at: new Date().toISOString() }).eq("id", id);
}
async function createCallLog(agentId: number, callType: string, callerPhone: string, duration: number, outcome: string, callerName?: string, notes?: string) {
  await db.from("ct_call_logs").insert({ agent_id: agentId, call_type: callType, caller_phone: callerPhone, duration, outcome, caller_name: callerName, notes });
}
async function getCallLogsByAgent(agentId: number, limit = 50, offset = 0) {
  const { data } = await db.from("ct_call_logs").select("*").eq("agent_id", agentId).order("recorded_at", { ascending: false }).range(offset, offset + limit - 1);
  return (data ?? []).map(mapLog);
}
async function getAllCallLogs(limit = 100, offset = 0) {
  const { data } = await db.from("ct_call_logs").select("*").order("recorded_at", { ascending: false }).range(offset, offset + limit - 1);
  return (data ?? []).map(mapLog);
}
async function createCallbackEntry(agentId: number, callerName: string, callerPhone: string, scheduledTime: Date, priority: string, notes?: string) {
  await db.from("ct_callback_queue").insert({ agent_id: agentId, caller_name: callerName, caller_phone: callerPhone, scheduled_time: scheduledTime.toISOString(), priority, notes, is_completed: false });
}
async function getCallbacksByAgent(agentId: number, includeCompleted: boolean) {
  let q = db.from("ct_callback_queue").select("*").eq("agent_id", agentId).order("scheduled_time");
  if (!includeCompleted) q = q.eq("is_completed", false);
  const { data } = await q;
  return (data ?? []).map(mapCallback);
}
async function getAllCallbacks(includeCompleted: boolean) {
  let q = db.from("ct_callback_queue").select("*").order("scheduled_time");
  if (!includeCompleted) q = q.eq("is_completed", false);
  const { data } = await q;
  return (data ?? []).map(mapCallback);
}
async function markCallbackCompleted(id: number) {
  await db.from("ct_callback_queue").update({ is_completed: true, completed_at: new Date().toISOString() }).eq("id", id);
}
async function updateCallback(id: number, patch: { scheduledTime?: Date; priority?: string; notes?: string }) {
  await db.from("ct_callback_queue").update({ scheduled_time: patch.scheduledTime?.toISOString(), priority: patch.priority, notes: patch.notes }).eq("id", id);
}
async function getAgentDailyStats(agentId: number, startDate: string, endDate: string) {
  const { data } = await db.from("ct_daily_statistics").select("*").eq("agent_id", agentId).gte("date", startDate).lte("date", endDate).order("date");
  return data ?? [];
}
async function getAllAgentStats(startDate: string, endDate: string) {
  const { data } = await db.from("ct_daily_statistics").select("*").gte("date", startDate).lte("date", endDate).order("date");
  return data ?? [];
}
async function getTotalCallsCount(agentId?: number) {
  let q = db.from("ct_call_logs").select("id", { count: "exact", head: true });
  if (agentId !== undefined) q = q.eq("agent_id", agentId);
  const { count } = await q;
  return count ?? 0;
}

// ── tRPC ──────────────────────────────────────────────────────────────────────
type Ctx = { req: any; res: any; user: Awaited<ReturnType<typeof getUserByUsername>> };
const t = initTRPC.context<Ctx>().create({ transformer: superjson });

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  return next({ ctx: { ...ctx, user: ctx.user! } });
});
const requireAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "You do not have required permission (10002)" });
  return next({ ctx: { ...ctx, user: ctx.user! } });
});
const agentProcedure = t.procedure.use(requireUser);
const adminProcedure = t.procedure.use(requireAdmin);

const appRouter = t.router({
  auth: t.router({
    me: t.procedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      return { id: ctx.user.id, username: ctx.user.username, name: ctx.user.name, email: ctx.user.email, role: ctx.user.role };
    }),
    login: t.procedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByUsername(input.username);
        if (!user || user.passwordHash !== hashPw(input.password))
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
        if (!user.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Account inactive" });
        const token = await signToken(user.username, user.name || "");
        setCookie(ctx.res, token, ONE_YEAR_S);
        return { success: true, user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role } };
      }),
    logout: t.procedure.mutation(({ ctx }) => {
      setCookie(ctx.res, "", -1);
      return { success: true };
    }),
  }),
  agentManagement: t.router({
    list: adminProcedure.query(async () => {
      const agents = await getAllAgents();
      return agents.map(a => ({ id: a.id, username: a.username, name: a.name, email: a.email, isActive: a.isActive, createdAt: a.createdAt }));
    }),
    create: adminProcedure
      .input(z.object({ username: z.string().min(3), password: z.string().min(6), name: z.string(), email: z.string().email().optional() }))
      .mutation(async ({ input }) => {
        const existing = await getUserByUsername(input.username);
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Username already exists" });
        await createAgent(input.username, hashPw(input.password), input.name, input.email);
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({ agentId: z.number(), name: z.string().optional(), email: z.string().email().optional() }))
      .mutation(async ({ input }) => { await updateAgent(input.agentId, { name: input.name, email: input.email }); return { success: true }; }),
    deactivate: adminProcedure
      .input(z.object({ agentId: z.number() }))
      .mutation(async ({ input }) => { await deactivateAgent(input.agentId); return { success: true }; }),
  }),
  phoneNumber: t.router({
    list: adminProcedure.query(async () => {
      const pns = await getAllPhoneNumbers();
      return pns.map(pn => ({ id: pn.id, phoneNumber: pn.phoneNumber, agentId: pn.agentId, campaign: pn.campaign, isActive: pn.isActive, createdAt: pn.createdAt }));
    }),
    listByAgent: agentProcedure.query(async ({ ctx }) => {
      const pns = await getPhoneNumbersByAgent(ctx.user.id);
      return pns.map(pn => ({ id: pn.id, phoneNumber: pn.phoneNumber, campaign: pn.campaign, isActive: pn.isActive }));
    }),
    assign: adminProcedure
      .input(z.object({ phoneNumber: z.string(), agentId: z.number(), campaign: z.string().optional() }))
      .mutation(async ({ input }) => { await assignPhoneNumber(input.phoneNumber, input.agentId, input.campaign); return { success: true }; }),
    update: adminProcedure
      .input(z.object({ phoneNumberId: z.number(), campaign: z.string().optional(), isActive: z.boolean().optional() }))
      .mutation(async ({ input }) => { await updatePhoneNumber(input.phoneNumberId, { campaign: input.campaign, isActive: input.isActive }); return { success: true }; }),
  }),
  callLog: t.router({
    create: agentProcedure
      .input(z.object({ callType: z.enum(["incoming", "outgoing"]), callerName: z.string().optional(), callerPhone: z.string(), duration: z.number(), outcome: z.enum(["completed", "voicemail", "callback_scheduled", "no_answer", "busy", "other"]), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => { await createCallLog(ctx.user.id, input.callType, input.callerPhone, input.duration, input.outcome, input.callerName, input.notes); return { success: true }; }),
    listMine: agentProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
      .query(async ({ input, ctx }) => {
        const logs = await getCallLogsByAgent(ctx.user.id, input.limit, input.offset);
        return logs.map(l => ({ id: l.id, callType: l.callType, callerName: l.callerName, callerPhone: l.callerPhone, duration: l.duration, outcome: l.outcome, notes: l.notes, recordedAt: l.recordedAt }));
      }),
    listAll: adminProcedure
      .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        const logs = await getAllCallLogs(input.limit, input.offset);
        return logs.map(l => ({ id: l.id, agentId: l.agentId, callType: l.callType, callerName: l.callerName, callerPhone: l.callerPhone, duration: l.duration, outcome: l.outcome, notes: l.notes, recordedAt: l.recordedAt }));
      }),
  }),
  callbackQueue: t.router({
    create: agentProcedure
      .input(z.object({ callerName: z.string(), callerPhone: z.string(), scheduledTime: z.string(), priority: z.enum(["low", "medium", "high"]).default("medium"), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => { await createCallbackEntry(ctx.user.id, input.callerName, input.callerPhone, new Date(input.scheduledTime), input.priority, input.notes); return { success: true }; }),
    listMine: agentProcedure
      .input(z.object({ includeCompleted: z.boolean().default(false) }))
      .query(async ({ input, ctx }) => {
        const entries = await getCallbacksByAgent(ctx.user.id, input.includeCompleted);
        return entries.map(e => ({ id: e.id, callerName: e.callerName, callerPhone: e.callerPhone, scheduledTime: e.scheduledTime, priority: e.priority, notes: e.notes, isCompleted: e.isCompleted, completedAt: e.completedAt, createdAt: e.createdAt }));
      }),
    listAll: adminProcedure
      .input(z.object({ includeCompleted: z.boolean().default(false) }))
      .query(async ({ input }) => {
        const entries = await getAllCallbacks(input.includeCompleted);
        return entries.map(e => ({ id: e.id, agentId: e.agentId, callerName: e.callerName, callerPhone: e.callerPhone, scheduledTime: e.scheduledTime, priority: e.priority, notes: e.notes, isCompleted: e.isCompleted, completedAt: e.completedAt, createdAt: e.createdAt }));
      }),
    markCompleted: agentProcedure
      .input(z.object({ callbackId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const entries = await getCallbacksByAgent(ctx.user.id, true);
        if (!entries.find(e => e.id === input.callbackId)) throw new TRPCError({ code: "FORBIDDEN", message: "Callback not found" });
        await markCallbackCompleted(input.callbackId);
        return { success: true };
      }),
    update: agentProcedure
      .input(z.object({ callbackId: z.number(), scheduledTime: z.string().optional(), priority: z.enum(["low", "medium", "high"]).optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const entries = await getCallbacksByAgent(ctx.user.id, true);
        if (!entries.find(e => e.id === input.callbackId)) throw new TRPCError({ code: "FORBIDDEN", message: "Callback not found" });
        await updateCallback(input.callbackId, { scheduledTime: input.scheduledTime ? new Date(input.scheduledTime) : undefined, priority: input.priority, notes: input.notes });
        return { success: true };
      }),
  }),
  statistics: t.router({
    getMyStats: agentProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input, ctx }) => getAgentDailyStats(ctx.user.id, input.startDate, input.endDate)),
    getAllStats: adminProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input }) => getAllAgentStats(input.startDate, input.endDate)),
    getTotalCalls: agentProcedure.query(async ({ ctx }) => ({ totalCalls: await getTotalCallsCount(ctx.user.id) })),
    getTotalCallsAdmin: adminProcedure.query(async () => ({ totalCalls: await getTotalCallsCount() })),
  }),
});

export type AppRouter = typeof appRouter;

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api/trpc", createExpressMiddleware({
  router: appRouter,
  createContext: async ({ req, res }) => {
    const user = await getSessionUser(req);
    return { req, res, user };
  },
}));

export default (req: VercelRequest, res: VercelResponse) => { app(req as any, res as any); };
