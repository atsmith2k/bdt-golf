"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function RedeemOtpPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const cleanedUsername = username.trim();
      const cleanedOtp = otp.trim();

      const { data, error: invokeError } = await supabase.functions.invoke("redeem-otp", {
        body: {
          username: cleanedUsername,
          otp: cleanedOtp,
          password,
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
          <KeyRound className="h-5 w-5 text-slate-500" />
          Redeem OTP
        </CardTitle>
        <p className="mt-2 text-sm text-slate-500">
          Paste the one-time password your commissioner sent to activate your
          account. You will set a permanent password below.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          One-time password
          <input
        value={otp}
        onChange={(event) => setOtp(event.target.value.toUpperCase())}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm uppercase tracking-widest shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
        placeholder="XXXXXX"
        required
      />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Set new password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
            required
          />
        </label>
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Activating..." : "Activate account"}
        </Button>
        <p className="text-center text-sm text-slate-500">
          Already activated?{" "}
          <Link href="/login" className="font-medium text-slate-900">
            Back to sign in
          </Link>
        </p>
      </CardContent>
      </Card>
    </form>
  );
}
