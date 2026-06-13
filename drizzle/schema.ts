import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Agents and admins are stored here with role-based access control.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // Optional for local auth
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["agent", "admin"]).default("agent").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Phone numbers assigned to agents or campaigns.
 * Tracks which agent owns/manages each phone number.
 */
export const phoneNumbers = mysqlTable("phone_numbers", {
  id: int("id").autoincrement().primaryKey(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull().unique(),
  agentId: int("agentId").notNull(),
  campaign: varchar("campaign", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PhoneNumber = typeof phoneNumbers.$inferSelect;
export type InsertPhoneNumber = typeof phoneNumbers.$inferInsert;

/**
 * Call logs - records of all incoming and outgoing calls.
 * Agents log calls with caller info, duration, notes, and outcome.
 */
export const callLogs = mysqlTable("call_logs", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  callType: mysqlEnum("callType", ["incoming", "outgoing"]).notNull(),
  callerName: varchar("callerName", { length: 255 }),
  callerPhone: varchar("callerPhone", { length: 20 }).notNull(),
  duration: int("duration").notNull(), // Duration in seconds
  notes: text("notes"),
  outcome: mysqlEnum("outcome", ["completed", "voicemail", "callback_scheduled", "no_answer", "busy", "other"]).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;

/**
 * Callback queue - tracks callbacks that need to be made.
 * Agents can add callers to the queue with scheduled time and priority.
 */
export const callbackQueue = mysqlTable("callback_queue", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  callerName: varchar("callerName", { length: 255 }).notNull(),
  callerPhone: varchar("callerPhone", { length: 20 }).notNull(),
  scheduledTime: timestamp("scheduledTime").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  notes: text("notes"),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CallbackQueueEntry = typeof callbackQueue.$inferSelect;
export type InsertCallbackQueueEntry = typeof callbackQueue.$inferInsert;

/**
 * Daily statistics - aggregated call metrics per agent per day.
 * Used for performance tracking and dashboard displays.
 */
export const dailyStatistics = mysqlTable("daily_statistics", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  totalCalls: int("totalCalls").default(0).notNull(),
  incomingCalls: int("incomingCalls").default(0).notNull(),
  outgoingCalls: int("outgoingCalls").default(0).notNull(),
  totalDuration: int("totalDuration").default(0).notNull(), // in seconds
  completedCallbacks: int("completedCallbacks").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyStatistics = typeof dailyStatistics.$inferSelect;
export type InsertDailyStatistics = typeof dailyStatistics.$inferInsert;
