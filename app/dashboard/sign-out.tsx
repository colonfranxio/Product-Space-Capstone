"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOut() {
  const router = useRouter();
  return (
    <button
      onClick={async () => { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }}
      className="bg-transparent text-ink border border-line-input rounded px-2.5 py-1.5 font-mono text-xs font-medium cursor-pointer"
    >
      Sign out
    </button>
  );
}
