// Server-side reads + row→contract mappers. Import only from Server Components / Server Actions.
import type { EventRecord, OrganizationRecord, ResolvedReport, SponsorRecord, SponsorStatus } from "./contract";
import { createClient } from "./supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase rows; mapped to contract types here */
export const toOrg = (r: any): OrganizationRecord => ({ id: r.id, name: r.name, logoPath: r.logo_path, brandColors: r.brand_colors });

export const toEvent = (r: any): EventRecord => ({
  id: r.id, organizationId: r.organization_id, title: r.title, slug: r.slug, date: r.date, description: r.description,
  coverImagePath: r.cover_image_path, logoPath: r.logo_path, brandColors: r.brand_colors, metrics: r.metrics,
  defaultCta: r.default_cta, createdAt: r.created_at, updatedAt: r.updated_at,
});

export function sponsorStatus(r: { published_version: number; published_at: string | null; draft_updated_at: string }): SponsorStatus {
  if (r.published_version === 0 || !r.published_at) return "draft";
  return new Date(r.draft_updated_at) > new Date(r.published_at) ? "published_with_edits" : "published";
}

export const toSponsor = (r: any): SponsorRecord => ({
  id: r.id, eventId: r.event_id, name: r.name, slug: r.slug, logoPath: r.logo_path, templateKey: r.template_key,
  draftContent: r.draft_content, draftUpdatedAt: r.draft_updated_at, publishedAt: r.published_at,
  publishedVersion: r.published_version, status: sponsorStatus(r),
});
/* eslint-enable @typescript-eslint/no-explicit-any */

const SPONSOR_COLS = "id,event_id,name,slug,logo_path,template_key,draft_content,draft_updated_at,published_at,published_version";

/** The signed-in admin's organization, or null (→ show org setup). RLS scopes every query below to it. */
export async function getOrganization(): Promise<OrganizationRecord | null> {
  const { data } = await (await createClient()).from("organizations").select().maybeSingle();
  return data && toOrg(data);
}

export async function listEvents(): Promise<EventRecord[]> {
  const { data, error } = await (await createClient()).from("events").select().order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toEvent);
}

export async function getEvent(eventId: string): Promise<EventRecord | null> {
  const { data } = await (await createClient()).from("events").select().eq("id", eventId).maybeSingle();
  return data && toEvent(data);
}

export async function listSponsors(eventId: string): Promise<SponsorRecord[]> {
  const { data, error } = await (await createClient())
    .from("sponsors").select(SPONSOR_COLS).eq("event_id", eventId).order("created_at");
  if (error) throw error;
  return data.map(toSponsor);
}

export async function getSponsor(sponsorId: string): Promise<SponsorRecord | null> {
  const { data } = await (await createClient()).from("sponsors").select(SPONSOR_COLS).eq("id", sponsorId).maybeSingle();
  return data && toSponsor(data);
}

/** Public page loader for `/[eventSlug]/[sponsorSlug]`. Returns the frozen snapshot or null (→ notFound()). */
export async function getPublishedReport(eventSlug: string, sponsorSlug: string): Promise<ResolvedReport | null> {
  const { data, error } = await (await createClient())
    .rpc("get_published_report", { event_slug: eventSlug, sponsor_slug: sponsorSlug });
  if (error) throw error;
  return (data as ResolvedReport | null) ?? null;
}
