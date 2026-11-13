import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEvent, getSponsor } from "@/lib/data";
import { Editor } from "./editor";

type Params = Promise<{ eventId: string; sponsorId: string }>;

export default function EditSponsorPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="page text-muted">Loading…</div>}>
      <Load params={params} />
    </Suspense>
  );
}

async function Load({ params }: { params: Params }) {
  const { eventId, sponsorId } = await params;
  const [event, sponsor] = await Promise.all([getEvent(eventId), getSponsor(sponsorId)]);
  if (!event || !sponsor || sponsor.eventId !== event.id) notFound();
  const host = (await headers()).get("host") ?? "";
  return <Editor event={event} sponsor={sponsor} host={host} />;
}
