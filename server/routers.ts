import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as crypto from "crypto";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

const protectedAgentProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.user.id) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const protectedAdminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.user.id) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const authRouter = router({
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByUsername(input.username);
      if (!user || !verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }
      if (!user.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User account is inactive" });
      }
      const sessionToken = await sdk.createSessionToken(user.username, user.name || "");
      const cookieOptions = getSessionCookieOptions(ctx.req);
      (ctx.res as any).cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return {
        success: true,
        user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role },
      };
    }),

  me: publicProcedure.query(({ ctx }) => {
    if (!ctx.user) return null;
    return { id: ctx.user.id, username: ctx.user.username, name: ctx.user.name, email: ctx.user.email, role: ctx.user.role };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    (ctx.res as any).clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),
});

const agentManagementRouter = router({
  list: protectedAdminProcedure.query(async () => {
    const agents = await db.getAllAgents();
    return agents.map((a) => ({ id: a.id, username: a.username, name: a.name, email: a.email, isActive: a.isActive, createdAt: a.createdAt }));
  }),
  create: protectedAdminProcedure
    .input(z.object({ username: z.string().min(3), password: z.string().min(6), name: z.string(), email: z.string().email().optional() }))
    .mutation(async ({ input }) => {
      const existing = await db.getUserByUsername(input.username);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Username already exists" });
      await db.createAgent(input.username, hashPassword(input.password), input.name, input.email);
      return { success: true };
    }),
  update: protectedAdminProcedure
    .input(z.object({ agentId: z.number(), name: z.string().optional(), email: z.string().email().optional() }))
    .mutation(async ({ input }) => {
      await db.updateAgent(input.agentId, { name: input.name, email: input.email });
      return { success: true };
    }),
  deactivate: protectedAdminProcedure
    .input(z.object({ agentId: z.number() }))
    .mutation(async ({ input }) => {
      await db.deactivateAgent(input.agentId);
      return { success: true };
    }),
});

const phoneNumberRouter = router({
  list: protectedAdminProcedure.query(async () => {
    const pns = await db.getAllPhoneNumbers();
    return pns.map((pn) => ({ id: pn.id, phoneNumber: pn.phoneNumber, agentId: pn.agentId, campaign: pn.campaign, isActive: pn.isActive, createdAt: pn.createdAt }));
  }),
  listByAgent: protectedAgentProcedure.query(async ({ ctx }) => {
    const pns = await db.getPhoneNumbersByAgent(ctx.user.id);
    return pns.map((pn) => ({ id: pn.id, phoneNumber: pn.phoneNumber, campaign: pn.campaign, isActive: pn.isActive }));
  }),
  assign: protectedAdminProcedure
    .input(z.object({ phoneNumber: z.string(), agentId: z.number(), campaign: z.string().optional() }))
    .mutation(async ({ input }) => {
      await db.assignPhoneNumber(input.phoneNumber, input.agentId, input.campaign);
      return { success: true };
    }),
  update: protectedAdminProcedure
    .input(z.object({ phoneNumberId: z.number(), campaign: z.string().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      await db.updatePhoneNumber(input.phoneNumberId, { campaign: input.campaign, isActive: input.isActive });
      return { success: true };
    }),
});

const callLogRouter = router({
  create: protectedAgentProcedure
    .input(z.object({
      callType: z.enum(["incoming", "outgoing"]),
      callerName: z.string().optional(),
      callerPhone: z.string(),
      duration: z.number(),
      outcome: z.enum(["completed", "voicemail", "callback_scheduled", "no_answer", "busy", "other"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createCallLog(ctx.user.id, input.callType, input.callerPhone, input.duration, input.outcome, input.callerName, input.notes);
      return { success: true };
    }),
  listMine: protectedAgentProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const logs = await db.getCallLogsByAgent(ctx.user.id, input.limit, input.offset);
      return logs.map((l) => ({ id: l.id, callType: l.callType, callerName: l.callerName, callerPhone: l.callerPhone, duration: l.duration, outcome: l.outcome, notes: l.notes, recordedAt: l.recordedAt }));
    }),
  listAll: protectedAdminProcedure
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const logs = await db.getAllCallLogs(input.limit, input.offset);
      return logs.map((l) => ({ id: l.id, agentId: l.agentId, callType: l.callType, callerName: l.callerName, callerPhone: l.callerPhone, duration: l.duration, outcome: l.outcome, notes: l.notes, recordedAt: l.recordedAt }));
    }),
});

const callbackQueueRouter = router({
  create: protectedAgentProcedure
    .input(z.object({
      callerName: z.string(),
      callerPhone: z.string(),
      scheduledTime: z.date(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createCallbackQueueEntry(ctx.user.id, input.callerName, input.callerPhone, input.scheduledTime, input.priority, input.notes);
      return { success: true };
    }),
  listMine: protectedAgentProcedure
    .input(z.object({ includeCompleted: z.boolean().default(false) }))
    .query(async ({ input, ctx }) => {
      const entries = await db.getCallbackQueueByAgent(ctx.user.id, input.includeCompleted);
      return entries.map((e) => ({ id: e.id, callerName: e.callerName, callerPhone: e.callerPhone, scheduledTime: e.scheduledTime, priority: e.priority, notes: e.notes, isCompleted: e.isCompleted, completedAt: e.completedAt, createdAt: e.createdAt }));
    }),
  listAll: protectedAdminProcedure
    .input(z.object({ includeCompleted: z.boolean().default(false) }))
    .query(async ({ input }) => {
      const entries = await db.getAllCallbackQueue(input.includeCompleted);
      return entries.map((e) => ({ id: e.id, agentId: e.agentId, callerName: e.callerName, callerPhone: e.callerPhone, scheduledTime: e.scheduledTime, priority: e.priority, notes: e.notes, isCompleted: e.isCompleted, completedAt: e.completedAt, createdAt: e.createdAt }));
    }),
  markCompleted: protectedAgentProcedure
    .input(z.object({ callbackId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const entries = await db.getCallbackQueueByAgent(ctx.user.id, true);
      if (!entries.find((e) => e.id === input.callbackId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Callback not found" });
      }
      await db.markCallbackAsCompleted(input.callbackId);
      return { success: true };
    }),
  update: protectedAgentProcedure
    .input(z.object({
      callbackId: z.number(),
      scheduledTime: z.date().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const entries = await db.getCallbackQueueByAgent(ctx.user.id, true);
      if (!entries.find((e) => e.id === input.callbackId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Callback not found" });
      }
      await db.updateCallbackQueueEntry(input.callbackId, { scheduledTime: input.scheduledTime, priority: input.priority, notes: input.notes });
      return { success: true };
    }),
});

const statisticsRouter = router({
  getMyStats: protectedAgentProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input, ctx }) => db.getAgentDailyStats(ctx.user.id, input.startDate, input.endDate)),
  getAllStats: protectedAdminProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => db.getAllAgentStats(input.startDate, input.endDate)),
  getTotalCalls: protectedAgentProcedure
    .query(async ({ ctx }) => ({ totalCalls: await db.getTotalCallsCount(ctx.user.id) })),
  getTotalCallsAdmin: protectedAdminProcedure
    .query(async () => ({ totalCalls: await db.getTotalCallsCount() })),
});

export const appRouter = router({
  auth: authRouter,
  agentManagement: agentManagementRouter,
  phoneNumber: phoneNumberRouter,
  callLog: callLogRouter,
  callbackQueue: callbackQueueRouter,
  statistics: statisticsRouter,
});

export type AppRouter = typeof appRouter;
