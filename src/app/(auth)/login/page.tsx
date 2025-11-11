"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanedIdentifier = identifier.trim();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanedIdentifier,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/app");
      router.refresh();
    } catch (signInException) {
      setError("Unexpected error while signing in. Please try again.");
      console.error(signInException);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <LogIn className="h-5 w-5 text-slate-500" />
          Sign in
        </CardTitle>
        <p className="mt-2 text-sm text-slate-500">
          Use your league-issued username and password. First-time users should
          sign in with the temporary OTP.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Email or username
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
              placeholder="you@example.com"
              autoComplete="username"
              required
            />
          </label>
        </div>
        <div className="space-y-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Password or one-time code
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/30"
              autoComplete="current-password"
              required
            />
          </label>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Continue"}
        </Button>
        <div className="flex flex-col gap-2 text-sm text-slate-500">
          <Link href="/otp" className="hover:text-slate-900">
            First time? Redeem your OTP invite {"->"}
          </Link>
          <Link href="/reset-password" className="hover:text-slate-900">
            Forgot password {"->"}
          </Link>
        </div>
      </CardContent>
      </Card>
    </form>
  );
}
