"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { createSponsor } from "@/app/actions";
import type { SponsorStatus } from "@/lib/contract";

export function AddSponsor({ eventId }: { eventId: string }) {
  const router = useRouter();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await createSponsor(eventId);
      if (!result.ok) { setError(result.error); return; }
      router.push(`/dashboard/events/${eventId}/sponsors/${result.data.id}/edit`);
      router.refresh();
    } catch {
      setError("Couldn't add the sponsor. Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn" onClick={add} disabled={busy}>{busy ? "Adding…" : "Add sponsor"}</button>
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}

export function EditSponsor({ href, status, name, pencil = false }: {
  href: string; status: SponsorStatus; name: string; pencil?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const className = pencil ? "sponsor-pencil" : "btn";
  const label = pencil ? `Edit ${name || "untitled sponsor"} page` : undefined;
  const contents = pencil ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" /><path d="m13 6 5 5" />
    </svg>
  ) : "Edit";

  if (status !== "published") return <Link href={href} className={className} aria-label={label}>{contents}</Link>;
  return (
    <>
      <button type="button" className={className} aria-label={label} onClick={() => dialog.current?.showModal()}>{contents}</button>
      <dialog ref={dialog} className="edit-confirm" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <h2 id={titleId} className="text-xl font-semibold mt-0 mb-3">Edit this published page?</h2>
        <p id={descriptionId} className="text-sm text-muted leading-normal mt-0 mb-6">
          Your changes stay in a draft. The current public page stays live until you republish.
        </p>
        <div className="flex justify-end gap-2 flex-wrap">
          <form method="dialog"><button className="btn-ghost">Cancel</button></form>
          <Link href={href} className="btn" onClick={() => dialog.current?.close()}>Continue editing</Link>
        </div>
      </dialog>
    </>
  );
}

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function copy() {
    setCopied(false);
    setError("");
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      setCopied(true);
    } catch {
      setError("Couldn't copy the link. Open the public page and copy its address.");
    }
  }

  return (
    <div>
      <button type="button" className="btn-ghost" onClick={copy} aria-live="polite">{copied ? "Copied" : "Copy link"}</button>
      {error && <p className="err max-w-64" role="alert">{error}</p>}
    </div>
  );
}
