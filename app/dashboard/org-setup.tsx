"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createOrganization, updateOrganization } from "@/app/actions";
import type { Palette } from "@/lib/contract";
import { checkImage, uploadMedia } from "@/lib/upload";
import { ImagePick } from "./image-pick";
import { Swatches } from "./swatches";

export function OrgSetup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<{ file: File; preview: string } | null>(null);
  const [colors, setColors] = useState<Palette>({ primary: "#23486b", accent: "#c58b2a", background: "#f7f4ec", text: "#1a1a1a" });
  const [error, setError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);

  function pickLogo(file: File) {
    const bad = checkImage(file);
    setLogoError(bad ?? "");
    if (!bad) setLogo({ file, preview: URL.createObjectURL(file) });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (created) return router.refresh(); // org exists; logo failed and the user chose to continue
    setBusy(true);
    const res = await createOrganization({ name, brandColors: colors });
    if (!res.ok) { setBusy(false); return setError(res.fieldErrors?.name ?? res.error); }
    // Uploads must live under <orgId>/, so the logo can only go up once the org exists.
    if (logo) {
      const up = await uploadMedia(logo.file, res.data.id);
      const saved = "path" in up ? await updateOrganization({ logoPath: up.path }) : null;
      const msg = "error" in up ? up.error : saved && !saved.ok ? saved.error : "";
      if (msg) {
        setBusy(false);
        setCreated(true);
        return setLogoError(`Your organization is set up, but the logo didn't save (${msg}). You can continue without it.`);
      }
    }
    router.refresh();
  }

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-[440px] flex flex-col gap-5">
        <div className="font-mono text-xs font-medium text-muted">Set up · takes a minute</div>
        <h1 className="font-serif text-[32px] leading-[1.1] m-0">Tell us about your organization</h1>
        <div>
          <label className="label" htmlFor="org-name">Organization name</label>
          <input className="input" id="org-name" required value={name} disabled={created} onChange={(e) => setName(e.target.value)} />
          {error && <p className="err" role="alert">{error}</p>}
        </div>
        <ImagePick label="Logo · optional" src={logo?.preview ?? null} onFile={pickLogo} onRemove={created ? undefined : () => setLogo(null)}
          error={logoError} imgClass="w-24 h-24 object-contain p-2" />
        <div>
          <span className="label">Default brand colors · optional</span>
          <Swatches value={colors} onChange={setColors} />
          <p className="text-[13px] text-muted mt-2 mb-0">New events start with these.</p>
        </div>
        <button className="btn self-start" disabled={busy || !name.trim()}>{created ? "Continue" : "Create workspace and continue"}</button>
      </form>
    </div>
  );
}
