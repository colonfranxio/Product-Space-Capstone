import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getEvent, getOrganization } from "@/lib/data";
import { EventForm } from "../../event-form";

type Params = Promise<{ eventId: string }>;

export default function EditEventPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<div className="page text-muted">Loading…</div>}>
      <Load params={params} />
    </Suspense>
  );
}

async function Load({ params }: { params: Params }) {
  const { eventId } = await params;
  const [org, event] = await Promise.all([getOrganization(), getEvent(eventId)]);
  if (!org) redirect("/dashboard");
  if (!event) notFound();
  const host = (await headers()).get("host") ?? "";
  return <EventForm org={org} host={host} colors={event.brandColors} event={event} />;
}
