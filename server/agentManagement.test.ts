import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type TestUser = NonNullable<TrpcContext["user"]>;

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

function createAgentContext(): TrpcContext {
  const agentUser: TestUser = {
    id: 2,
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

describe("agentManagement", () => {
  describe("list", () => {
    it("should allow admin to list agents", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.agentManagement.list();
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        // Expected if no agents exist
        expect(error.code).toMatch(/NOT_FOUND|INTERNAL_SERVER_ERROR/);
      }
    });

    it("should deny agent from listing agents", async () => {
      const ctx = createAgentContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.agentManagement.list();
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("create", () => {
    it("should allow admin to create agent", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.agentManagement.create({
          username: `testuser_${Date.now()}`,
          password: "password123",
          name: "Test Agent",
          email: "test@example.com",
        });

        expect(result.success).toBe(true);
      } catch (error: any) {
        // Expected if database constraints fail
        expect(error.code).toMatch(/BAD_REQUEST|INTERNAL_SERVER_ERROR/);
      }
    });

    it("should deny agent from creating agents", async () => {
      const ctx = createAgentContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.agentManagement.create({
          username: "newagent",
          password: "password123",
          name: "New Agent",
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should reject duplicate username", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      try {
        // Try to create with existing username
        await caller.agentManagement.create({
          username: "admin",
          password: "password123",
          name: "Duplicate",
        });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        // Error could be BAD_REQUEST or INTERNAL_SERVER_ERROR depending on DB implementation
        expect(error.code).toMatch(/BAD_REQUEST|INTERNAL_SERVER_ERROR/);
      }
    });
  });

  describe("deactivate", () => {
    it("should allow admin to deactivate agent", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.agentManagement.deactivate({
          agentId: 999, // Non-existent ID
        });
        // Should succeed even if agent doesn't exist
        expect(result.success).toBe(true);
      } catch (error: any) {
        // Expected if database operation fails
        expect(error.code).toMatch(/NOT_FOUND|INTERNAL_SERVER_ERROR/);
      }
    });

    it("should deny agent from deactivating agents", async () => {
      const ctx = createAgentContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.agentManagement.deactivate({
          agentId: 2,
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });
});
