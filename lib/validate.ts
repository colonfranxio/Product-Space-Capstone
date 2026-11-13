import {
  FONT_FAMILIES, FONT_SIZES, IMAGE_SLOT_IDS, TEMPLATE_KEYS, TEXT_ALIGNS, TEXT_BLOCK_IDS,
  type Cta, type Metric, type Palette, type SponsorContent,
} from "./contract";

// Hand-rolled validators for the contract shapes. Each returns field errors keyed by path; empty = valid.
type Errors = Record<string, string>;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const has = <T extends readonly unknown[]>(list: T, v: unknown): v is T[number] => list.includes(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export const isHex = (v: unknown): boolean => isStr(v) && /^#[0-9a-f]{6}$/.test(v);

export function isHttpsUrl(v: unknown): boolean {
  if (!isStr(v)) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !!u.hostname;
  } catch {
    return false;
  }
}

export function validatePalette(p: unknown, at: string, e: Errors = {}): Errors {
  if (!isObj(p)) e[at] = "Invalid palette";
  else for (const k of ["primary", "accent", "background", "text"] as const) if (!isHex(p[k])) e[`${at}.${k}`] = "Use a #rrggbb color";
  return e;
}

/** Walks Tiptap JSON and rejects any node, mark or attribute outside the contract allowlist. */
export function validateRichText(doc: unknown, at: string, e: Errors = {}): Errors {
  const bad = () => (e[at] = "Unsupported formatting");
  if (!isObj(doc) || doc.type !== "doc" || !Array.isArray(doc.content)) return bad(), e;
  for (const b of doc.content) {
    if (!isObj(b)) return bad(), e;
    const a = b.attrs ?? {};
    if (!isObj(a)) return bad(), e;
    if (b.type === "heading") { if (!has([1, 2, 3] as const, a.level)) return bad(), e; }
    else if (b.type !== "paragraph") return bad(), e;
    if (a.textAlign != null && !has(TEXT_ALIGNS, a.textAlign)) return bad(), e;
    if (b.content === undefined) continue;
    if (!Array.isArray(b.content)) return bad(), e;
    for (const i of b.content) {
      if (!isObj(i)) return bad(), e;
      if (i.type === "hardBreak") continue;
      if (i.type !== "text" || !isStr(i.text)) return bad(), e;
      if (i.marks === undefined) continue;
      if (!Array.isArray(i.marks)) return bad(), e;
      for (const m of i.marks) {
        if (!isObj(m)) return bad(), e;
        if (has(["bold", "italic", "underline"] as const, m.type)) continue;
        if (m.type !== "textStyle" || !isObj(m.attrs)) return bad(), e;
        const { color, fontFamily, fontSize } = m.attrs;
        if ((color != null && !isHex(color)) || (fontFamily != null && !has(FONT_FAMILIES, fontFamily)) || (fontSize != null && !has(FONT_SIZES, fontSize)))
          return bad(), e;
      }
    }
  }
  return e;
}

export function validateMetrics(v: unknown, at: string, e: Errors = {}): Errors {
  if (!Array.isArray(v)) e[at] = "Invalid metrics";
  else v.forEach((m: Partial<Metric>, i) => {
    if (!isObj(m) || !isStr(m.id) || !isStr(m.label) || !isStr(m.value) || (m.context != null && !isStr(m.context)))
      e[`${at}.${i}`] = "Invalid metric";
  });
  return e;
}

/** `strict` (publish time) requires an https URL when the CTA is enabled; drafts may be half-typed. */
export function validateCta(v: unknown, at: string, strict: boolean, e: Errors = {}): Errors {
  const c = v as Partial<Cta>;
  if (!isObj(c) || typeof c.enabled !== "boolean" || ![c.heading, c.body, c.buttonLabel, c.url].every(isStr)) e[at] = "Invalid CTA";
  else if (strict && c.enabled && !isHttpsUrl(c.url)) e[`${at}.url`] = "Paste a full link that starts with https://";
  return e;
}

export function validateSponsorContent(v: unknown, strict: boolean, e: Errors = {}): Errors {
  const c = v as Partial<SponsorContent>;
  if (!isObj(c) || c.version !== 1) return (e.draftContent = "Invalid content"), e;

  if (!isObj(c.palette) || !has(["event", "logo", "manual"] as const, c.palette.source)) e["palette"] = "Invalid palette";
  else validatePalette(c.palette.colors, "palette.colors", e);

  if (!isObj(c.images)) e.images = "Invalid images";
  else for (const [k, img] of Object.entries(c.images)) {
    const ok = has(IMAGE_SLOT_IDS, k) && isObj(img) && isStr(img.path) && isStr(img.alt)
      && (img.caption == null || isStr(img.caption))
      && isObj(img.crop) && isNum(img.crop.x) && isNum(img.crop.y) && isNum(img.zoom)
      && isObj(img.area) && [img.area.x, img.area.y, img.area.width, img.area.height].every(isNum);
    if (!ok) e[`images.${k}`] = "Invalid image";
  }

  if (!isObj(c.text)) e.text = "Invalid text";
  else for (const [k, doc] of Object.entries(c.text)) {
    if (!has(TEXT_BLOCK_IDS, k)) e[`text.${k}`] = "Unknown text block";
    else validateRichText(doc, `text.${k}`, e);
  }

  validateMetrics(c.metrics, "metrics", e);
  if (!Array.isArray(c.eventMetricIds) || !c.eventMetricIds.every(isStr)) e.eventMetricIds = "Invalid metric selection";
  if (c.ctaOverride !== null) validateCta(c.ctaOverride, "cta", strict, e);
  return e;
}

export const isTemplateKey = (v: unknown) => has(TEMPLATE_KEYS, v);
export const isPalette = (v: unknown): v is Palette => Object.keys(validatePalette(v, "p")).length === 0;
