"use client";
import Link from "next/link";
import { useEffect } from "react";

/** Catch-all for unexpected failures (lost connection, Supabase down). */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="page max-w-[440px] mx-auto text-center">
      <h1 className="h1">Something went wrong</h1>
      <p className="text-muted">Your saved work is safe. Check your connection and try again.</p>
      <div className="flex gap-2 justify-center">
        <button type="button" className="btn" onClick={() => retry()}>Try again</button>
        <Link href="/dashboard" className="btn-ghost">Go to events</Link>
      </div>
    </div>
  );
}
