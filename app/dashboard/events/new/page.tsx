import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DEFAULT_PALETTE } from "@/lib/contract";
import { getOrganization } from "@/lib/data";
import { EventForm } from "../event-form";

export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="page text-muted">Loading…</div>}>
      <Load />
    </Suspense>
  );
}

async function Load() {
  const org = await getOrganization();
  if (!org) redirect("/dashboard");
  const host = (await headers()).get("host") ?? "";
  return <EventForm org={org} host={host} colors={org.brandColors ?? DEFAULT_PALETTE} />;
}
