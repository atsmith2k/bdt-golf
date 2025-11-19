"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = getSupabaseClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage("Password reset instructions sent. Check your inbox.");
      }
    } catch (resetException) {
      setError("Unexpected error while requesting a reset link.");
      console.error(resetException);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <RefreshCcw className="h-5 w-5 text-bdt-soft" />
          Reset password
        </CardTitle>
        <p className="mt-2 text-sm text-bdt-soft">
          Enter your username and we will email a reset link. If you do not have
          an email on file, contact the commissioner.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <label className="flex flex-col gap-2 text-sm font-medium text-bdt-navy">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-[rgb(var(--bdt-royal) / 0.22)] bg-white/95 px-3 py-2 text-sm text-bdt-navy shadow-[0_10px_22px_rgb(var(--bdt-navy) / 0.08)] focus:border-[rgb(var(--bdt-royal))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--bdt-royal) / 0.35)] focus:ring-offset-1"
            required
          />
        </label>
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-bdt-red">{error}</p> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </Button>
        <p className="text-center text-sm text-bdt-soft">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-bdt-navy">
            Back to sign in
          </Link>
        </p>
      </CardContent>
      </Card>
    </form>
  );
}
