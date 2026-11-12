import { beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_PALETTE, EMPTY_SPONSOR_CONTENT, type EventRecord, type SponsorRecord } from "./contract";
import { getEvent, getPublishedReport, getSponsor } from "./data";
import { loadSponsorView } from "./viewer";

vi.mock("./data", () => ({ getEvent: vi.fn(), getSponsor: vi.fn(), getPublishedReport: vi.fn() }));

const event: EventRecord = {
  id: "event-a", organizationId: "org-a", title: "Edited event title", slug: "open", date: null,
  description: null, coverImagePath: null, logoPath: null, brandColors: DEFAULT_PALETTE,
  metrics: [], defaultCta: { enabled: false, heading: "", body: "", buttonLabel: "", url: "" },
  createdAt: "", updatedAt: "",
};
const sponsor: SponsorRecord = {
  id: "sponsor-a", eventId: event.id, name: "Edited sponsor", slug: "cafe", logoPath: null,
  templateKey: "impact-classic", draftContent: EMPTY_SPONSOR_CONTENT, draftUpdatedAt: "",
  publishedAt: "2026-11-12", publishedVersion: 1, status: "published_with_edits",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getEvent).mockResolvedValue(event);
  vi.mocked(getSponsor).mockResolvedValue(sponsor);
});

it.each(["published", "published_with_edits"] as const)("shows the frozen snapshot for %s, even after event edits", async (status) => {
  vi.mocked(getSponsor).mockResolvedValue({ ...sponsor, status });
  const snapshot = { event: { title: "Original event" }, sponsor: { name: "Original sponsor" } };
  vi.mocked(getPublishedReport).mockResolvedValue(snapshot as Awaited<ReturnType<typeof getPublishedReport>>);
  const view = await loadSponsorView(event.id, sponsor.id);
  expect(view?.report).toBe(snapshot);
  expect(getPublishedReport).toHaveBeenCalledWith("open", "cafe");
});

it("resolves the latest draft only for explicit draft preview or an unpublished sponsor", async () => {
  expect((await loadSponsorView(event.id, sponsor.id, true))?.report.sponsor.name).toBe("Edited sponsor");
  vi.mocked(getSponsor).mockResolvedValue({ ...sponsor, status: "draft", slug: null, publishedVersion: 0 });
  expect((await loadSponsorView(event.id, sponsor.id))?.report.event.title).toBe("Edited event title");
  expect(getPublishedReport).not.toHaveBeenCalled();
});

it("rejects missing records and sponsors belonging to another event", async () => {
  vi.mocked(getSponsor).mockResolvedValue({ ...sponsor, eventId: "event-b" });
  expect(await loadSponsorView(event.id, sponsor.id)).toBeNull();
  vi.mocked(getSponsor).mockResolvedValue(null);
  expect(await loadSponsorView(event.id, sponsor.id)).toBeNull();
  vi.mocked(getSponsor).mockResolvedValue(sponsor);
  vi.mocked(getEvent).mockResolvedValue(null);
  expect(await loadSponsorView(event.id, sponsor.id)).toBeNull();
  expect(getPublishedReport).not.toHaveBeenCalled();
});

it("never substitutes unpublished content when a live snapshot is missing", async () => {
  vi.mocked(getPublishedReport).mockResolvedValue(null);
  expect(await loadSponsorView(event.id, sponsor.id)).toBeNull();
  vi.mocked(getSponsor).mockResolvedValue({ ...sponsor, slug: null });
  expect(await loadSponsorView(event.id, sponsor.id)).toBeNull();
});
