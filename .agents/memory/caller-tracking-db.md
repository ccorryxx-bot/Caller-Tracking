---
name: Caller Tracking DB
description: Supabase DB details for the Caller Tracking app
---

Supabase project: vuywhhmwrqykukcemifd ("Final MyWeb//")
Tables: ct_users, ct_phone_numbers, ct_call_logs, ct_callback_queue, ct_daily_statistics

Columns added via Supabase management API (not Drizzle):
- ct_phone_numbers.called_count (INTEGER DEFAULT 0)
- ct_phone_numbers.last_called_at (TIMESTAMPTZ)
- ct_call_logs.phone_number_id (INTEGER FK → ct_phone_numbers.id, nullable)

**Why:** Project uses Supabase directly via @supabase/supabase-js service role, not Drizzle/lib/db. No DATABASE_URL needed.

**How to apply:** Schema changes go through Supabase management API: POST https://api.supabase.com/v1/projects/vuywhhmwrqykukcemifd/database/query with Authorization: Bearer $SUPABASE_PERSONAL_TOKEN
