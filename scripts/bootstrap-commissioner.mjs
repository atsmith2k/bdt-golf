#!/usr/bin/env node
/**
 * Bootstrap a commissioner user with a pending OTP in Supabase.
 *
 * Required environment variables:
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - SEED_EMAIL
 *  - SEED_USERNAME
 *  - SEED_FULL_NAME
 *
 * Optional overrides:
 *  - SEED_TEMP_PASSWORD (defaults to a random 24 character string)
 *  - SEED_OTP_CODE (defaults to a random 6 character code)
 *  - SEED_ROLE (defaults to "commissioner")
 *  - SEED_EXPIRES_IN_HOURS (defaults to 48)
 *
 * Usage:
 *   SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." \
 *   SEED_EMAIL="you@example.com" SEED_USERNAME="you" SEED_FULL_NAME="Your Name" \
 *   node scripts/bootstrap-commissioner.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomInt } from "node:crypto";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const SUPABASE_URL = required("SUPABASE_URL");
const SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");
const SEED_EMAIL = required("SEED_EMAIL").toLowerCase();
const SEED_USERNAME = required("SEED_USERNAME");
const SEED_FULL_NAME = required("SEED_FULL_NAME");

const SEED_ROLE = process.env.SEED_ROLE ?? "commissioner";
const TEMP_PASSWORD =
  process.env.SEED_TEMP_PASSWORD ??
  randomBytes(16).toString("base64url");
const OTP_CODE =
  process.env.SEED_OTP_CODE ??
  String(randomInt(0, 999999)).padStart(6, "0").toUpperCase();
const EXPIRES_IN_HOURS = Number(process.env.SEED_EXPIRES_IN_HOURS ?? 48);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log("→ Bootstrapping commissioner account…");

  const expiresAt = new Date(Date.now() + EXPIRES_IN_HOURS * 60 * 60 * 1000);

  // 1. Create (or fetch) the auth user
  const { data: createUserData, error: createUserError } =
    await supabase.auth.admin.createUser({
      email: SEED_EMAIL,
      email_confirm: true,
      password: TEMP_PASSWORD,
      user_metadata: {
        full_name: SEED_FULL_NAME,
        username: SEED_USERNAME,
      },
    });

  if (createUserError && createUserError.status !== 422) {
    throw createUserError;
  }

  let authUserId = createUserData?.user?.id ?? null;

  if (!authUserId) {
    // user likely exists already, fetch by email
    const { data: existingUser, error: lookupError } =
      await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 200,
        email: SEED_EMAIL,
      });

    if (lookupError) {
      throw lookupError;
    }

    authUserId =
      existingUser.users.find((user) => user.email?.toLowerCase() === SEED_EMAIL)
        ?.id ?? null;
  }

  if (!authUserId) {
    throw new Error("Unable to resolve auth user id for seeded commissioner.");
  }

  console.log(`   Auth user id: ${authUserId}`);

  // 2. Upsert into public.users
  const { error: upsertProfileError } = await supabase
    .from("users")
    .upsert(
      {
        id: authUserId,
        username: SEED_USERNAME,
        display_name: SEED_FULL_NAME,
        email: SEED_EMAIL,
        role: SEED_ROLE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (upsertProfileError) {
    throw upsertProfileError;
  }

  console.log("   User profile upserted.");

  // 3. Insert pending OTP
  const { error: otpInsertError } = await supabase
    .from("one_time_passwords")
    .insert({
      user_id: authUserId,
      username: SEED_USERNAME,
      email: SEED_EMAIL,
      otp: OTP_CODE,
      expires_at: expiresAt.toISOString(),
      created_by: authUserId,
    });

  if (otpInsertError) {
    throw otpInsertError;
  }

  console.log("   OTP issued.");
  console.log("✓ Done!");
  console.log("");
  console.log("Credentials summary");
  console.log("-------------------");
  console.log(`Email:      ${SEED_EMAIL}`);
  console.log(`Username:   ${SEED_USERNAME}`);
  console.log(`Full name:  ${SEED_FULL_NAME}`);
  console.log(`Role:       ${SEED_ROLE}`);
  console.log(`Temp pwd:   ${TEMP_PASSWORD}`);
  console.log(`OTP code:   ${OTP_CODE}`);
  console.log(`OTP expires ${expiresAt.toISOString()}`);
}

main().catch((error) => {
  console.error("✗ Failed to bootstrap commissioner account.");
  console.error(error);
  process.exit(1);
});

