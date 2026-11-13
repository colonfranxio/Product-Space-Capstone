import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPublishedReport } from "@/lib/data";
import { ReportRenderer } from "@/app/report/report-renderer";

type Props = { params: Promise<{ eventSlug: string; sponsorSlug: string }> };

// Metadata and the page share one snapshot read per request.
const load = cache(getPublishedReport);

/** Gives shared links a real title and preview image instead of the site default. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventSlug, sponsorSlug } = await params;
  const report = await load(eventSlug, sponsorSlug);
  if (!report) return {};
  const title = `Thank you, ${report.sponsor.name} · ${report.event.title}`;
  const image = report.images.hero?.url ?? report.sponsor.logoUrl;
  return { title, openGraph: { title, images: image ? [image] : undefined } };
}

/** Public URLs read only the frozen snapshot, regardless of query strings or admin session. */
export default async function PublicReportPage({ params }: Props) {
  const { eventSlug, sponsorSlug } = await params;
  const report = await load(eventSlug, sponsorSlug);
  if (!report) notFound();
  return <ReportRenderer report={report} />;
}
