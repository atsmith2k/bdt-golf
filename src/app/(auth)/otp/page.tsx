"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";
import { normalizeIdentifierForAuth } from "@/lib/auth/normalize";

export default function RedeemOtpPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  // Accept either username or email as identifier
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Normalization is centralized in src/lib/auth/normalize.ts

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const cleanedIdentifier = normalizeIdentifierForAuth(identifier);
      const cleanedOtp = otp.trim().toUpperCase();
      const cleanedPassword = password.trim();

      // Pass identifier as "identifier" (could be username or email)
      const { data, error: invokeError } = await supabase.functions.invoke("redeem-otp", {
        body: {
          identifier: cleanedIdentifier,
          otp: cleanedOtp,
          password: cleanedPassword,
        },
      });

      if (invokeError) {
        setError(invokeError.message ?? "Unable to redeem OTP. Ensure the edge function exists.");
        return;
      }

      if (data?.success) {
        setMessage("OTP redeemed. You can now sign in with your new password.");
        router.push("/login");
        router.refresh();
      } else {
        setError("OTP redemption did not return success. Check Supabase function implementation.");
      }
    } catch (redeemException) {
      console.error(redeemException);
      setError("Unexpected error while redeeming OTP.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <KeyRound className="h-5 w-5 text-bdt-soft" />
          Redeem OTP
        </CardTitle>
        <p className="mt-2 text-sm text-bdt-soft">
          Paste the one-time password your commissioner sent to activate your
          account. You will set a permanent password below.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <label className="flex flex-col gap-2 text-sm font-medium text-bdt-navy">
          Email or username
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="w-full rounded-lg border border-[rgb(var(--bdt-royal) / 0.22)] bg-white/95 px-3 py-2 text-sm text-bdt-navy shadow-[0_10px_22px_rgb(var(--bdt-navy) / 0.08)] focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)] focus:ring-offset-1"
            placeholder="email or username"
            autoComplete="username"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-bdt-navy">
          One-time password
          <input
        value={otp}
        onChange={(event) => setOtp(event.target.value.toUpperCase())}
        className="w-full rounded-lg border border-[rgb(var(--bdt-royal) / 0.22)] bg-white/95 px-3 py-2 text-sm text-bdt-navy uppercase tracking-widest shadow-[0_10px_22px_rgb(var(--bdt-navy) / 0.08)] focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)] focus:ring-offset-1"
        placeholder="XXXXXX"
        required
      />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-bdt-navy">
          Set new password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-[rgb(var(--bdt-royal) / 0.22)] bg-white/95 px-3 py-2 text-sm text-bdt-navy shadow-[0_10px_22px_rgb(var(--bdt-navy) / 0.08)] focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)] focus:ring-offset-1"
            required
          />
        </label>
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-bdt-red">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Activating..." : "Activate account"}
        </Button>
        <p className="text-center text-sm text-bdt-soft">
          Already activated?{" "}
          <Link href="/login" className="font-medium text-bdt-navy">
            Back to sign in
          </Link>
        </p>
      </CardContent>
      </Card>
    </form>
  );
}
