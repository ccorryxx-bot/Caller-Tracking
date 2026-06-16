import { Router, type IRouter } from "express";
import cookieParser from "cookie-parser";
import { getDb } from "../lib/supabase";
import { requireAuth, type AuthRequest } from "../middlewares/requireAuth";
import {
  GetNextNumberResponse,
  GetAgentCallsResponse,
  GetAgentStatsResponse,
  SubmitCallBody,
} from "@workspace/api-zod";

const router: IRouter = Router();
router.use(cookieParser());
router.use(requireAuth);

router.get("/agent/next-number", async (req: AuthRequest, res): Promise<void> => {
  const agentId = req.user!.id;
  const rawLimit = parseInt((req.query["limit"] as string) ?? "1", 10);
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 1 : Math.min(rawLimit, 10);

  const db = getDb();

  const [{ count: totalCount }, { data: calledIds }, { data: phones }] = await Promise.all([
    db.from("ct_phone_numbers").select("id", { count: "exact", head: true }).eq("agent_id", agentId).eq("is_active", true),
    db.from("ct_call_logs").select("phone_number_id").eq("agent_id", agentId).not("phone_number_id", "is", null),
    db.from("ct_phone_numbers").select("id, phone_number").eq("agent_id", agentId).eq("is_active", true).order("id", { ascending: true }),
  ]);

  const calledSet = new Set((calledIds ?? []).map((r: any) => r.phone_number_id));
  const uncalled = (phones ?? []).filter((p: any) => !calledSet.has(p.id));

  if (uncalled.length === 0) {
    res.json(GetNextNumberResponse.parse({
      done: true,
      phoneNumber: null,
      phoneNumberId: null,
      remaining: 0,
      total: totalCount ?? 0,
      queue: [],
    }));
    return;
  }

  const batch = uncalled.slice(0, limit);
  const first = batch[0];

  res.json(GetNextNumberResponse.parse({
    done: false,
    phoneNumber: first.phone_number,
    phoneNumberId: first.id,
    remaining: uncalled.length,
    total: totalCount ?? 0,
    queue: batch.map((p: any) => ({ phoneNumber: p.phone_number, phoneNumberId: p.id })),
  }));
});

router.post("/agent/calls", async (req: AuthRequest, res): Promise<void> => {
  const parsed = SubmitCallBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const agentId = req.user!.id;
  const db = getDb();

  await Promise.all([
    db.from("ct_call_logs").insert({
      agent_id: agentId,
      phone_number_id: parsed.data.phoneNumberId,
      caller_phone: parsed.data.phoneNumber ?? "",
      call_type: "outgoing",
      duration: 0,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes ?? null,
      recorded_at: new Date().toISOString(),
    }),
    db.from("ct_phone_numbers").update({
      called_count: 1,
      last_called_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", parsed.data.phoneNumberId),
  ]);

  res.status(201).json({ success: true });
});

router.get("/agent/calls", async (req: AuthRequest, res): Promise<void> => {
  const agentId = req.user!.id;
  const db = getDb();
  const { data: logs } = await db
    .from("ct_call_logs")
    .select("id, caller_phone, outcome, notes, recorded_at")
    .eq("agent_id", agentId)
    .order("recorded_at", { ascending: false })
    .limit(100);

  res.json(GetAgentCallsResponse.parse(
    (logs ?? []).map((l: any) => ({
      id: l.id,
      phoneNumber: l.caller_phone,
      outcome: l.outcome,
      notes: l.notes,
      recordedAt: l.recorded_at,
    }))
  ));
});

router.get("/agent/stats", async (req: AuthRequest, res): Promise<void> => {
  const agentId = req.user!.id;
  const db = getDb();

  const [{ data: logs }, { count: totalPhones }, { data: calledIds }] = await Promise.all([
    db.from("ct_call_logs").select("outcome").eq("agent_id", agentId),
    db.from("ct_phone_numbers").select("id", { count: "exact", head: true }).eq("agent_id", agentId).eq("is_active", true),
    db.from("ct_call_logs").select("phone_number_id").eq("agent_id", agentId).not("phone_number_id", "is", null),
  ]);

  const counts: Record<string, number> = {
    interested: 0, will_buy: 0, phone_off: 0, no_answer: 0, hung_up: 0,
  };
  for (const l of logs ?? []) {
    if (l.outcome in counts) counts[l.outcome]++;
  }

  const calledCount = new Set((calledIds ?? []).map((r: any) => r.phone_number_id)).size;
  const remaining = Math.max(0, (totalPhones ?? 0) - calledCount);

  res.json(GetAgentStatsResponse.parse({
    total: (logs ?? []).length,
    interested: counts.interested,
    will_buy: counts.will_buy,
    phone_off: counts.phone_off,
    no_answer: counts.no_answer,
    hung_up: counts.hung_up,
    remaining,
    totalPhones: totalPhones ?? 0,
  }));
});

export default router;
