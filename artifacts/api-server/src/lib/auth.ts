import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "caller-tracking-jwt-secret-2026";
const COOKIE_NAME = "ct_session";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function signToken(payload: { id: number; username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { id: number; username: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
