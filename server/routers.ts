import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as crypto from "crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Create protected procedure for agents
const protectedAgentProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.user.id) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Create protected procedure for admins
const protectedAdminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.user.id) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// ============================================================================
// AUTHENTICATION ROUTER
// ============================================================================

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

      // Update last signed in
      await db.updateAgent(user.id, {});

      // In a real app, you'd create a session token here
      // For now, we'll rely on the existing session management
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  me: publicProcedure.query(({ ctx }) => {
    if (!ctx.user) {
      return null;
    }
    return {
      id: ctx.user.id,
      username: ctx.user.username,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
    };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),
});

// ============================================================================
// AGENT MANAGEMENT ROUTER (ADMIN ONLY)
// ============================================================================

const agentManagementRouter = router({
  list: protectedAdminProcedure.query(async () => {
    const agents = await db.getAllAgents();
    return agents.map((agent) => ({
      id: agent.id,
      username: agent.username,
      name: agent.name,
      email: agent.email,
      isActive: agent.isActive,
      createdAt: agent.createdAt,
    }));
  }),

  create: protectedAdminProcedure
    .input(
      z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await db.getUserByUsername(input.username);
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Username already exists" });
      }

      const passwordHash = hashPassword(input.password);
      await db.createAgent(input.username, passwordHash, input.name, input.email);

      return { success: true };
    }),

  update: protectedAdminProcedure
    .input(
      z.object({
        agentId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateAgent(input.agentId, {
        name: input.name,
        email: input.email,
      });

      return { success: true };
    }),

  deactivate: protectedAdminProcedure
    .input(z.object({ agentId: z.number() }))
    .mutation(async ({ input }) => {
      await db.deactivateAgent(input.agentId);
      return { success: true };
    }),
});

// ============================================================================
// PHONE NUMBER MANAGEMENT ROUTER (ADMIN ONLY)
// ============================================================================

const phoneNumberRouter = router({
  list: protectedAdminProcedure.query(async () => {
    const phoneNumbers = await db.getAllPhoneNumbers();
    return phoneNumbers.map((pn) => ({
      id: pn.id,
      phoneNumber: pn.phoneNumber,
      agentId: pn.agentId,
      campaign: pn.campaign,
      isActive: pn.isActive,
      createdAt: pn.createdAt,
    }));
  }),

  listByAgent: protectedAgentProcedure.query(async ({ ctx }) => {
    const phoneNumbers = await db.getPhoneNumbersByAgent(ctx.user.id);
    return phoneNumbers.map((pn) => ({
      id: pn.id,
      phoneNumber: pn.phoneNumber,
      campaign: pn.campaign,
      isActive: pn.isActive,
    }));
  }),

  assign: protectedAdminProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
        agentId: z.number(),
        campaign: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.assignPhoneNumber(input.phoneNumber, input.agentId, input.campaign);
      return { success: true };
    }),

  update: protectedAdminProcedure
    .input(
      z.object({
        phoneNumberId: z.number(),
        campaign: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.updatePhoneNumber(input.phoneNumberId, {
        campaign: input.campaign,
        isActive: input.isActive,
      });

      return { success: true };
    }),
});

// ============================================================================
// CALL LOG ROUTER
// ============================================================================

const callLogRouter = router({
  create: protectedAgentProcedure
    .input(
      z.object({
        callType: z.enum(["incoming", "outgoing"]),
        callerName: z.string().optional(),
        callerPhone: z.string(),
        duration: z.number(),
        outcome: z.enum(["completed", "voicemail", "callback_scheduled", "no_answer", "busy", "other"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.createCallLog(
        ctx.user.id,
        input.callType,
        input.callerPhone,
        input.duration,
        input.outcome,
        input.callerName,
        input.notes
      );

      return { success: true };
    }),

  listMine: protectedAgentProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const callLogs = await db.getCallLogsByAgent(ctx.user.id, input.limit, input.offset);
      return callLogs.map((log) => ({
        id: log.id,
        callType: log.callType,
        callerName: log.callerName,
        callerPhone: log.callerPhone,
        duration: log.duration,
        outcome: log.outcome,
        notes: log.notes,
        recordedAt: log.recordedAt,
      }));
    }),

  listAll: protectedAdminProcedure
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const callLogs = await db.getAllCallLogs(input.limit, input.offset);
      return callLogs.map((log) => ({
        id: log.id,
        agentId: log.agentId,
        callType: log.callType,
        callerName: log.callerName,
        callerPhone: log.callerPhone,
        duration: log.duration,
        outcome: log.outcome,
        notes: log.notes,
        recordedAt: log.recordedAt,
      }));
    }),
});

// ============================================================================
// CALLBACK QUEUE ROUTER
// ============================================================================

const callbackQueueRouter = router({
  create: protectedAgentProcedure
    .input(
      z.object({
        callerName: z.string(),
        callerPhone: z.string(),
        scheduledTime: z.date(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.createCallbackQueueEntry(
        ctx.user.id,
        input.callerName,
        input.callerPhone,
        input.scheduledTime,
        input.priority,
        input.notes
      );

      return { success: true };
    }),

  listMine: protectedAgentProcedure
    .input(z.object({ includeCompleted: z.boolean().default(false) }))
    .query(async ({ input, ctx }) => {
      const entries = await db.getCallbackQueueByAgent(ctx.user.id, input.includeCompleted);
      return entries.map((entry) => ({
        id: entry.id,
        callerName: entry.callerName,
        callerPhone: entry.callerPhone,
        scheduledTime: entry.scheduledTime,
        priority: entry.priority,
        notes: entry.notes,
        isCompleted: entry.isCompleted,
        completedAt: entry.completedAt,
        createdAt: entry.createdAt,
      }));
    }),

  listAll: protectedAdminProcedure
    .input(z.object({ includeCompleted: z.boolean().default(false) }))
    .query(async ({ input }) => {
      const entries = await db.getAllCallbackQueue(input.includeCompleted);
      return entries.map((entry) => ({
        id: entry.id,
        agentId: entry.agentId,
        callerName: entry.callerName,
        callerPhone: entry.callerPhone,
        scheduledTime: entry.scheduledTime,
        priority: entry.priority,
        notes: entry.notes,
        isCompleted: entry.isCompleted,
        completedAt: entry.completedAt,
        createdAt: entry.createdAt,
      }));
    }),

  markCompleted: protectedAgentProcedure
    .input(z.object({ callbackId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verify the callback belongs to the agent
      const entries = await db.getCallbackQueueByAgent(ctx.user.id, true);
      const entry = entries.find((e) => e.id === input.callbackId);

      if (!entry) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Callback not found" });
      }

      await db.markCallbackAsCompleted(input.callbackId);
      return { success: true };
    }),

  update: protectedAgentProcedure
    .input(
      z.object({
        callbackId: z.number(),
        scheduledTime: z.date().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify the callback belongs to the agent
      const entries = await db.getCallbackQueueByAgent(ctx.user.id, true);
      const entry = entries.find((e) => e.id === input.callbackId);

      if (!entry) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Callback not found" });
      }

      await db.updateCallbackQueueEntry(input.callbackId, {
        scheduledTime: input.scheduledTime,
        priority: input.priority,
        notes: input.notes,
      });

      return { success: true };
    }),
});

// ============================================================================
// STATISTICS ROUTER
// ============================================================================

const statisticsRouter = router({
  getMyStats: protectedAgentProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input, ctx }) => {
      const stats = await db.getAgentDailyStats(ctx.user.id, input.startDate, input.endDate);
      return stats;
    }),

  getAllStats: protectedAdminProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const stats = await db.getAllAgentStats(input.startDate, input.endDate);
      return stats;
    }),

  getTotalCalls: protectedAgentProcedure.query(async ({ ctx }) => {
    const count = await db.getTotalCallsCount(ctx.user.id);
    return { totalCalls: count };
  }),

  getTotalCallsAdmin: protectedAdminProcedure.query(async () => {
    const count = await db.getTotalCallsCount();
    return { totalCalls: count };
  }),
});

// ============================================================================
// MAIN APP ROUTER
// ============================================================================

export const appRouter = router({
  auth: authRouter,
  agentManagement: agentManagementRouter,
  phoneNumber: phoneNumberRouter,
  callLog: callLogRouter,
  callbackQueue: callbackQueueRouter,
  statistics: statisticsRouter,
});

export type AppRouter = typeof appRouter;
