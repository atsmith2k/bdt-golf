# Auth & Onboarding

This document captures how access to the BDT Golf League app works and how to onboard members safely. It aligns with section 5 of the implementation plan.

## Overview

- The app is private – no public self sign-up.
- Members authenticate through Supabase using email + password.
- First-time access is granted via single-use one-time passwords (OTPs) that commissioners issue manually.
- Supabase Row Level Security (RLS) policies should restrict application data to authenticated users.

## OTP Onboarding Flow

1. **Commissioner issues invite**
   - Run `node scripts/bootstrap-commissioner.mjs` to seed the initial commissioner account (or use a Supabase SQL script for additional members).
   - Each invite inserts a row into `public.one_time_passwords` with a 6 character code and expiry timestamp.
2. **Member redeems OTP**
   - The `/otp` route collects `username`, `otp`, and the desired permanent password.
   - The frontend calls the Supabase Edge Function `redeem-otp` (`supabase/functions/redeem-otp/index.ts`).
3. **Edge function validation**
   - Confirms the username exists and has an outstanding OTP matching the submitted code.
   - Rejects expired or already consumed codes.
   - Uses the Supabase Admin client to set the new password and mark the OTP as consumed.
4. **Member signs in**
   - The member visits `/login` and uses username/email + the new password.
   - On success, the middleware redirects them into `/app`.

### Expiration & reuse safeguards

- Invites default to a 48 hour expiration (configurable via `SEED_EXPIRES_IN_HOURS` in the bootstrap script).
- When an OTP is redeemed, `consumed_at` is set to the current timestamp to prevent reuse.
- Commissioners can safely re-issue a new OTP by inserting a fresh row; the Edge Function only honours non-consumed tokens.

## Supabase Configuration Checklist

- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
- Deploy the `redeem-otp` edge function with `supabase functions deploy redeem-otp`.
- Store `SUPABASE_SERVICE_ROLE_KEY` as an environment secret for the edge function so it can call the Admin API.
- Ensure RLS policies on `users`, `one_time_passwords`, and related tables enforce authenticated-only access, with commissioner exceptions for invite management.

## Troubleshooting

- **OTP not found** – Verify the username matches the invite exactly (edge function performs case-insensitive match) and the code is still active.
- **Password set but OTP remains active** – Check the function logs; if marking the OTP as consumed fails, manually update `consumed_at` and redeploy the function.
- **Immediate redirect back to login** – Confirm Supabase cookies are present and `NEXT_PUBLIC_SUPABASE_*` env vars match the project being used.

## References

- Implementation plan (§5 Auth + Onboarding Flow)
- `scripts/bootstrap-commissioner.mjs`
- Supabase Edge Function `redeem-otp`
- README “Auth smoke test” section for QA walkthrough
