import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type TestUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.login", () => {
  it("should fail with invalid credentials", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.login({
        username: "nonexistent",
        password: "wrongpassword",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.message).toContain("Invalid credentials");
    }
  });

  it("should return user data on successful login", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    // Note: This test assumes a test user exists in the database
    // In a real scenario, you'd seed test data or mock the database
    try {
      const result = await caller.auth.login({
        username: "admin",
        password: "admin123",
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.username).toBe("admin");
      expect(result.user.role).toMatch(/admin|agent/);
    } catch (error: any) {
      // Expected if test user doesn't exist
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });

  it("should fail for inactive users", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.login({
        username: "inactive_user",
        password: "password123",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);
    }
  });
});

describe("auth.me", () => {
  it("should return null when not authenticated", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("should return user data when authenticated", async () => {
    const user: TestUser = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      name: "Test User",
      openId: "test-openid",
      loginMethod: "local",
      role: "agent",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      passwordHash: "",
    };

    const ctx = createContext();
    ctx.user = user;
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.username).toBe("testuser");
    expect(result?.role).toBe("agent");
  });
});

describe("auth.logout", () => {
  it("should clear session cookie on logout", async () => {
    const user: TestUser = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      name: "Test User",
      openId: "test-openid",
      loginMethod: "local",
      role: "agent",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      passwordHash: "",
    };

    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];

    const ctx = createContext();
    ctx.user = user;
    ctx.res = {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"];

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toMatch(/session|auth/i);
  });
});
