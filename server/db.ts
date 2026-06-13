import { eq, and, desc, gte, lte, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, phoneNumbers, callLogs, callbackQueue, dailyStatistics } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      username: user.username,
      passwordHash: user.passwordHash,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else {
      values.role = "agent";
    }

    if (user.isActive !== undefined) {
      values.isActive = user.isActive;
      updateSet.isActive = user.isActive;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllAgents() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get agents: database not available");
    return [];
  }

  return await db.select().from(users).where(eq(users.role, "agent"));
}

export async function createAgent(username: string, passwordHash: string, name: string, email?: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create agent: database not available");
    return undefined;
  }

  const result = await db.insert(users).values({
    username,
    passwordHash,
    name,
    email: email || null,
    role: "agent",
    isActive: true,
  });

  return result;
}

export async function updateAgent(agentId: number, updates: { name?: string; email?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update agent: database not available");
    return undefined;
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

  if (Object.keys(updateData).length === 0) return undefined;

  return await db.update(users).set(updateData).where(eq(users.id, agentId));
}

export async function deactivateAgent(agentId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot deactivate agent: database not available");
    return undefined;
  }

  return await db.update(users).set({ isActive: false }).where(eq(users.id, agentId));
}

// ============================================================================
// PHONE NUMBER MANAGEMENT
// ============================================================================

export async function assignPhoneNumber(phoneNumber: string, agentId: number, campaign?: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot assign phone number: database not available");
    return undefined;
  }

  return await db.insert(phoneNumbers).values({
    phoneNumber,
    agentId,
    campaign: campaign || null,
    isActive: true,
  });
}

export async function getPhoneNumbersByAgent(agentId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get phone numbers: database not available");
    return [];
  }

  return await db.select().from(phoneNumbers).where(eq(phoneNumbers.agentId, agentId));
}

export async function getAllPhoneNumbers() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get phone numbers: database not available");
    return [];
  }

  return await db.select().from(phoneNumbers);
}

export async function updatePhoneNumber(phoneNumberId: number, updates: { campaign?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update phone number: database not available");
    return undefined;
  }

  const updateData: Record<string, unknown> = {};
  if (updates.campaign !== undefined) updateData.campaign = updates.campaign;
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

  if (Object.keys(updateData).length === 0) return undefined;

  return await db.update(phoneNumbers).set(updateData).where(eq(phoneNumbers.id, phoneNumberId));
}

// ============================================================================
// CALL LOG MANAGEMENT
// ============================================================================

export async function createCallLog(agentId: number, callType: "incoming" | "outgoing", callerPhone: string, duration: number, outcome: string, callerName?: string, notes?: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create call log: database not available");
    return undefined;
  }

  return await db.insert(callLogs).values({
    agentId,
    callType,
    callerName: callerName || null,
    callerPhone,
    duration,
    notes: notes || null,
    outcome: outcome as any,
    recordedAt: new Date(),
  });
}

export async function getCallLogsByAgent(agentId: number, limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get call logs: database not available");
    return [];
  }

  return await db.select().from(callLogs).where(eq(callLogs.agentId, agentId)).orderBy(desc(callLogs.recordedAt)).limit(limit).offset(offset);
}

export async function getAllCallLogs(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get call logs: database not available");
    return [];
  }

  return await db.select().from(callLogs).orderBy(desc(callLogs.recordedAt)).limit(limit).offset(offset);
}

export async function getTotalCallsCount(agentId?: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get call count: database not available");
    return 0;
  }

  const query = agentId ? db.select().from(callLogs).where(eq(callLogs.agentId, agentId)) : db.select().from(callLogs);
  const result = await query;
  return result.length;
}

// ============================================================================
// CALLBACK QUEUE MANAGEMENT
// ============================================================================

export async function createCallbackQueueEntry(agentId: number, callerName: string, callerPhone: string, scheduledTime: Date, priority: "low" | "medium" | "high", notes?: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create callback entry: database not available");
    return undefined;
  }

  return await db.insert(callbackQueue).values({
    agentId,
    callerName,
    callerPhone,
    scheduledTime,
    priority,
    notes: notes || null,
    isCompleted: false,
  });
}

export async function getCallbackQueueByAgent(agentId: number, includeCompleted = false) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get callback queue: database not available");
    return [];
  }

  const conditions = [eq(callbackQueue.agentId, agentId)];
  if (!includeCompleted) {
    conditions.push(eq(callbackQueue.isCompleted, false));
  }

  return await db.select().from(callbackQueue).where(and(...conditions)).orderBy(callbackQueue.scheduledTime);
}

export async function getAllCallbackQueue(includeCompleted = false) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get callback queue: database not available");
    return [];
  }

  const query = includeCompleted ? db.select().from(callbackQueue) : db.select().from(callbackQueue).where(eq(callbackQueue.isCompleted, false));
  return await query.orderBy(callbackQueue.scheduledTime);
}

export async function markCallbackAsCompleted(callbackId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot mark callback as completed: database not available");
    return undefined;
  }

  return await db.update(callbackQueue).set({ isCompleted: true, completedAt: new Date() }).where(eq(callbackQueue.id, callbackId));
}

export async function updateCallbackQueueEntry(callbackId: number, updates: { scheduledTime?: Date; priority?: "low" | "medium" | "high"; notes?: string }) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update callback entry: database not available");
    return undefined;
  }

  const updateData: Record<string, unknown> = {};
  if (updates.scheduledTime !== undefined) updateData.scheduledTime = updates.scheduledTime;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  if (Object.keys(updateData).length === 0) return undefined;

  return await db.update(callbackQueue).set(updateData).where(eq(callbackQueue.id, callbackId));
}

// ============================================================================
// STATISTICS MANAGEMENT
// ============================================================================

export async function getDailyStatistics(agentId: number, date: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get daily statistics: database not available");
    return undefined;
  }

  const result = await db.select().from(dailyStatistics).where(and(eq(dailyStatistics.agentId, agentId), eq(dailyStatistics.date, date))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateDailyStatistics(agentId: number, date: string, updates: Record<string, number>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update daily statistics: database not available");
    return undefined;
  }

  const existing = await getDailyStatistics(agentId, date);

  if (existing) {
    return await db.update(dailyStatistics).set(updates).where(and(eq(dailyStatistics.agentId, agentId), eq(dailyStatistics.date, date)));
  } else {
    return await db.insert(dailyStatistics).values({
      agentId,
      date,
      ...updates,
    });
  }
}

export async function getAgentDailyStats(agentId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get agent stats: database not available");
    return [];
  }

  return await db.select().from(dailyStatistics).where(and(eq(dailyStatistics.agentId, agentId), gte(dailyStatistics.date, startDate), lte(dailyStatistics.date, endDate))).orderBy(dailyStatistics.date);
}

export async function getAllAgentStats(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get all stats: database not available");
    return [];
  }

  return await db.select().from(dailyStatistics).where(and(gte(dailyStatistics.date, startDate), lte(dailyStatistics.date, endDate))).orderBy(dailyStatistics.date);
}
