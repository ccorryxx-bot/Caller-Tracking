import { Router, type IRouter } from "express";
import cookieParser from "cookie-parser";
import { getDb } from "../lib/supabase";
import { hashPassword, verifyPassword, signToken, COOKIE_NAME } from "../lib/auth";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import {
  LoginBody,
  LoginResponse,
  LogoutResponse,
  GetMeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
router.use(cookieParser());

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, password } = parsed.data;
  const db = getDb();
  const { data: users } = await db
    .from("ct_users")
    .select("*")
    .eq("username", username)
    .eq("is_active", true)
    .maybeSingle();

  if (!users || !verifyPassword(password, users.password_hash)) {
    res.status(401).json({ error: "Username သို့မဟုတ် Password မှားနေသည်" });
    return;
  }

  await db
    .from("ct_users")
    .update({ last_signed_in: new Date().toISOString() })
    .eq("id", users.id);

  const token = signToken({ id: users.id, username: users.username, role: users.role });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json(LoginResponse.parse({
    success: true,
    user: {
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      role: users.role,
    },
  }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  res.clearCookie(COOKIE_NAME);
  res.json(LogoutResponse.parse({ success: true }));
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const db = getDb();
  const { data: user } = await db
    .from("ct_users")
    .select("id, username, name, email, role")
    .eq("id", req.user!.id)
    .maybeSingle();

  if (!user) {
    res.status(401).json({ error: "User မတွေ့ပါ" });
    return;
  }

  res.json(GetMeResponse.parse({
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
  }));
});

export default router;
