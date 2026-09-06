"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { resolveOperatorLogin } from "@/lib/auth";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.",
      );
      return;
    }
    setPending(true);
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: resolveOperatorLogin(email),
      password,
    });
    setPending(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.push(nextPath);
    router.refresh();
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f7f6f3] px-4 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 ring-1 ring-stone-200">
        <p className="text-[11px] font-medium tracking-[0.2em] text-teal-800 uppercase">
          Project planning
        </p>
        <h1 className="mt-2 font-heading text-3xl tracking-tight text-stone-900">
          Control studio
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Sign in to edit the shared hospital plan. The display page stays
          public.
        </p>
        <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="email">Email or name</Label>
            <Input
              id="email"
              className="mt-1 h-10"
              type="text"
              autoComplete="username"
              placeholder="Ahmed or Yahya"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              className="mt-1 h-10"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="h-10" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
