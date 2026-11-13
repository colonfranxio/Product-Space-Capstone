"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteEvent, deleteSponsor } from "@/app/actions";

const COPY = {
  event: "This deletes the event and every sponsor in it. Their public pages stop working.",
  sponsor: "This deletes the sponsor. If it's published, its public page stops working.",
};

/** Two-step delete: the first click only asks; nothing is deleted until "Yes, delete permanently". */
export function DangerZone({ kind, id, after }: { kind: "event" | "sponsor"; id: string; after: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    const res = await (kind === "event" ? deleteEvent(id) : deleteSponsor(id))
      .catch(() => ({ ok: false as const, error: "Couldn't delete. Check your connection and try again." }));
    if (!res.ok) { setError(res.error); setBusy(false); return; }
    router.replace(after);
    router.refresh();
  }

  return (
    <section className="border border-err rounded-[10px] p-4 flex flex-col gap-2.5" aria-label="Danger zone">
      <div className="font-mono text-xs font-medium uppercase text-err">Danger Zone!</div>
      {!asking ? (
        <>
          <p className="text-[13px] text-muted m-0">Made this {kind} by mistake? Deleting can&apos;t be undone.</p>
          <button type="button" className="btn-ghost self-start border-err! text-err!" onClick={() => setAsking(true)}>Delete {kind}</button>
        </>
      ) : (
        <>
          <p className="text-sm m-0" role="alert"><strong>Are you sure?</strong> {COPY[kind]} This can&apos;t be undone.</p>
          <div className="flex gap-2 flex-wrap">
            <button type="button" className="btn bg-err! border-err!" disabled={busy} onClick={confirm}>{busy ? "Deleting…" : "Yes, delete permanently"}</button>
            <button type="button" className="btn-ghost" disabled={busy} onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </section>
  );
}
