import { COOKIE_NAME } from "../../shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

export type SessionPayload = {
  username: string;
  name: string;
};

const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

class SessionService {
  private getSessionSecret() {
    return new TextEncoder().encode(ENV.jwtSecret);
  }

  async createSessionToken(
    username: string,
    name: string,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({ username, name })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(cookieValue: string | undefined | null): Promise<SessionPayload | null> {
    if (!cookieValue) return null;
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { username, name } = payload as Record<string, unknown>;
      if (typeof username !== "string" || !username) return null;
      return { username, name: typeof name === "string" ? name : "" };
    } catch {
      return null;
    }
  }

  parseCookies(cookieHeader: string | undefined): Map<string, string> {
    if (!cookieHeader) return new Map();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  getSessionCookie(req: Request): string | undefined {
    const cookieHeader = (req as any).headers?.cookie;
    return this.parseCookies(cookieHeader).get(COOKIE_NAME);
  }
}

export const sdk = new SessionService();
