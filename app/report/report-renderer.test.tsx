import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_PALETTE, type ResolvedReport } from "@/lib/contract";

vi.mock("next/font/google", () => {
  const font = () => ({ variable: "" });
  return { Inter: font, Lora: font, Montserrat: font, Playfair_Display: font, Space_Grotesk: font };
});
const { ReportRenderer } = await import("./report-renderer");

const photo = (alt: string, caption?: string) =>
  ({ url: "https://x.test/p.jpg", path: "p.jpg", alt, caption, crop: { x: 0, y: 0 }, zoom: 1, area: { x: 0, y: 0, width: 100, height: 100 } });

it("shows each photo's description under it, once, for everyone", () => {
  const report: ResolvedReport = {
    templateKey: "impact-classic", event: { title: "Open", date: null, logoUrl: null, coverUrl: null },
    sponsor: { name: "Cafe", logoUrl: null }, palette: DEFAULT_PALETTE, text: {}, metrics: [], cta: null,
    images: { hero: photo("Crowd at the finals"), proof_primary: photo("Banner over the stage", "Day two") },
  };
  const html = renderToStaticMarkup(<ReportRenderer report={report} />);
  expect(html).toMatch(/<figcaption><span>Crowd at the finals<\/span><\/figcaption>/);
  expect(html).toMatch(/<span>Banner over the stage<\/span><span class="ssr-caption">Day two<\/span>/);
  // Images are alt="" so screen readers read the visible caption instead of the same text twice.
  expect(html).not.toMatch(/<img[^>]*alt="[^"]+"/);
});
