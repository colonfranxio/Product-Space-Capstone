"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createOrganization } from "@/app/actions";
import type { Palette } from "@/lib/contract";
import { Swatches } from "./swatches";

// Logo skipped: uploads need the org id, which doesn't exist until this form submits (HANDOFF gap 2).
export function OrgSetup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [colors, setColors] = useState<Palette>({ primary: "#23486b", accent: "#c58b2a", background: "#f7f4ec", text: "#1a1a1a" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await createOrganization({ name, brandColors: colors });
    setBusy(false);
    if (!res.ok) return setError(res.fieldErrors?.name ?? res.error);
    router.refresh();
  }

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-[440px] flex flex-col gap-5">
        <div className="font-mono text-xs font-medium text-muted">Set up · takes a minute</div>
        <h1 className="font-serif text-[32px] leading-[1.1] m-0">Tell us about your organization</h1>
        <div>
          <label className="label" htmlFor="org-name">Organization name</label>
          <input className="input" id="org-name" required value={name} onChange={(e) => setName(e.target.value)} />
          {error && <p className="err" role="alert">{error}</p>}
        </div>
        <div>
          <span className="label">Default brand colors · optional</span>
          <Swatches value={colors} onChange={setColors} />
          <p className="text-[13px] text-muted mt-2 mb-0">New events start with these.</p>
        </div>
        <button className="btn self-start" disabled={busy || !name.trim()}>Create workspace and continue</button>
      </form>
    </div>
  );
}
