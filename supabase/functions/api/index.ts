import { createClient } from "npm:@supabase/supabase-js@2";
import * as jose from "npm:jose@5";

// ── Env ───────────────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SERVICE_ROLE")!;
const JWT_SECRET_RAW = Deno.env.get("JWT_SECRET") ?? "caller-tracking-jwt-secret-2026";
const COOKIE_NAME = "ct_session";
const ALLOWED_ORIGIN = Deno.env.get("FRONTEND_URL") ?? "https://caller-tracking-system.vercel.app";

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDb() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k.trim(), decodeURIComponent(v.join("="))];
    })
  );
}

async function signToken(payload: { id: number; username: string; role: string }): Promise<string> {
  return await new jose.SignJWT(payload as jose.JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

async function verifyToken(token: string): Promise<{ id: number; username: string; role: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as { id: number; username: string; role: string };
  } catch {
    return null;
  }
}

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
  };
}

function json(data: unknown, status = 200, req: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors(req) },
  });
}

function setCookieHeader(token: string): string {
  const maxAge = 30 * 24 * 60 * 60;
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}; Path=/`;
}

function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/`;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function getUser(req: Request): Promise<{ id: number; username: string; role: string } | null> {
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifyToken(token);
}

// ── Route: GET /healthz ───────────────────────────────────────────────────────
async function handleHealth(req: Request): Promise<Response> {
  return json({ status: "ok" }, 200, req);
}

// ── Routes: /auth/* ───────────────────────────────────────────────────────────
async function handleLogin(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body ?? {};
  if (!username || !password) return json({ error: "username and password required" }, 400, req);

  const db = getDb();
  const { data: user } = await db
    .from("ct_users")
    .select("*")
    .eq("username", username)
    .eq("is_active", true)
    .maybeSingle();

  if (!user) return json({ error: "Username သို့မဟုတ် Password မှားနေသည်" }, 401, req);

  const hash = await hashPassword(password);
  if (hash !== user.password_hash) return json({ error: "Username သို့မဟုတ် Password မှားနေသည်" }, 401, req);

  await db.from("ct_users").update({ last_signed_in: new Date().toISOString() }).eq("id", user.id);

  const token = await signToken({ id: user.id, username: user.username, role: user.role });

  return new Response(
    JSON.stringify({
      success: true,
      user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": setCookieHeader(token),
        ...cors(req),
      },
    }
  );
}

async function handleLogout(req: Request): Promise<Response> {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearCookieHeader(),
      ...cors(req),
    },
  });
}

async function handleGetMe(req: Request): Promise<Response> {
  const user = await getUser(req);
  if (!user) return json({ error: "ဝင်ရောက်ထားခြင်းမရှိပါ" }, 401, req);

  const db = getDb();
  const { data } = await db
    .from("ct_users")
    .select("id, username, name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return json({ error: "User မတွေ့ပါ" }, 401, req);
  return json({ id: data.id, username: data.username, name: data.name, email: data.email, role: data.role }, 200, req);
}

// ── Routes: /agent/* ──────────────────────────────────────────────────────────
async function handleGetNextNumber(req: Request): Promise<Response> {
  const user = await getUser(req);
  if (!user) return json({ error: "ဝင်ရောက်ထားခြင်းမရှိပါ" }, 401, req);

  const url = new URL(req.url);
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "1", 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 1 : Math.min(rawLimit, 10);

  const db = getDb();
  const [{ count: totalCount }, { data: calledIds }, { data: phones }] = await Promise.all([
    db.from("ct_phone_numbers").select("id", { count: "exact", head: true }).eq("agent_id", user.id).eq("is_active", true),
    db.from("ct_call_logs").select("phone_number_id").eq("agent_id", user.id).not("phone_number_id", "is", null),
    db.from("ct_phone_numbers").select("id, phone_number").eq("agent_id", user.id).eq("is_active", true).order("id", { ascending: true }),
  ]);

  const calledSet = new Set((calledIds ?? []).map((r: any) => r.phone_number_id));
  const uncalled = (phones ?? []).filter((p: any) => !calledSet.has(p.id));

  if (uncalled.length === 0) {
    return json({ done: true, phoneNumber: null, phoneNumberId: null, remaining: 0, total: totalCount ?? 0, queue: [] }, 200, req);
  }

  const batch = uncalled.slice(0, limit);
  const first = batch[0];
  return json({
    done: false,
    phoneNumber: first.phone_number,
    phoneNumberId: first.id,
    remaining: uncalled.length,
    total: totalCount ?? 0,
    queue: batch.map((p: any) => ({ phoneNumber: p.phone_number, phoneNumberId: p.id })),
  }, 200, req);
}

async function handleSubmitCall(req: Request): Promise<Response> {
  const user = await getUser(req);
  if (!user) return json({ error: "ဝင်ရောက်ထားခြင်းမရှိပါ" }, 401, req);

  const body = await req.json().catch(() => ({}));
  const { phoneNumberId, phoneNumber, outcome, notes } = body ?? {};
  if (!phoneNumberId || !outcome) return json({ error: "phoneNumberId and outcome required" }, 400, req);

  const db = getDb();
  await Promise.all([
    db.from("ct_call_logs").insert({
      agent_id: user.id,
      phone_number_id: phoneNumberId,
      caller_phone: phoneNumber ?? "",
      call_type: "outgoing",
      duration: 0,
      outcome,
      notes: notes ?? null,
      recorded_at: new Date().toISOString(),
    }),
    db.from("ct_phone_numbers").update({
      called_count: 1,
      last_called_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", phoneNumberId),
  ]);

  return json({ success: true }, 201, req);
}

async function handleGetAgentCalls(req: Request): Promise<Response> {
  const user = await getUser(req);
  if (!user) return json({ error: "ဝင်ရောက်ထားခြင်းမရှိပါ" }, 401, req);

  const db = getDb();
  const { data: logs } = await db
    .from("ct_call_logs")
    .select("id, caller_phone, outcome, notes, recorded_at")
    .eq("agent_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(100);

  return json((logs ?? []).map((l: any) => ({
    id: l.id, phoneNumber: l.caller_phone, outcome: l.outcome, notes: l.notes, recordedAt: l.recorded_at,
  })), 200, req);
}

async function handleGetAgentStats(req: Request): Promise<Response> {
  const user = await getUser(req);
  if (!user) return json({ error: "ဝင်ရောက်ထားခြင်းမရှိပါ" }, 401, req);

  const db = getDb();
  const [{ data: logs }, { count: totalPhones }, { data: calledIds }] = await Promise.all([
    db.from("ct_call_logs").select("outcome").eq("agent_id", user.id),
    db.from("ct_phone_numbers").select("id", { count: "exact", head: true }).eq("agent_id", user.id).eq("is_active", true),
    db.from("ct_call_logs").select("phone_number_id").eq("agent_id", user.id).not("phone_number_id", "is", null),
  ]);

  const counts: Record<string, number> = { interested: 0, will_buy: 0, phone_off: 0, no_answer: 0, hung_up: 0 };
  for (const l of logs ?? []) { if (l.outcome in counts) counts[l.outcome]++; }
  const calledCount = new Set((calledIds ?? []).map((r: any) => r.phone_number_id)).size;

  return json({
    total: (logs ?? []).length,
    ...counts,
    remaining: Math.max(0, (totalPhones ?? 0) - calledCount),
    totalPhones: totalPhones ?? 0,
  }, 200, req);
}

// ── Routes: /admin/* ──────────────────────────────────────────────────────────
async function requireAdmin(req: Request): Promise<{ id: number; username: string; role: string } | null> {
  const user = await getUser(req);
  if (!user || user.role !== "admin") return null;
  return user;
}

async function handleListAgents(req: Request): Promise<Response> {
  if (!await requireAdmin(req)) return json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" }, 403, req);
  const db = getDb();
  const [{ data: agents }, { data: callCounts }] = await Promise.all([
    db.from("ct_users").select("id, username, name, email, role, is_active, created_at").eq("role", "agent").order("created_at", { ascending: false }),
    db.from("ct_call_logs").select("agent_id"),
  ]);

  const countMap: Record<number, number> = {};
  for (const c of callCounts ?? []) { countMap[c.agent_id] = (countMap[c.agent_id] ?? 0) + 1; }

  return json((agents ?? []).map((a: any) => ({
    id: a.id, username: a.username, name: a.name, email: a.email, role: a.role,
    isActive: a.is_active, totalCalls: countMap[a.id] ?? 0, createdAt: a.created_at,
  })), 200, req);
}

async function handleCreateAgent(req: Request): Promise<Response> {
  if (!await requireAdmin(req)) return json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" }, 403, req);
  const body = await req.json().catch(() => ({}));
  const { username, password, name, email } = body ?? {};
  if (!username || !password || !name) return json({ error: "username, password, name required" }, 400, req);

  const db = getDb();
  const { data: existing } = await db.from("ct_users").select("id").eq("username", username).maybeSingle();
  if (existing) return json({ error: "Username ရှိပြီးသားဖြစ်သည်" }, 400, req);

  const { data: newAgent } = await db.from("ct_users").insert({
    username, password_hash: await hashPassword(password), name, email: email ?? null, role: "agent", is_active: true,
  }).select("id, username, name, email, role, is_active, created_at").single();

  return json({ id: newAgent!.id, username: newAgent!.username, name: newAgent!.name, email: newAgent!.email,
    role: newAgent!.role, isActive: newAgent!.is_active, totalCalls: 0, createdAt: newAgent!.created_at }, 201, req);
}

async function handleUpdateAgent(req: Request, id: number): Promise<Response> {
  if (!await requireAdmin(req)) return json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" }, 403, req);
  const body = await req.json().catch(() => ({}));
  const patch: any = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.email !== undefined) patch.email = body.email;
  if (body.isActive !== undefined) patch.is_active = body.isActive;
  await getDb().from("ct_users").update(patch).eq("id", id);
  return json({ success: true }, 200, req);
}

async function handleDeactivateAgent(req: Request, id: number): Promise<Response> {
  if (!await requireAdmin(req)) return json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" }, 403, req);
  await getDb().from("ct_users").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
  return json({ success: true }, 200, req);
}

async function handleResetPassword(req: Request, id: number): Promise<Response> {
  if (!await requireAdmin(req)) return json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" }, 403, req);
  const body = await req.json().catch(() => ({}));
  if (!body.newPassword) return json({ error: "newPassword required" }, 400, req);
  await getDb().from("ct_users").update({ password_hash: await hashPassword(body.newPassword), updated_at: new Date().toISOString() }).eq("id", id);
  return json({ success: true }, 200, req);
}

async function handleListPhoneNumbers(req: Request): Promise<Response> {
  if (!await requireAdmin(req)) return json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" }, 403, req);
  const db = getDb();
  const [{ data: phones }, { data: agents }] = await Promise.all([
    db.from("ct_phone_numbers").select("id, phone_number, agent_id, campaign, is_active, called_count, last_called_at, created_at").order("created_at", { ascending: false }),
    db.from("ct_users").select("id, name"),
  ]);

  const agentMap: Record<number, string> = {};
  for (const a of agents ?? []) agentMap[a.id] = a.name ?? a.id.toString();

  return json((phones ?? []).map((p: any) => ({
    id: p.id, phoneNumber: p.phone_number, agentId: p.agent_id,
    agentName: agentMap[p.agent_id] ?? null, campaign: p.campaign,
    isActive: p.is_active, calledCount: p.called_count ?? 0,
    lastCalledAt: p.last_called_at, createdAt: p.created_at,
  })), 200, req);
}

async function handleAddPhoneNumber(req: Request): Promise<Response> {
  if (!await requireAdmin(req)) return json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" }, 403, req);
  const body = await req.json().catch(() => ({}));
  if (!body.phoneNumber || !body.agentId) return json({ error: "phoneNumber and agentId required" }, 400, req);
  await getDb().from("ct_phone_numbers").upsert({
    phone_number: body.phoneNumber.trim(), agent_id: body.agentId,
    campaign: body.campaign ?? null, is_active: true, called_count: 0,
  }, { onConflict: "phone_number,agent_id" });
  return json({ success: true }, 201, req);
}

async function handleBulkAddPhoneNumbers(req: Request): Promise<Response> {
  if (!await requireAdmin(req)) return json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" }, 403, req);
  const body = await req.json().catch(() => ({}));
  if (!body.numbers || !body.agentId) return json({ error: "numbers and agentId required" }, 400, req);

  const lines = body.numbers.split(/[\n,]+/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
  const db = getDb();
  const { data: existing } = await db.from("ct_phone_numbers").select("phone_number").eq("agent_id", body.agentId);
  const existingSet = new Set((existing ?? []).map((e: any) => e.phone_number));
  const toAdd = lines.filter((l: string) => !existingSet.has(l));

  if (toAdd.length > 0) {
    await db.from("ct_phone_numbers").insert(
      toAdd.map((num: string) => ({ phone_number: num, agent_id: body.agentId, campaign: body.campaign ?? null, is_active: true, called_count: 0 }))
    );
  }
  return json({ added: toAdd.length, skipped: lines.length - toAdd.length }, 200, req);
}

async function handleDeletePhoneNumber(req: Request, id: number): Promise<Response> {
  if (!await requireAdmin(req)) return json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" }, 403, req);
  await getDb().from("ct_phone_numbers").delete().eq("id", id);
  return json({ success: true }, 200, req);
}

async function handleAdminStats(req: Request): Promise<Response> {
  if (!await requireAdmin(req)) return json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" }, 403, req);
  const db = getDb();
  const [{ data: agents }, { data: allLogs }, { data: phoneCounts }] = await Promise.all([
    db.from("ct_users").select("id, username, name").eq("role", "agent"),
    db.from("ct_call_logs").select("agent_id, outcome, recorded_at"),
    db.from("ct_phone_numbers").select("agent_id").eq("is_active", true),
  ]);

  const phoneCountMap: Record<number, number> = {};
  for (const p of phoneCounts ?? []) { phoneCountMap[p.agent_id] = (phoneCountMap[p.agent_id] ?? 0) + 1; }

  const stats = (agents ?? []).map((a: any) => {
    const logs = (allLogs ?? []).filter((l: any) => l.agent_id === a.id);
    const outcomes: Record<string, number> = { interested: 0, will_buy: 0, phone_off: 0, no_answer: 0, hung_up: 0 };
    for (const l of logs) { if (l.outcome in outcomes) outcomes[l.outcome]++; }
    const sorted = logs.map((l: any) => new Date(l.recorded_at).getTime()).sort((a: number, b: number) => a - b);
    let avgSecs: number | null = null;
    if (sorted.length > 1) {
      const diffs = sorted.slice(1).map((t: number, i: number) => (t - sorted[i]) / 1000);
      avgSecs = diffs.reduce((s: number, d: number) => s + d, 0) / diffs.length;
    }
    const lastLog = logs.length > 0 ? logs.reduce((a: any, b: any) => a.recorded_at > b.recorded_at ? a : b) : null;
    return { agentId: a.id, agentName: a.name ?? a.username, username: a.username,
      totalCalls: logs.length, totalPhones: phoneCountMap[a.id] ?? 0,
      ...outcomes, avgSecondsPerCall: avgSecs, lastCallAt: lastLog?.recorded_at ?? null };
  });
  return json(stats, 200, req);
}

async function handleAgentDetail(req: Request, id: number): Promise<Response> {
  if (!await requireAdmin(req)) return json({ error: "Admin ခွင့်ပြုချက်မရှိပါ" }, 403, req);
  const db = getDb();
  const [{ data: agent }, { data: logs }, { count: totalCalls }] = await Promise.all([
    db.from("ct_users").select("id, username, name, email, role, is_active, created_at").eq("id", id).maybeSingle(),
    db.from("ct_call_logs").select("id, caller_phone, outcome, notes, recorded_at").eq("agent_id", id).order("recorded_at", { ascending: false }).limit(200),
    db.from("ct_call_logs").select("id", { count: "exact", head: true }).eq("agent_id", id),
  ]);

  if (!agent) return json({ error: "Agent မတွေ့ပါ" }, 404, req);

  const sorted = [...(logs ?? [])].sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  const callsWithDiff = sorted.map((l: any, i: number) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    const secondsSincePrev = prev ? Math.round((new Date(l.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) / 1000) : null;
    return { id: l.id, phoneNumber: l.caller_phone, outcome: l.outcome, notes: l.notes, recordedAt: l.recorded_at, secondsSincePrev };
  }).reverse();

  return json({
    agent: { id: agent.id, username: agent.username, name: agent.name, email: agent.email,
      role: agent.role, isActive: agent.is_active, totalCalls: totalCalls ?? 0, createdAt: agent.created_at },
    calls: callsWithDiff,
  }, 200, req);
}

// ── Main Router ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(req) });
  }

  const url = new URL(req.url);
  // Strip /functions/v1/api prefix to get the route path
  const path = url.pathname.replace(/^\/functions\/v1\/api/, "") || "/";
  const method = req.method.toUpperCase();

  // ── Health ──
  if (method === "GET" && path === "/healthz") return handleHealth(req);

  // ── Auth ──
  if (method === "POST" && path === "/auth/login") return handleLogin(req);
  if (method === "POST" && path === "/auth/logout") return handleLogout(req);
  if (method === "GET"  && path === "/auth/me")     return handleGetMe(req);

  // ── Agent ──
  if (method === "GET"  && path === "/agent/next-number") return handleGetNextNumber(req);
  if (method === "POST" && path === "/agent/calls")       return handleSubmitCall(req);
  if (method === "GET"  && path === "/agent/calls")       return handleGetAgentCalls(req);
  if (method === "GET"  && path === "/agent/stats")       return handleGetAgentStats(req);

  // ── Admin ──
  if (method === "GET"  && path === "/admin/agents")      return handleListAgents(req);
  if (method === "POST" && path === "/admin/agents")      return handleCreateAgent(req);
  if (method === "GET"  && path === "/admin/stats")       return handleAdminStats(req);
  if (method === "POST" && path === "/admin/phone-numbers/bulk") return handleBulkAddPhoneNumbers(req);
  if (method === "GET"  && path === "/admin/phone-numbers")      return handleListPhoneNumbers(req);
  if (method === "POST" && path === "/admin/phone-numbers")      return handleAddPhoneNumber(req);

  // Path param routes
  const agentIdMatch  = path.match(/^\/admin\/agents\/(\d+)$/);
  const resetMatch    = path.match(/^\/admin\/agents\/(\d+)\/reset-password$/);
  const phoneIdMatch  = path.match(/^\/admin\/phone-numbers\/(\d+)$/);
  const detailMatch   = path.match(/^\/admin\/agent-detail\/(\d+)$/);

  if (agentIdMatch) {
    const id = parseInt(agentIdMatch[1]);
    if (method === "PATCH")  return handleUpdateAgent(req, id);
    if (method === "DELETE") return handleDeactivateAgent(req, id);
  }
  if (resetMatch  && method === "POST")  return handleResetPassword(req, parseInt(resetMatch[1]));
  if (phoneIdMatch && method === "DELETE") return handleDeletePhoneNumber(req, parseInt(phoneIdMatch[1]));
  if (detailMatch  && method === "GET")  return handleAgentDetail(req, parseInt(detailMatch[1]));

  return json({ error: `Route not found: ${method} ${path}` }, 404, req);
});
