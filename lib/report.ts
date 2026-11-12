import type { EventRecord, ResolvedReport, RichTextDoc, SponsorRecord, ImageSlotId, TextBlockId } from "./contract";
import { MEDIA_BUCKET } from "./contract";

/** Public URL for a path in the media bucket. */
export function mediaUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

function hasText(doc: RichTextDoc | undefined): doc is RichTextDoc {
  return !!doc?.content?.some((b) => b.content?.some((i) => i.type === "text" && i.text.trim() !== ""));
}

/**
 * Merge event + sponsor draft into what the renderer shows. Pure: used for live preview on the client
 * and, at publish time, to produce the frozen snapshot. Empty optional parts are dropped so the
 * renderer can hide their sections.
 */
export function resolveReport(
  event: EventRecord,
  sponsor: Pick<SponsorRecord, "name" | "logoPath" | "templateKey" | "draftContent">,
  toUrl: (path: string) => string = mediaUrl,
): ResolvedReport {
  const c = sponsor.draftContent;

  const images: ResolvedReport["images"] = {};
  for (const [id, img] of Object.entries(c.images) as [ImageSlotId, NonNullable<(typeof c.images)[ImageSlotId]>][]) {
    if (img?.path) images[id] = { ...img, url: toUrl(img.path) };
  }

  const text: ResolvedReport["text"] = {};
  for (const [id, doc] of Object.entries(c.text) as [TextBlockId, RichTextDoc][]) {
    if (hasText(doc)) text[id] = doc;
  }

  const selected = new Set(c.eventMetricIds);
  const cta = c.ctaOverride ?? event.defaultCta;

  return {
    templateKey: sponsor.templateKey,
    event: {
      title: event.title,
      date: event.date,
      logoUrl: event.logoPath ? toUrl(event.logoPath) : null,
      coverUrl: event.coverImagePath ? toUrl(event.coverImagePath) : null,
    },
    sponsor: { name: sponsor.name, logoUrl: sponsor.logoPath ? toUrl(sponsor.logoPath) : null },
    palette: c.palette.source === "event" ? event.brandColors : c.palette.colors,
    images,
    text,
    metrics: [...event.metrics.filter((m) => selected.has(m.id)), ...c.metrics],
    cta: cta.enabled ? cta : null,
  };
}
