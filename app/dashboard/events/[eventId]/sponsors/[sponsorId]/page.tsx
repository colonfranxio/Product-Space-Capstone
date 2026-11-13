import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { publicReportPath } from "@/lib/contract";
import { loadSponsorView } from "@/lib/viewer";
import { ReportRenderer } from "@/app/report/report-renderer";
import { CopyLink, EditSponsor } from "../../../sponsor-controls";

type Props = {
  params: Promise<{ eventId: string; sponsorId: string }>;
  searchParams: Promise<{ preview?: string | string[] }>;
};

export default function ViewerPage(props: Props) {
  return <Suspense fallback={<div className="page text-muted">Loading report…</div>}><Viewer {...props} /></Suspense>;
}

async function Viewer({ params, searchParams }: Props) {
  const [{ eventId, sponsorId }, query] = await Promise.all([params, searchParams]);
  const view = await loadSponsorView(eventId, sponsorId, query.preview === "draft");
  if (!view) notFound();
  const { event, sponsor, report, draft } = view;
  const base = `/dashboard/events/${event.id}/sponsors/${sponsor.id}`;
  const publicPath = sponsor.slug ? publicReportPath(event.slug, sponsor.slug) : null;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 flex-wrap px-4 py-2.5 bg-panel border-b border-line">
        <Link href={`/dashboard/events/${event.id}`} className="admin-back">← Sponsors</Link>
        <span className="font-semibold text-[15px] break-words">{report.sponsor.name || "Untitled sponsor"}</span>
        <span className={`sponsor-status ${draft ? "status-edits" : "status-published"}`}>{draft ? "Draft — not public" : "Published"}</span>
        {!draft && sponsor.status === "published_with_edits" && <span className="text-[13px] text-muted">Showing the live version. Your newer edits are not public yet.</span>}
        {draft && sponsor.status !== "draft" && <span className="text-[13px] text-muted">Previewing your saved draft. The public page has not changed.</span>}
        <div className="ml-auto flex items-start gap-2 flex-wrap">
          {!draft && publicPath && <>
            <Link href={publicPath} target="_blank" rel="noopener noreferrer" className="btn-ghost">Open public link</Link>
            <CopyLink path={publicPath} />
          </>}
          {draft && sponsor.status !== "draft" && <Link href={base} className="btn-ghost">View live version</Link>}
          <EditSponsor href={`${base}/edit`} status={sponsor.status} name={sponsor.name} />
        </div>
      </div>
      <div className="flex-1 p-[clamp(12px,3vw,32px)] flex justify-center">
        <div className="w-full max-w-[1180px] rounded-lg overflow-hidden border border-line">
          <ReportRenderer report={report} />
        </div>
      </div>
    </div>
  );
}
