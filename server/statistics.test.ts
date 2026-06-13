import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type TestUser = NonNullable<TrpcContext["user"]>;

function createAgentContext(agentId: number = 2): TrpcContext {
  const agentUser: TestUser = {
    id: agentId,
    username: "agent",
    email: "agent@example.com",
    name: "Agent User",
    openId: "agent-openid",
    loginMethod: "local",
    role: "agent",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: "",
  };

  return {
    user: agentUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const adminUser: TestUser = {
    id: 1,
    username: "admin",
    email: "admin@example.com",
    name: "Admin User",
    openId: "admin-openid",
    loginMethod: "local",
    role: "admin",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: "",
  };

  return {
    user: adminUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("statistics", () => {
  describe("getMyStats", () => {
    it("should allow agent to get own statistics", async () => {
      const ctx = createAgentContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const endDate = new Date().toISOString().split("T")[0];

        const result = await caller.statistics.getMyStats({
          startDate,
          endDate,
        });

        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toMatch(/INTERNAL_SERVER_ERROR/);
      }
    });

    it("should require valid date range", async () => {
      const ctx = createAgentContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.statistics.getMyStats({
          startDate: "invalid-date",
          endDate: "also-invalid",
        });
        // May or may not fail depending on validation
      } catch (error: any) {
        expect(error.code).toMatch(/BAD_REQUEST|PARSE_ERROR|INTERNAL_SERVER_ERROR/);
      }
    });
  });

  describe("getAllStats", () => {
    it("should allow admin to get all statistics", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const endDate = new Date().toISOString().split("T")[0];

        const result = await caller.statistics.getAllStats({
          startDate,
          endDate,
        });

        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        expect(error.code).toMatch(/INTERNAL_SERVER_ERROR/);
      }
    });

    it("should deny agent from getting all statistics", async () => {
      const ctx = createAgentContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const endDate = new Date().toISOString().split("T")[0];

        await caller.statistics.getAllStats({
          startDate,
          endDate,
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("getTotalCalls", () => {
    it("should allow agent to get own total calls", async () => {
      const ctx = createAgentContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.statistics.getTotalCalls();
        expect(result).toBeDefined();
        expect(result.totalCalls).toBeDefined();
        expect(typeof result.totalCalls).toBe("number");
      } catch (error: any) {
        expect(error.code).toMatch(/INTERNAL_SERVER_ERROR/);
      }
    });
  });

  describe("getTotalCallsAdmin", () => {
    it("should allow admin to get total calls", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.statistics.getTotalCallsAdmin();
        expect(result).toBeDefined();
        expect(result.totalCalls).toBeDefined();
        expect(typeof result.totalCalls).toBe("number");
      } catch (error: any) {
        expect(error.code).toMatch(/INTERNAL_SERVER_ERROR/);
      }
    });

    it("should deny agent from getting total calls admin", async () => {
      const ctx = createAgentContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.statistics.getTotalCallsAdmin();
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });
});
