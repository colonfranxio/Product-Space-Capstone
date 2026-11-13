import { beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_PALETTE, type ResolvedReport } from "../../../lib/contract";
import PublicReportPage, { generateMetadata } from "./page";

const { readReport, renderer } = vi.hoisted(() => ({ readReport: vi.fn(), renderer: vi.fn() }));
vi.mock("@/lib/data", () => ({ getPublishedReport: readReport }));
vi.mock("@/app/report/report-renderer", () => ({ ReportRenderer: renderer }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not found"); } }));

const report: ResolvedReport = {
  templateKey: "impact-classic", event: { title: "Published event", date: null, logoUrl: null, coverUrl: null },
  sponsor: { name: "Published sponsor", logoUrl: null }, palette: DEFAULT_PALETTE, images: {}, text: {}, metrics: [], cta: null,
};
const props = { params: Promise.resolve({ eventSlug: "open", sponsorSlug: "cafe" }) };
beforeEach(() => vi.resetAllMocks());

it("passes only the published snapshot into the shared renderer", async () => {
  readReport.mockResolvedValue(report);
  const page = await PublicReportPage(props);
  expect(readReport).toHaveBeenCalledExactlyOnceWith("open", "cafe");
  expect(page.type).toBe(renderer);
  expect(page.props).toEqual({ report });
});

it("returns notFound for missing or unpublished reports", async () => {
  readReport.mockResolvedValue(null);
  await expect(PublicReportPage(props)).rejects.toThrow("not found");
  expect(renderer).not.toHaveBeenCalled();
});

it("titles shared links with the sponsor and event", async () => {
  readReport.mockResolvedValue(report);
  expect((await generateMetadata(props)).title).toBe("Thank you, Published sponsor · Published event");
  readReport.mockResolvedValue(null);
  expect(await generateMetadata(props)).toEqual({});
});
