import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";
import type {
  User, InsertUser, PhoneNumber, CallLog, CallbackQueueEntry, DailyStatistics,
} from "../drizzle/schema";

function getDb() {
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRole);
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapUser(r: any): User {
  return {
    id: r.id,
    openId: null,
    username: r.username,
    passwordHash: r.password_hash,
    name: r.name ?? null,
    email: r.email ?? null,
    role: r.role as "agent" | "admin",
    isActive: r.is_active,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
    lastSignedIn: r.last_signed_in ? new Date(r.last_signed_in) : null,
  };
}

function mapPhone(r: any): PhoneNumber {
  return {
    id: r.id,
    phoneNumber: r.phone_number,
    agentId: r.agent_id,
    campaign: r.campaign ?? null,
    isActive: r.is_active,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

function mapCallLog(r: any): CallLog {
  return {
    id: r.id,
    agentId: r.agent_id,
    callType: r.call_type as "incoming" | "outgoing",
    callerName: r.caller_name ?? null,
    callerPhone: r.caller_phone,
    duration: r.duration,
    notes: r.notes ?? null,
    outcome: r.outcome,
    recordedAt: new Date(r.recorded_at),
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

function mapCallback(r: any): CallbackQueueEntry {
  return {
    id: r.id,
    agentId: r.agent_id,
    callerName: r.caller_name,
    callerPhone: r.caller_phone,
    scheduledTime: new Date(r.scheduled_time),
    priority: r.priority as "low" | "medium" | "high",
    notes: r.notes ?? null,
    isCompleted: r.is_completed,
    completedAt: r.completed_at ? new Date(r.completed_at) : null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

function mapStat(r: any): DailyStatistics {
  return {
    id: r.id,
    agentId: r.agent_id,
    date: r.date,
    totalCalls: r.total_calls,
    incomingCalls: r.incoming_calls,
    outgoingCalls: r.outgoing_calls,
    totalDuration: r.total_duration,
    completedCallbacks: r.completed_callbacks,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

// ── USER ─────────────────────────────────────────────────────────────────────

export async function getUserByUsername(username: string): Promise<User | null> {
  const { data } = await getDb().from("ct_users").select("*").eq("username", username).maybeSingle();
  return data ? mapUser(data) : null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  await getDb().from("ct_users").upsert({
    username: user.username,
    password_hash: user.passwordHash,
    name: user.name ?? null,
    email: user.email ?? null,
    role: user.role ?? "agent",
    is_active: user.isActive ?? true,
    last_signed_in: user.lastSignedIn ?? null,
  }, { onConflict: "username" });
}

// ── AGENT MANAGEMENT ─────────────────────────────────────────────────────────

export async function getAllAgents(): Promise<User[]> {
  const { data } = await getDb().from("ct_users").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(mapUser);
}

export async function createAgent(
  username: string,
  passwordHash: string,
  name: string,
  email?: string
): Promise<void> {
  await getDb().from("ct_users").insert({
    username,
    password_hash: passwordHash,
    name,
    email: email ?? null,
    role: "agent",
    is_active: true,
  });
}

export async function updateAgent(
  agentId: number,
  updates: { name?: string; email?: string }
): Promise<void> {
  const patch: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.email !== undefined) patch.email = updates.email;
  await getDb().from("ct_users").update(patch).eq("id", agentId);
}

export async function deactivateAgent(agentId: number): Promise<void> {
  await getDb().from("ct_users").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", agentId);
}

// ── PHONE NUMBERS ─────────────────────────────────────────────────────────────

export async function getAllPhoneNumbers(): Promise<PhoneNumber[]> {
  const { data } = await getDb().from("ct_phone_numbers").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(mapPhone);
}

export async function getPhoneNumbersByAgent(agentId: number): Promise<PhoneNumber[]> {
  const { data } = await getDb().from("ct_phone_numbers").select("*").eq("agent_id", agentId);
  return (data ?? []).map(mapPhone);
}

export async function assignPhoneNumber(
  phoneNumber: string,
  agentId: number,
  campaign?: string
): Promise<void> {
  await getDb().from("ct_phone_numbers").upsert({
    phone_number: phoneNumber,
    agent_id: agentId,
    campaign: campaign ?? null,
    is_active: true,
  }, { onConflict: "phone_number" });
}

export async function updatePhoneNumber(
  phoneNumberId: number,
  updates: { campaign?: string; isActive?: boolean }
): Promise<void> {
  const patch: any = { updated_at: new Date().toISOString() };
  if (updates.campaign !== undefined) patch.campaign = updates.campaign;
  if (updates.isActive !== undefined) patch.is_active = updates.isActive;
  await getDb().from("ct_phone_numbers").update(patch).eq("id", phoneNumberId);
}

// ── CALL LOGS ─────────────────────────────────────────────────────────────────

export async function createCallLog(
  agentId: number,
  callType: "incoming" | "outgoing",
  callerPhone: string,
  duration: number,
  outcome: string,
  callerName?: string,
  notes?: string
): Promise<void> {
  await getDb().from("ct_call_logs").insert({
    agent_id: agentId,
    call_type: callType,
    caller_phone: callerPhone,
    duration,
    outcome,
    caller_name: callerName ?? null,
    notes: notes ?? null,
  });
}

export async function getCallLogsByAgent(
  agentId: number,
  limit = 50,
  offset = 0
): Promise<CallLog[]> {
  const { data } = await getDb()
    .from("ct_call_logs")
    .select("*")
    .eq("agent_id", agentId)
    .order("recorded_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return (data ?? []).map(mapCallLog);
}

export async function getAllCallLogs(limit = 100, offset = 0): Promise<CallLog[]> {
  const { data } = await getDb()
    .from("ct_call_logs")
    .select("*")
    .order("recorded_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return (data ?? []).map(mapCallLog);
}

// ── CALLBACK QUEUE ────────────────────────────────────────────────────────────

export async function createCallbackQueueEntry(
  agentId: number,
  callerName: string,
  callerPhone: string,
  scheduledTime: Date,
  priority: "low" | "medium" | "high",
  notes?: string
): Promise<void> {
  await getDb().from("ct_callback_queue").insert({
    agent_id: agentId,
    caller_name: callerName,
    caller_phone: callerPhone,
    scheduled_time: scheduledTime.toISOString(),
    priority,
    notes: notes ?? null,
  });
}

export async function getCallbackQueueByAgent(
  agentId: number,
  includeCompleted: boolean
): Promise<CallbackQueueEntry[]> {
  let q = getDb().from("ct_callback_queue").select("*").eq("agent_id", agentId);
  if (!includeCompleted) q = q.eq("is_completed", false);
  const { data } = await q.order("scheduled_time", { ascending: true });
  return (data ?? []).map(mapCallback);
}

export async function getAllCallbackQueue(includeCompleted: boolean): Promise<CallbackQueueEntry[]> {
  let q = getDb().from("ct_callback_queue").select("*");
  if (!includeCompleted) q = q.eq("is_completed", false);
  const { data } = await q.order("scheduled_time", { ascending: true });
  return (data ?? []).map(mapCallback);
}

export async function markCallbackAsCompleted(callbackId: number): Promise<void> {
  await getDb().from("ct_callback_queue").update({
    is_completed: true,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", callbackId);
}

export async function updateCallbackQueueEntry(
  callbackId: number,
  updates: { scheduledTime?: Date; priority?: "low" | "medium" | "high"; notes?: string }
): Promise<void> {
  const patch: any = { updated_at: new Date().toISOString() };
  if (updates.scheduledTime) patch.scheduled_time = updates.scheduledTime.toISOString();
  if (updates.priority) patch.priority = updates.priority;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  await getDb().from("ct_callback_queue").update(patch).eq("id", callbackId);
}

// ── STATISTICS ────────────────────────────────────────────────────────────────

export async function getAgentDailyStats(
  agentId: number,
  startDate: string,
  endDate: string
): Promise<DailyStatistics[]> {
  const { data } = await getDb()
    .from("ct_daily_statistics")
    .select("*")
    .eq("agent_id", agentId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  return (data ?? []).map(mapStat);
}

export async function getAllAgentStats(startDate: string, endDate: string): Promise<DailyStatistics[]> {
  const { data } = await getDb()
    .from("ct_daily_statistics")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  return (data ?? []).map(mapStat);
}

export async function getTotalCallsCount(agentId?: number): Promise<number> {
  let q = getDb().from("ct_call_logs").select("id", { count: "exact", head: true });
  if (agentId !== undefined) q = q.eq("agent_id", agentId);
  const { count } = await q;
  return count ?? 0;
}
