import { type Request, type Response, type NextFunction } from "express";
import { verifyToken, COOKIE_NAME } from "../lib/auth";

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "ဝင်ရောက်ထားခြင်းမရှိပါ" });
    return;
  }
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Session သက်တမ်းကုန်ပြီ၊ ပြန်ဝင်ပါ" });
    return;
  }
  req.user = user;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" });
      return;
    }
    next();
  });
}
