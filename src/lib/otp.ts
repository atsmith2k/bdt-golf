import { randomBytes, randomInt } from "node:crypto";

export function generateTemporaryPassword(length = 24) {
  const bytes = Math.ceil((length * 3) / 4);
  return randomBytes(bytes).toString("base64url").slice(0, length);
}

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0").toUpperCase();
}

