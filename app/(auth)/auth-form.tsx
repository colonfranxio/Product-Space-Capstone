"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Email + password form shared by /login and /signup. */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(
    params.get("error") === "confirm" ? "That confirmation link didn't work or has expired. Sign in, or sign up again for a new link." : "",
  );
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    setBusy(true);
    setError("");
    const auth = createClient().auth;
    const { data, error } = mode === "login"
      ? await auth.signInWithPassword({ email, password })
      : await auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setBusy(false);
    if (error) return setError(error.message);
    if (!data.session) return setSentTo(email); // signup with email confirmation on
    const next = params.get("next");
    router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    router.refresh();
  }

  if (sentTo) return (
    <>
      <h1 className="font-serif text-[34px] leading-[1.1] m-0">Check your inbox</h1>
      <p className="text-[15px] leading-normal m-0">
        We sent a confirmation link to <strong>{sentTo}</strong>. Open it on this device to finish setting up.
      </p>
      <p className="text-[13px] text-muted m-0">No email after a few minutes? Check spam, or <button type="button" onClick={() => setSentTo("")} className="underline text-ink bg-transparent border-0 p-0 cursor-pointer">try again</button>.</p>
    </>
  );

  return (
    <form onSubmit={submit} className="contents">
      <h1 className="font-serif text-[34px] leading-[1.1] m-0 text-balance">
        {mode === "login" ? "Thank every sponsor like they were the only one." : "Create your account"}
      </h1>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" placeholder="you@studentorg.edu" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" required minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••••" />
      </div>
      {error && <p className="err m-0" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{mode === "login" ? "Sign in" : "Create account"}</button>
      {mode === "login"
        ? <Link href="/signup" className="btn-ghost">First time here? Set up your organization</Link>
        : <Link href="/login" className="btn-ghost">Already have an account? Sign in</Link>}
      <p className="text-[13px] leading-normal text-muted m-0">One administrator account per organization for now.</p>
    </form>
  );
}
