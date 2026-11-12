import { notFound } from "next/navigation";
import { getPublishedReport } from "@/lib/data";
import { ReportRenderer } from "@/app/report/report-renderer";

/** Public URLs read only the frozen snapshot, regardless of query strings or admin session. */
export default async function PublicReportPage({ params }: {
  params: Promise<{ eventSlug: string; sponsorSlug: string }>;
}) {
  const { eventSlug, sponsorSlug } = await params;
  const report = await getPublishedReport(eventSlug, sponsorSlug);
  if (!report) notFound();
  return <ReportRenderer report={report} />;
}
