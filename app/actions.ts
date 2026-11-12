"use server";
// Implements `Actions` from lib/contract.ts. Every query runs as the signed-in user, so RLS enforces org ownership.
import { headers } from "next/headers";
import {
  DEFAULT_PALETTE, EMPTY_SPONSOR_CONTENT, RESERVED_SLUGS, isValidSlug, publicReportPath, slugify,
  type Actions, type Cta, type EventInput, type Palette, type SponsorDraftInput,
} from "@/lib/contract";
import { toEvent, toOrg, toSponsor } from "@/lib/data";
import { resolveReport } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";
import { isTemplateKey, validateCta, validateMetrics, validatePalette, validateSponsorContent } from "@/lib/validate";

type R<K extends keyof Actions> = ReturnType<Actions[K]>;
const fail = (error: string, fieldErrors?: Record<string, string>) => ({ ok: false as const, error, ...(fieldErrors && { fieldErrors }) });
const invalid = (fieldErrors: Record<string, string>) => fail("invalid", fieldErrors);
const isEmpty = (o: object) => Object.keys(o).length === 0;

const EMPTY_CTA: Cta = { enabled: false, heading: "", body: "", buttonLabel: "", url: "" };

async function absoluteUrl(path: string) {
  return `${(await headers()).get("origin") ?? ""}${path}`;
}

/** Rejects anyone not signed in. RLS does the per-row ownership check. */
async function authed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? supabase : null;
}

export async function createOrganization(input: { name: string; logoPath?: string | null; brandColors?: Palette | null }): R<"createOrganization"> {
  const db = await authed();
  if (!db) return fail("unauthorized");
  if (!input.name?.trim()) return invalid({ name: "Required" });
  if (input.brandColors) { const e = validatePalette(input.brandColors, "brandColors"); if (!isEmpty(e)) return invalid(e); }
  const { data, error } = await db.from("organizations")
    .insert({ name: input.name.trim(), logo_path: input.logoPath ?? null, brand_colors: input.brandColors ?? null })
    .select().single();
  if (error) return fail(error.code === "23505" ? "Organization already exists" : error.message);
  return { ok: true, data: toOrg(data) };
}

function validateEventInput(i: Partial<EventInput>, creating: boolean) {
  const e: Record<string, string> = {};
  if ((creating || i.title !== undefined) && !i.title?.trim()) e.title = "Required";
  if (i.date != null && !/^\d{4}-\d{2}-\d{2}$/.test(i.date)) e.date = "Use YYYY-MM-DD";
  if (i.brandColors !== undefined) validatePalette(i.brandColors, "brandColors", e);
  if (i.metrics !== undefined) validateMetrics(i.metrics, "metrics", e);
  if (i.defaultCta !== undefined) validateCta(i.defaultCta, "defaultCta", true, e);
  return e;
}

function eventRow(i: Partial<EventInput>) {
  const row: Record<string, unknown> = {};
  if (i.title !== undefined) row.title = i.title.trim();
  if (i.date !== undefined) row.date = i.date;
  if (i.description !== undefined) row.description = i.description;
  if (i.coverImagePath !== undefined) row.cover_image_path = i.coverImagePath;
  if (i.logoPath !== undefined) row.logo_path = i.logoPath;
  if (i.brandColors !== undefined) row.brand_colors = i.brandColors;
  if (i.metrics !== undefined) row.metrics = i.metrics;
  if (i.defaultCta !== undefined) row.default_cta = i.defaultCta;
  return row;
}

export async function createEvent(input: EventInput): R<"createEvent"> {
  const db = await authed();
  if (!db) return fail("unauthorized");
  const e = validateEventInput(input, true);
  if (!isEmpty(e)) return invalid(e);
  const { data: org } = await db.from("organizations").select("id").maybeSingle();
  if (!org) return fail("Create your organization first");

  let base = slugify(input.title).slice(0, 55).replace(/-+$/, "");
  if (!base || (RESERVED_SLUGS as readonly string[]).includes(base)) base = `${base || "event"}-event`.slice(0, 55);
  // Event slugs are global and other orgs' rows are invisible under RLS, so let the unique constraint decide.
  // ponytail: 20 sequential tries; switch to a random suffix if popular titles collide often.
  for (let n = 1; n <= 20; n++) {
    const { data, error } = await db.from("events")
      .insert({
        brand_colors: DEFAULT_PALETTE, default_cta: EMPTY_CTA, ...eventRow(input),
        organization_id: org.id, slug: n === 1 ? base : `${base}-${n}`,
      })
      .select().single();
    if (!error) return { ok: true, data: toEvent(data) };
    if (error.code !== "23505") return fail(error.message);
  }
  return fail("Could not find a free URL for this event title");
}

export async function updateEvent(eventId: string, input: Partial<EventInput>): R<"updateEvent"> {
  const db = await authed();
  if (!db) return fail("unauthorized");
  const e = validateEventInput(input, false);
  if (!isEmpty(e)) return invalid(e);
  const { data, error } = await db.from("events").update(eventRow(input)).eq("id", eventId).select().maybeSingle();
  if (error) return fail(error.message);
  return data ? { ok: true, data: toEvent(data) } : fail("not found");
}

export async function createSponsor(eventId: string): R<"createSponsor"> {
  const db = await authed();
  if (!db) return fail("unauthorized");
  const { data, error } = await db.from("sponsors")
    .insert({ event_id: eventId, draft_content: EMPTY_SPONSOR_CONTENT }).select().single();
  if (error) return fail(error.code === "42501" ? "not found" : error.message); // 42501 = RLS check failed
  return { ok: true, data: toSponsor(data) };
}

export async function saveSponsorDraft(sponsorId: string, input: SponsorDraftInput): R<"saveSponsorDraft"> {
  const db = await authed();
  if (!db) return fail("unauthorized");
  const e = validateSponsorContent(input.draftContent, false);
  if (typeof input.name !== "string") e.name = "Invalid name";
  if (input.logoPath !== null && typeof input.logoPath !== "string") e.logoPath = "Invalid logo";
  if (!isTemplateKey(input.templateKey)) e.templateKey = "Unknown template";
  if (!isEmpty(e)) return invalid(e);
  const { data, error } = await db.from("sponsors")
    .update({ name: input.name, logo_path: input.logoPath, template_key: input.templateKey, draft_content: input.draftContent })
    .eq("id", sponsorId).select("draft_updated_at").maybeSingle();
  if (error) return fail(error.message);
  return data ? { ok: true, data: { draftUpdatedAt: data.draft_updated_at } } : fail("not found");
}

export async function setSponsorSlug(sponsorId: string, slug: string): R<"setSponsorSlug"> {
  const db = await authed();
  if (!db) return fail("unauthorized");
  if (!isValidSlug(slug)) return fail("invalid");
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) return fail("reserved");
  const { data, error } = await db.from("sponsors").update({ slug }).eq("id", sponsorId)
    .select("slug, events(slug)").maybeSingle();
  if (error) return fail(error.code === "23505" ? "taken" : error.hint === "locked" ? "locked" : error.message);
  if (!data) return fail("not found");
  const eventSlug = (data.events as unknown as { slug: string }).slug;
  return { ok: true, data: { slug, url: await absoluteUrl(publicReportPath(eventSlug, slug)) } };
}

export async function publishSponsor(sponsorId: string): R<"publishSponsor"> {
  const db = await authed();
  if (!db) return fail("unauthorized");
  const { data: row } = await db.from("sponsors").select("*, events(*)").eq("id", sponsorId).maybeSingle();
  if (!row) return fail("not found");
  const sponsor = toSponsor(row);
  const event = toEvent(row.events);

  const e = validateSponsorContent(sponsor.draftContent, true);
  if (!sponsor.name.trim()) e.name = "Add the sponsor's name";
  if (!isTemplateKey(sponsor.templateKey)) e.templateKey = "Pick a template";
  if (!sponsor.slug || !isValidSlug(sponsor.slug)) e.slug = "Choose a URL";
  if (!sponsor.draftContent.ctaOverride) validateCta(event.defaultCta, "cta", true, e);
  if (!isEmpty(e)) return fail("Fix these before publishing", e);

  // Atomic swap. Matching the version and draft timestamp we read means a concurrent save/publish
  // makes this a no-op instead of publishing a stale snapshot. Trigger sets published_at.
  const { data, error } = await db.from("sponsors")
    .update({ published_snapshot: resolveReport(event, sponsor), published_version: sponsor.publishedVersion + 1 })
    .eq("id", sponsorId).eq("published_version", sponsor.publishedVersion).eq("draft_updated_at", row.draft_updated_at)
    .select("published_version, published_at").maybeSingle();
  if (error) return fail(error.message);
  if (!data) return fail("The draft changed while publishing. Try again.");
  return {
    ok: true,
    data: {
      url: await absoluteUrl(publicReportPath(event.slug, sponsor.slug!)),
      publishedVersion: data.published_version,
      publishedAt: data.published_at,
    },
  };
}
