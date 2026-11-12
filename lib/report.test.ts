import { describe, expect, it } from "vitest";
import { DEFAULT_PALETTE, EMPTY_SPONSOR_CONTENT, slugify, isValidSlug, type EventRecord } from "./contract";
import { resolveReport } from "./report";

const event: EventRecord = {
  id: "e1", organizationId: "o1", title: "Berkeley Open", slug: "berkeley-open", date: null, description: null,
  coverImagePath: null, logoPath: null, brandColors: { ...DEFAULT_PALETTE, primary: "#ff0000" },
  metrics: [{ id: "m1", label: "Attendees", value: "500" }, { id: "m2", label: "Teams", value: "40" }],
  defaultCta: { enabled: true, heading: "See you next year", body: "", buttonLabel: "Renew", url: "https://x.test" },
  createdAt: "", updatedAt: "",
};
const doc = (t: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: t }] }] });

describe("resolveReport", () => {
  it("forces no event metric, uses event colors, hides empty parts", () => {
    const r = resolveReport(event, { name: "Cafe", logoPath: null, templateKey: "impact-classic", draftContent: EMPTY_SPONSOR_CONTENT }, (p) => `u/${p}`);
    expect(r.metrics).toEqual([]);
    expect(r.palette.primary).toBe("#ff0000");
    expect(r.images).toEqual({});
    expect(r.cta?.url).toBe("https://x.test");
  });

  it("merges selected event metrics + sponsor metrics, drops blank text, applies CTA override", () => {
    const r = resolveReport(event, {
      name: "Cafe", logoPath: "o1/e1/logo.png", templateKey: "impact-classic",
      draftContent: {
        ...EMPTY_SPONSOR_CONTENT,
        palette: { source: "manual", colors: DEFAULT_PALETTE },
        eventMetricIds: ["m2"],
        metrics: [{ id: "s1", label: "Coffees", value: "300" }],
        text: { headline: doc("Thanks!"), closing: doc("   ") },
        ctaOverride: { ...event.defaultCta, enabled: false },
      },
    }, (p) => `u/${p}`);
    expect(r.metrics.map((m) => m.id)).toEqual(["m2", "s1"]);
    expect(r.palette).toEqual(DEFAULT_PALETTE);
    expect(Object.keys(r.text)).toEqual(["headline"]);
    expect(r.sponsor.logoUrl).toBe("u/o1/e1/logo.png");
    expect(r.cta).toBeNull();
  });
});

describe("slugs", () => {
  it("slugifies names", () => {
    expect(slugify("  Café Olé & Sons!! ")).toBe("cafe-ole-sons");
    expect(isValidSlug("local-restaurant")).toBe(true);
    expect(isValidSlug("Bad Slug")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});
