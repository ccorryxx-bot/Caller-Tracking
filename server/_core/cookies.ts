import type { Request } from "express";

export interface SessionCookieOptions {
  httpOnly: boolean;
  path: string;
  sameSite: "none" | "lax" | "strict";
  secure: boolean;
  domain?: string;
}

function isSecureRequest(req: Request): boolean {
  if ((req as any).protocol === "https") return true;
  const fwd = (req as any).headers?.["x-forwarded-proto"];
  if (!fwd) return false;
  const list = Array.isArray(fwd) ? fwd : fwd.split(",");
  return list.some((p) => p.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(req: Request): SessionCookieOptions {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
