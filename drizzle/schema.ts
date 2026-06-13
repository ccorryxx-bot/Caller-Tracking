// Plain TypeScript types — DB is Supabase (PostgreSQL)
// Tables: ct_users, ct_phone_numbers, ct_call_logs, ct_callback_queue, ct_daily_statistics

export type User = {
  id: number;
  openId: string | null;
  username: string;
  passwordHash: string;
  name: string | null;
  email: string | null;
  role: "agent" | "admin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date | null;
};

export type InsertUser = {
  username: string;
  passwordHash: string;
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  role?: "agent" | "admin";
  isActive?: boolean;
  lastSignedIn?: Date | null;
};

export type PhoneNumber = {
  id: number;
  phoneNumber: string;
  agentId: number;
  campaign: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CallLog = {
  id: number;
  agentId: number;
  callType: "incoming" | "outgoing";
  callerName: string | null;
  callerPhone: string;
  duration: number;
  notes: string | null;
  outcome: "completed" | "voicemail" | "callback_scheduled" | "no_answer" | "busy" | "other";
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CallbackQueueEntry = {
  id: number;
  agentId: number;
  callerName: string;
  callerPhone: string;
  scheduledTime: Date;
  priority: "low" | "medium" | "high";
  notes: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DailyStatistics = {
  id: number;
  agentId: number;
  date: string;
  totalCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  totalDuration: number;
  completedCallbacks: number;
  createdAt: Date;
  updatedAt: Date;
};
