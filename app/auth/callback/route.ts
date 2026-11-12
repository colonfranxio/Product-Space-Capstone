import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing route for the signup confirmation email (and any other Supabase email link).
 * The frontend's signUp must pass `options.emailRedirectTo: `${location.origin}/auth/callback``.
 * Supabase verifies the link, redirects here with `?code=`, and we swap it for a session cookie.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  // Only same-site paths, so the link can't be used as an open redirect.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
