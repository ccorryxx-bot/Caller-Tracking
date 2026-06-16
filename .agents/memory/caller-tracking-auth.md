---
name: Caller Tracking auth
description: Auth implementation details for the Caller Tracking app
---

Password hashing uses Node.js built-in `crypto.createHash("sha256")`, NOT bcrypt.
Cookie name: `ct_session`, HTTP-only, 30-day, JWT signed with JWT_SECRET env var.
Admin password: admin123 → SHA256 = 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
KyawG agent password: agent123 (was reset from unknown value)

**Why:** Supabase doesn't expose bcrypt; SHA256 is simpler for a single-tenant tool. Keep consistent if adding more agents.

**How to apply:** When creating agents via admin API or directly in DB, hash the password with SHA256 before storing in password_hash column.
