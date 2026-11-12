import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { textOn } from "@/lib/color";
import { getEvent, listSponsors } from "@/lib/data";
import { formatDate, plural } from "@/lib/format";
import { mediaUrl } from "@/lib/report";
import { AddSponsor, EditSponsor } from "../sponsor-controls";

type Params = Promise<{ eventId: string }>;

export default function SponsorsPage({ params }: { params: Params }) {
  return <Suspense fallback={<div className="page text-muted">Loading sponsors…</div>}><Sponsors params={params} /></Suspense>;
}

async function Sponsors({ params }: { params: Params }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();
  const sponsors = await listSponsors(event.id);
  const base = `/dashboard/events/${event.id}`;
  const published = sponsors.filter((s) => s.status !== "draft").length;

  return (
    <div className="page">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-7">
        <div className="min-w-0">
          <Link href="/dashboard" className="admin-back">← Events</Link>
          <h1 className="h1 mt-1.5 break-words">{event.title}</h1>
          <p className="text-[13px] text-muted mt-1 mb-0">{[formatDate(event.date), plural(sponsors.length, "sponsor"), `${published} published`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Link href={`${base}/edit`} className="btn-ghost">Edit event</Link>
          <AddSponsor eventId={event.id} />
        </div>
      </div>
      {sponsors.length === 0 ? (
        <div className="border border-dashed border-line-dash rounded-[10px] px-6 py-14 text-center">
          <h2 className="text-[17px] font-semibold m-0">No sponsors yet</h2>
          <p className="text-sm text-muted mt-2 mb-0 max-w-[30em] mx-auto leading-normal">
            Add your first sponsor and we will walk you through their thank-you page step by step.
          </p>
        </div>
      ) : (
        <div className="grid gap-[18px] grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))]">
          {sponsors.map((sponsor) => {
            const path = `${base}/sponsors/${sponsor.id}`;
            const primary = (sponsor.draftContent.palette.source === "event" ? event.brandColors : sponsor.draftContent.palette.colors).primary;
            const name = sponsor.name.trim() || "Untitled sponsor";
            const initials = sponsor.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
            return (
              <article key={sponsor.id} className="card relative overflow-hidden hover:border-[#6a6d73]">
                <EditSponsor href={`${path}/edit`} status={sponsor.status} name={name} pencil />
                <Link href={path} className="sponsor-card-link block no-underline text-ink">
                  <div className="aspect-[16/10] flex items-center justify-center" style={{ background: primary, color: textOn(primary) }}>
                    {sponsor.logoPath ? <img src={mediaUrl(sponsor.logoPath)} alt="" className="max-w-[60%] h-20 object-contain" /> : (
                      <span className="w-16 h-16 rounded-[14px] bg-[#f7f4ec] text-[#1d1b18] flex items-center justify-center font-serif text-2xl">{initials}</span>
                    )}
                  </div>
                  <div className="px-4 pt-3.5 pb-4 flex flex-col gap-2.5">
                    <div className="font-semibold text-base break-words">{name}</div>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className={`sponsor-status ${sponsor.status === "draft" ? "status-draft" : "status-published"}`}>{sponsor.status === "draft" ? "Draft" : "Published"}</span>
                      {sponsor.status === "published_with_edits" && <span className="sponsor-status status-edits">Unpublished edits</span>}
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
