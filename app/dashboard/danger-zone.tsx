"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteEvent, deleteSponsor } from "@/app/actions";

type Kind = "event" | "sponsor";

const COPY = {
  event: "This deletes the event and every sponsor in it. Their public pages stop working.",
  sponsor: "This deletes the sponsor. If it's published, its public page stops working.",
};

/** Shared delete flow: `asking` is the double check; nothing is deleted until `run()`. */
function useDelete(kind: Kind, id: string, after: string) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    setBusy(true);
    setError("");
    const res = await (kind === "event" ? deleteEvent(id) : deleteSponsor(id))
      .catch(() => ({ ok: false as const, error: "Couldn't delete. Check your connection and try again." }));
    if (!res.ok) { setError(res.error); setBusy(false); return; }
    router.replace(after);
    router.refresh();
  }
  return { asking, setAsking, busy, error, run };
}

/** Event page: boxed "Danger Zone!" with a two-step delete. */
export function DangerZone({ kind, id, after }: { kind: Kind; id: string; after: string }) {
  const d = useDelete(kind, id, after);
  return (
    <section className="border border-err rounded-[10px] p-4 flex flex-col gap-2.5" aria-label="Danger zone">
      <div className="font-mono text-xs font-medium uppercase text-err">Danger Zone!</div>
      {!d.asking ? (
        <>
          <p className="text-[13px] text-muted m-0">Made this {kind} by mistake? Deleting can&apos;t be undone.</p>
          <button type="button" className="btn-ghost self-start border-err! text-err!" onClick={() => d.setAsking(true)}>Delete {kind}</button>
        </>
      ) : (
        <>
          <p className="text-sm m-0" role="alert"><strong>Are you sure?</strong> {COPY[kind]} This can&apos;t be undone.</p>
          <div className="flex gap-2 flex-wrap">
            <button type="button" className="btn bg-err! border-err!" disabled={d.busy} onClick={d.run}>{d.busy ? "Deleting…" : "Yes, delete permanently"}</button>
            <button type="button" className="btn-ghost" disabled={d.busy} onClick={() => d.setAsking(false)}>Cancel</button>
          </div>
        </>
      )}
      {d.error && <p className="err" role="alert">{d.error}</p>}
    </section>
  );
}

/** Compact top-bar version: "Delete" turns into an inline "…for good?" confirm. */
export function DeleteButton({ kind, id, after }: { kind: Kind; id: string; after: string }) {
  const d = useDelete(kind, id, after);
  if (!d.asking) {
    return <button type="button" className="btn-ghost text-[13px]! border-err! text-err!" onClick={() => d.setAsking(true)}>Delete</button>;
  }
  return (
    <span className="flex items-center gap-2 flex-wrap" role="alert">
      <span className="text-[13px]" title={COPY[kind]}>{d.error ? <span className="text-err">{d.error}</span> : `Delete this ${kind} for good?`}</span>
      <button type="button" className="btn text-[13px]! bg-err! border-err!" disabled={d.busy} onClick={d.run}>{d.busy ? "Deleting…" : "Yes, delete"}</button>
      <button type="button" className="btn-ghost text-[13px]!" disabled={d.busy} onClick={() => d.setAsking(false)}>Cancel</button>
    </span>
  );
}
