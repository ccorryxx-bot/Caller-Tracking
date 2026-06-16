import { Router, type IRouter } from "express";
import cookieParser from "cookie-parser";
import { getDb } from "../lib/supabase";
import { hashPassword } from "../lib/auth";
import { requireAdmin, type AuthRequest } from "../middlewares/requireAuth";
import {
  ListAgentsResponse,
  CreateAgentBody,
  UpdateAgentParams,
  UpdateAgentBody,
  DeactivateAgentParams,
  ResetAgentPasswordParams,
  ResetAgentPasswordBody,
  ListPhoneNumbersResponse,
  AddPhoneNumberBody,
  BulkAddPhoneNumbersBody,
  BulkAddPhoneNumbersResponse,
  DeletePhoneNumberParams,
  GetAdminStatsResponse,
  GetAgentDetailParams,
  GetAgentDetailResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
router.use(cookieParser());
router.use(requireAdmin);

// ── AGENTS ────────────────────────────────────────────────────────────────────

router.get("/admin/agents", async (_req, res): Promise<void> => {
  const db = getDb();
  const { data: agents } = await db
    .from("ct_users")
    .select("id, username, name, email, role, is_active, created_at")
    .eq("role", "agent")
    .order("created_at", { ascending: false });

  const { data: callCounts } = await db
    .from("ct_call_logs")
    .select("agent_id");

  const countMap: Record<number, number> = {};
  for (const c of callCounts ?? []) {
    countMap[c.agent_id] = (countMap[c.agent_id] ?? 0) + 1;
  }

  res.json(ListAgentsResponse.parse(
    (agents ?? []).map((a: any) => ({
      id: a.id,
      username: a.username,
      name: a.name,
      email: a.email,
      role: a.role,
      isActive: a.is_active,
      totalCalls: countMap[a.id] ?? 0,
      createdAt: a.created_at,
    }))
  ));
});

router.post("/admin/agents", async (req, res): Promise<void> => {
  const parsed = CreateAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const db = getDb();
  const { data: existing } = await db
    .from("ct_users")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();

  if (existing) {
    res.status(400).json({ error: "Username ရှိပြီးသားဖြစ်သည်" });
    return;
  }

  const { data: newAgent } = await db.from("ct_users").insert({
    username: parsed.data.username,
    password_hash: hashPassword(parsed.data.password),
    name: parsed.data.name,
    email: parsed.data.email ?? null,
    role: "agent",
    is_active: true,
  }).select("id, username, name, email, role, is_active, created_at").single();

  res.status(201).json({
    id: newAgent!.id,
    username: newAgent!.username,
    name: newAgent!.name,
    email: newAgent!.email,
    role: newAgent!.role,
    isActive: newAgent!.is_active,
    totalCalls: 0,
    createdAt: newAgent!.created_at,
  });
});

router.patch("/admin/agents/:id", async (req, res): Promise<void> => {
  const params = UpdateAgentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const db = getDb();
  const patch: any = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.email !== undefined) patch.email = parsed.data.email;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;

  await db.from("ct_users").update(patch).eq("id", params.data.id);
  res.json({ success: true });
});

router.delete("/admin/agents/:id", async (req, res): Promise<void> => {
  const params = DeactivateAgentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const db = getDb();
  await db.from("ct_users").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", params.data.id);
  res.json({ success: true });
});

router.post("/admin/agents/:id/reset-password", async (req, res): Promise<void> => {
  const params = ResetAgentPasswordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ResetAgentPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const db = getDb();
  await db.from("ct_users")
    .update({ password_hash: hashPassword(parsed.data.newPassword), updated_at: new Date().toISOString() })
    .eq("id", params.data.id);
  res.json({ success: true });
});

// ── PHONE NUMBERS ─────────────────────────────────────────────────────────────

router.get("/admin/phone-numbers", async (_req, res): Promise<void> => {
  const db = getDb();
  const { data: phones } = await db
    .from("ct_phone_numbers")
    .select("id, phone_number, agent_id, campaign, is_active, called_count, last_called_at, created_at")
    .order("created_at", { ascending: false });

  const { data: agents } = await db.from("ct_users").select("id, name");
  const agentMap: Record<number, string> = {};
  for (const a of agents ?? []) agentMap[a.id] = a.name ?? a.id.toString();

  res.json(ListPhoneNumbersResponse.parse(
    (phones ?? []).map((p: any) => ({
      id: p.id,
      phoneNumber: p.phone_number,
      agentId: p.agent_id,
      agentName: agentMap[p.agent_id] ?? null,
      campaign: p.campaign,
      isActive: p.is_active,
      calledCount: p.called_count ?? 0,
      lastCalledAt: p.last_called_at,
      createdAt: p.created_at,
    }))
  ));
});

router.post("/admin/phone-numbers", async (req, res): Promise<void> => {
  const parsed = AddPhoneNumberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const db = getDb();
  await db.from("ct_phone_numbers").upsert({
    phone_number: parsed.data.phoneNumber.trim(),
    agent_id: parsed.data.agentId,
    campaign: parsed.data.campaign ?? null,
    is_active: true,
    called_count: 0,
  }, { onConflict: "phone_number,agent_id" });
  res.status(201).json({ success: true });
});

router.post("/admin/phone-numbers/bulk", async (req, res): Promise<void> => {
  const parsed = BulkAddPhoneNumbersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const db = getDb();
  const lines = parsed.data.numbers
    .split(/[\n,]+/)
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  const { data: existing } = await db
    .from("ct_phone_numbers")
    .select("phone_number")
    .eq("agent_id", parsed.data.agentId);

  const existingSet = new Set((existing ?? []).map((e: any) => e.phone_number));
  const toAdd = lines.filter((l: string) => !existingSet.has(l));

  if (toAdd.length > 0) {
    await db.from("ct_phone_numbers").insert(
      toAdd.map((num: string) => ({
        phone_number: num,
        agent_id: parsed.data.agentId,
        campaign: parsed.data.campaign ?? null,
        is_active: true,
        called_count: 0,
      }))
    );
  }

  res.json(BulkAddPhoneNumbersResponse.parse({
    added: toAdd.length,
    skipped: lines.length - toAdd.length,
  }));
});

router.delete("/admin/phone-numbers/:id", async (req, res): Promise<void> => {
  const params = DeletePhoneNumberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const db = getDb();
  await db.from("ct_phone_numbers").delete().eq("id", params.data.id);
  res.json({ success: true });
});

// ── STATISTICS ────────────────────────────────────────────────────────────────

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const db = getDb();
  const { data: agents } = await db
    .from("ct_users")
    .select("id, username, name")
    .eq("role", "agent");

  const { data: allLogs } = await db
    .from("ct_call_logs")
    .select("agent_id, outcome, recorded_at");

  const { data: phoneCounts } = await db
    .from("ct_phone_numbers")
    .select("agent_id")
    .eq("is_active", true);

  const phoneCountMap: Record<number, number> = {};
  for (const p of phoneCounts ?? []) {
    phoneCountMap[p.agent_id] = (phoneCountMap[p.agent_id] ?? 0) + 1;
  }

  const stats = (agents ?? []).map((a: any) => {
    const logs = (allLogs ?? []).filter((l: any) => l.agent_id === a.id);
    const outcomes: Record<string, number> = {
      interested: 0, will_buy: 0, phone_off: 0, no_answer: 0, hung_up: 0,
    };
    for (const l of logs) {
      if (l.outcome in outcomes) outcomes[l.outcome]++;
    }

    const sorted = logs
      .map((l: any) => new Date(l.recorded_at).getTime())
      .sort((a: number, b: number) => a - b);

    let avgSecs: number | null = null;
    if (sorted.length > 1) {
      const diffs = sorted.slice(1).map((t: number, i: number) => (t - sorted[i]) / 1000);
      avgSecs = diffs.reduce((s: number, d: number) => s + d, 0) / diffs.length;
    }

    const lastLog = logs.length > 0
      ? logs.reduce((a: any, b: any) => a.recorded_at > b.recorded_at ? a : b)
      : null;

    return {
      agentId: a.id,
      agentName: a.name ?? a.username,
      username: a.username,
      totalCalls: logs.length,
      totalPhones: phoneCountMap[a.id] ?? 0,
      ...outcomes,
      avgSecondsPerCall: avgSecs,
      lastCallAt: lastLog?.recorded_at ?? null,
    };
  });

  res.json(GetAdminStatsResponse.parse(stats));
});

router.get("/admin/agent-detail/:id", async (req, res): Promise<void> => {
  const params = GetAgentDetailParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const db = getDb();
  const { data: agent } = await db
    .from("ct_users")
    .select("id, username, name, email, role, is_active, created_at")
    .eq("id", params.data.id)
    .maybeSingle();

  if (!agent) {
    res.status(404).json({ error: "Agent မတွေ့ပါ" });
    return;
  }

  const { data: logs } = await db
    .from("ct_call_logs")
    .select("id, caller_phone, outcome, notes, recorded_at, phone_number_id")
    .eq("agent_id", params.data.id)
    .order("recorded_at", { ascending: false })
    .limit(200);

  const sorted = [...(logs ?? [])].sort(
    (a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  const callsWithDiff = sorted.map((l: any, i: number) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    const secondsSincePrev = prev
      ? Math.round((new Date(l.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) / 1000)
      : null;
    return {
      id: l.id,
      phoneNumber: l.caller_phone,
      outcome: l.outcome,
      notes: l.notes,
      recordedAt: l.recorded_at,
      secondsSincePrev,
    };
  }).reverse();

  const { count: totalCalls } = await db
    .from("ct_call_logs")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", params.data.id);

  res.json(GetAgentDetailResponse.parse({
    agent: {
      id: agent.id,
      username: agent.username,
      name: agent.name,
      email: agent.email,
      role: agent.role,
      isActive: agent.is_active,
      totalCalls: totalCalls ?? 0,
      createdAt: agent.created_at,
    },
    calls: callsWithDiff,
  }));
});

export default router;
