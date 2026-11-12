import { getEvent, getPublishedReport, getSponsor } from "./data";
import { resolveReport } from "./report";

/** Admin-only viewing: normal links show live content; the editor explicitly requests a saved draft. */
export async function loadSponsorView(eventId: string, sponsorId: string, previewDraft = false) {
  const [event, sponsor] = await Promise.all([getEvent(eventId), getSponsor(sponsorId)]);
  if (!event || !sponsor || sponsor.eventId !== event.id) return null;
  const draft = previewDraft || sponsor.status === "draft";
  const report = draft
    ? resolveReport(event, sponsor)
    : sponsor.slug ? await getPublishedReport(event.slug, sponsor.slug) : null;
  return report ? { event, sponsor, report, draft } : null;
}
