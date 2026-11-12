import Link from "next/link";
import { Suspense } from "react";
import { getOrganization, listEvents, listSponsors } from "@/lib/data";
import { formatDate, plural } from "@/lib/format";
import { mediaUrl } from "@/lib/report";
import { OrgSetup } from "./org-setup";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="page text-muted">Loading…</div>}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const org = await getOrganization();
  if (!org) return <OrgSetup />;
  const events = await listEvents();
  // ponytail: one sponsors query per event; add sponsors(count) to listEvents if the grid gets big.
  const counts = await Promise.all(events.map((e) => listSponsors(e.id).then((s) => s.length)));

  return (
    <div className="page">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-7">
        <div>
          <div className="text-[13px] text-muted">{org.name}</div>
          <h1 className="h1 mt-1">Events</h1>
        </div>
        <Link href="/dashboard/events/new" className="btn">Add event</Link>
      </div>
      {events.length === 0 ? (
        <div className="border border-dashed border-line-dash rounded-[10px] p-10 text-center text-muted text-sm">
          No events yet. Add your first one to start thanking sponsors.
        </div>
      ) : (
        <div className="grid gap-[18px] grid-cols-[repeat(auto-fill,minmax(250px,1fr))]">
          {events.map((e, i) => (
            <Link key={e.id} href={`/dashboard/events/${e.id}`} className="card overflow-hidden no-underline hover:border-[#6a6d73]">
              {e.coverImagePath
                ? <img src={mediaUrl(e.coverImagePath)} alt="" className="block w-full aspect-video object-cover" />
                : <div className="striped aspect-video">event cover</div>}
              <div className="px-4 pt-3.5 pb-4">
                <div className="font-semibold text-base">{e.title}</div>
                <div className="text-[13px] text-muted mt-1">{[formatDate(e.date), plural(counts[i], "sponsor")].filter(Boolean).join(" · ")}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
