import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SUPABASE_SERVICE_ROLE = process.env["SERVICE_ROLE"];

if (!SUPABASE_URL) throw new Error("SUPABASE_URL env var is required");
if (!SUPABASE_SERVICE_ROLE) throw new Error("SERVICE_ROLE env var is required");

export function getDb() {
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE!);
}

export type Outcome = "interested" | "will_buy" | "phone_off" | "no_answer" | "hung_up";

export interface DbUser {
  id: number;
  username: string;
  password_hash: string;
  name: string | null;
  email: string | null;
  role: "agent" | "admin";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbPhoneNumber {
  id: number;
  phone_number: string;
  agent_id: number;
  campaign: string | null;
  is_active: boolean;
  called_count: number;
  last_called_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCallLog {
  id: number;
  agent_id: number;
  phone_number_id: number | null;
  caller_phone: string;
  outcome: string;
  notes: string | null;
  recorded_at: string;
  created_at: string;
}
