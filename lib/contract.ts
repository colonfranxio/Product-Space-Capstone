/**
 * SponsorStory shared contract — the single source of truth both the frontend and backend build against.
 * Changing anything here is a contract change: do it in its own small PR and tell the other agent.
 *
 * Layers:
 *   1. Primitives (colors, rich text, images, metrics, CTA)
 *   2. Stored content (EventRecord, SponsorRecord, SponsorContent) — what lives in Postgres
 *   3. ResolvedReport — what the renderer consumes (draft preview AND published snapshot)
 *   4. Template definitions — fixed slots per template
 *   5. Server action signatures — the save/publish API
 */

// ───────────────────────────── 1. Primitives ─────────────────────────────

/** `#rrggbb`, lowercase. Validated server-side. */
export type Hex = `#${string}`;

export interface Palette {
  primary: Hex;
  accent: Hex;
  background: Hex;
  text: Hex;
}

export const DEFAULT_PALETTE: Palette = {
  primary: "#1f2a44",
  accent: "#e0a526",
  background: "#ffffff",
  text: "#1a1a1a",
};

// Rich text = Tiptap JSON restricted to this allowlist. The backend rejects anything else on save/publish.
// Tiptap extensions to enable: Document, Paragraph, Heading(levels 1-3), Text, HardBreak, Bold, Italic,
// Underline, TextStyle, Color, FontFamily, FontSize, TextAlign(types: heading, paragraph).

export const FONT_FAMILIES = ["Inter", "Playfair Display", "Lora", "Montserrat", "Space Grotesk"] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number];

export const FONT_SIZES = ["14px", "16px", "18px", "20px", "24px", "32px", "40px", "56px"] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const TEXT_ALIGNS = ["left", "center", "right"] as const;
export type TextAlign = (typeof TEXT_ALIGNS)[number];

export type RichTextMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | {
      type: "textStyle";
      attrs: { color?: Hex | null; fontFamily?: FontFamily | null; fontSize?: FontSize | null };
    };

export type RichTextInline =
  | { type: "text"; text: string; marks?: RichTextMark[] }
  | { type: "hardBreak" };

export type RichTextBlock =
  | { type: "paragraph"; attrs?: { textAlign?: TextAlign | null }; content?: RichTextInline[] }
  | { type: "heading"; attrs: { level: 1 | 2 | 3; textAlign?: TextAlign | null }; content?: RichTextInline[] };

export interface RichTextDoc {
  type: "doc";
  content: RichTextBlock[];
}

/** An uploaded image placed in a template slot. Crop values come straight from react-easy-crop. */
export interface PlacedImage {
  /** Supabase Storage path inside the `media` bucket, e.g. `<orgId>/<eventId>/<uuid>.webp`. */
  path: string;
  alt: string;
  /** Optional short caption (plain text), shown in "proof in pictures". */
  caption?: string;
  /** Editor state, so re-opening the cropper restores the framing. */
  crop: { x: number; y: number };
  zoom: number;
  /** react-easy-crop `croppedArea` (percentages 0–100). The renderer uses this to frame the image. */
  area: { x: number; y: number; width: number; height: number };
}

/** Organizer-supplied number. `value` is a string so "1,200", "$5k", "3rd" all work. Never computed. */
export interface Metric {
  id: string; // client-generated uuid
  label: string;
  value: string;
  context?: string;
}

export interface Cta {
  enabled: boolean;
  heading: string;
  body: string;
  buttonLabel: string;
  /** Must be https:// when enabled. */
  url: string;
}

// ───────────────────────────── 2. Stored content ─────────────────────────────

/** Semantic slot IDs are shared across templates so switching template keeps the sponsor's data. */
export const IMAGE_SLOT_IDS = ["hero", "proof_primary", "proof_secondary", "event_moment"] as const;
export type ImageSlotId = (typeof IMAGE_SLOT_IDS)[number];

export const TEXT_BLOCK_IDS = ["headline", "thank_you", "narrative", "proof_description", "closing"] as const;
export type TextBlockId = (typeof TEXT_BLOCK_IDS)[number];

/** `sponsors.draft_content` (jsonb). Everything the wizard edits besides name/logo/template/slug. */
export interface SponsorContent {
  version: 1;
  /** source "event" → event.brandColors are used at resolve time (colors ignored), so event edits flow into drafts. */
  palette: { source: "event" | "logo" | "manual"; colors: Palette };
  images: Partial<Record<ImageSlotId, PlacedImage>>;
  /** Missing or empty block = hidden. The editor seeds the template's default copy here when a block is first shown. */
  text: Partial<Record<TextBlockId, RichTextDoc>>;
  /** Sponsor-specific metrics. */
  metrics: Metric[];
  /** IDs of event metrics the organizer chose to show. Nothing is shown by default. */
  eventMetricIds: string[];
  /** null = use the event's default CTA. */
  ctaOverride: Cta | null;
}

export const EMPTY_SPONSOR_CONTENT: SponsorContent = {
  version: 1,
  palette: { source: "event", colors: DEFAULT_PALETTE },
  images: {},
  text: {},
  metrics: [],
  eventMetricIds: [],
  ctaOverride: null,
};

export interface OrganizationRecord {
  id: string;
  name: string;
  logoPath: string | null;
  brandColors: Palette | null;
}

export interface EventRecord {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  date: string | null; // ISO date `YYYY-MM-DD`
  description: string | null;
  coverImagePath: string | null;
  logoPath: string | null;
  brandColors: Palette;
  metrics: Metric[];
  defaultCta: Cta;
  createdAt: string;
  updatedAt: string;
}

export type SponsorStatus = "draft" | "published" | "published_with_edits";

export interface SponsorRecord {
  id: string;
  eventId: string;
  name: string; // may be "" while drafting; required to publish
  slug: string | null; // suggested from name; locked after first publish
  logoPath: string | null;
  templateKey: TemplateKey;
  draftContent: SponsorContent;
  draftUpdatedAt: string;
  publishedAt: string | null;
  publishedVersion: number; // 0 = never published
  status: SponsorStatus; // derived server-side
}

// ───────────────────────────── 3. Renderer input ─────────────────────────────

/**
 * Everything the report renderer needs, fully resolved (event defaults merged, image paths → URLs).
 * Draft preview: built live from current records. Published page: the frozen snapshot stored at publish time.
 * The SAME renderer component renders both.
 */
export interface ResolvedReport {
  templateKey: TemplateKey;
  event: { title: string; date: string | null; logoUrl: string | null; coverUrl: string | null };
  sponsor: { name: string; logoUrl: string | null };
  palette: Palette;
  images: Partial<Record<ImageSlotId, PlacedImage & { url: string }>>;
  text: Partial<Record<TextBlockId, RichTextDoc>>;
  /** Selected event metrics first, then sponsor metrics. Empty array → hide the impact section. */
  metrics: Metric[];
  /** null → hide the CTA section. */
  cta: Cta | null;
}

// ───────────────────────────── 4. Templates ─────────────────────────────

export const TEMPLATE_KEYS = ["impact-classic"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export interface TemplateDefinition {
  key: TemplateKey;
  name: string;
  description: string;
  /** Slots in wizard order. Slots not listed here are kept in data but not rendered by this template. */
  imageSlots: { id: ImageSlotId; label: string; help: string; aspect: number; required: false }[];
  textBlocks: { id: TextBlockId; label: string; help: string }[];
}

/** Labels/aspects only. Default copy and visual design are the frontend's call. */
export const TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  "impact-classic": {
    key: "impact-classic",
    name: "Impact Classic",
    description: "Scroll-driven story: hero, thank-you, impact numbers, proof in pictures, closing, renewal CTA.",
    imageSlots: [
      { id: "hero", label: "Hero photo", help: "Your strongest event photo.", aspect: 16 / 9, required: false },
      { id: "proof_primary", label: "Sponsor visibility", help: "Their logo on a banner, poster, or booth.", aspect: 4 / 3, required: false },
      { id: "proof_secondary", label: "More proof", help: "Another photo showing their presence.", aspect: 4 / 3, required: false },
      { id: "event_moment", label: "Event moment", help: "A great moment their support made possible.", aspect: 3 / 2, required: false },
    ],
    textBlocks: [
      { id: "headline", label: "Headline", help: "The big personalized line at the top." },
      { id: "thank_you", label: "Thank-you note", help: "A short, personal message to this sponsor." },
      { id: "narrative", label: "Event story", help: "What happened at the event." },
      { id: "proof_description", label: "Their visibility", help: "Describe where and how they were featured." },
      { id: "closing", label: "Closing message", help: "A final note of appreciation." },
    ],
  },
};

// ───────────────────────────── 5. Server actions ─────────────────────────────
// Implemented by the backend in `app/actions/*.ts` ("use server"). The frontend imports and calls them.
// All require a signed-in admin and enforce organization ownership server-side.

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export interface EventInput {
  title: string;
  date?: string | null;
  description?: string | null;
  coverImagePath?: string | null;
  logoPath?: string | null;
  brandColors?: Palette;
  metrics?: Metric[];
  defaultCta?: Cta;
}

export interface SponsorDraftInput {
  name: string;
  logoPath: string | null;
  templateKey: TemplateKey;
  draftContent: SponsorContent;
}

export interface Actions {
  /** First sign-in: creates the admin's organization. */
  createOrganization(input: { name: string; logoPath?: string | null; brandColors?: Palette | null }): Promise<Result<OrganizationRecord>>;
  createEvent(input: EventInput): Promise<Result<EventRecord>>;
  updateEvent(eventId: string, input: Partial<EventInput>): Promise<Result<EventRecord>>;
  /** Creates an empty draft sponsor; the frontend then navigates to its editor. */
  createSponsor(eventId: string): Promise<Result<SponsorRecord>>;
  /** Persists the draft. Never touches the published snapshot. */
  saveSponsorDraft(sponsorId: string, input: SponsorDraftInput): Promise<Result<{ draftUpdatedAt: string }>>;
  /** Fails with error "taken" | "invalid" | "reserved" | "locked" (already published). */
  setSponsorSlug(sponsorId: string, slug: string): Promise<Result<{ slug: string; url: string }>>;
  /** Validates, then atomically replaces the public snapshot. fieldErrors lists what blocks publishing. */
  publishSponsor(sponsorId: string): Promise<Result<{ url: string; publishedVersion: number; publishedAt: string }>>;
}

/** Uploads go straight from the browser to Storage (RLS-checked): bucket `media`, path `<orgId>/<eventId>/<uuid>.<ext>`. */
export const MEDIA_BUCKET = "media";
export const MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const MEDIA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// ───────────────────────────── Slugs ─────────────────────────────

/** Top-level paths owned by the app; event slugs can't use them. */
export const RESERVED_SLUGS = ["login", "logout", "signup", "dashboard", "api", "auth", "_next", "public", "static", "favicon.ico", "robots.txt", "sitemap.xml"] as const;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 60;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SLUG_MAX && SLUG_PATTERN.test(slug);
}

export function publicReportPath(eventSlug: string, sponsorSlug: string): string {
  return `/${eventSlug}/${sponsorSlug}`;
}
