# Bootstrap Commissioner Data

This document walks through loading the Supabase schema and seeding an initial commissioner account with a pending OTP.

## 1. Apply the database schema

Open the Supabase SQL editor (or use the Supabase CLI) and run the contents of [`db/schema.sql`](../db/schema.sql). The script creates:

- Enum types for roles, match status/format/visibility, and timeline events.
- Tables for seasons, teams, users, matches, match participants, announcements, timeline events, and one-time passwords.
- Timestamp triggers so `updated_at` stays in sync.
- Convenience views for roster counts and match points by team.

> Tip: the schema uses `gen_random_uuid()`; ensure the `pgcrypto` extension is enabled (the script handles it).

## 2. Prepare environment variables

The seeding script requires a Supabase **service role** key plus the commissioner’s details:

```bash
export SUPABASE_URL="https://YOURPROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
export SEED_EMAIL="commissioner@example.com"
export SEED_USERNAME="commissioner"
export SEED_FULL_NAME="League Commissioner"

# Optional overrides
export SEED_TEMP_PASSWORD="temporary-password"     # defaults to random 24 chars
export SEED_OTP_CODE="ABC123"                      # defaults to random 6 chars
export SEED_ROLE="commissioner"                    # leave as-is unless seeding players
export SEED_EXPIRES_IN_HOURS="48"                  # OTP expiry window
```

> ⚠️ Never expose the service role key in client-side code. Use it only in trusted scripts or server environments.

## 3. Run the bootstrap script

After setting the environment variables, execute:

```bash
node scripts/bootstrap-commissioner.mjs
```

The script will:

1. Create (or fetch) the auth user via `auth.admin.createUser`.
2. Upsert the league profile into `public.users`.
3. Insert a row into `public.one_time_passwords` with a pending OTP.

Successful output lists the generated temporary password and OTP. Store them securely; the commissioner will redeem the OTP through the UI to set a permanent password.

If you rerun the script for the same email, it will reuse the existing auth user and simply upsert the profile / OTP.

## 4. Next steps

- Wire the `/otp` redemption flow to a Supabase Edge Function that verifies the OTP, marks it consumed, and sets the user’s real password.
- Grant the commissioner access to create seasons, teams, and users via the web UI once RLS policies are in place.
- Repeat the script (changing the seed variables) to load additional league members or to pre-issue OTP codes ahead of a draft.

