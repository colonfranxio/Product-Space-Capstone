import { describe, expect, it } from "vitest";
import { EMPTY_SPONSOR_CONTENT } from "./contract";
import { isHttpsUrl, validateRichText, validateSponsorContent } from "./validate";

const styled = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2, textAlign: "center" }, content: [{ type: "text", text: "Hi", marks: [{ type: "bold" }] }] },
    { type: "paragraph", content: [
      { type: "text", text: "x", marks: [{ type: "textStyle", attrs: { color: "#ff0000", fontFamily: "Lora", fontSize: "18px" } }] },
      { type: "hardBreak" },
    ] },
    { type: "paragraph" },
  ],
};

describe("validateRichText", () => {
  it("accepts the allowlist", () => expect(validateRichText(styled, "t")).toEqual({}));
  it.each([
    ["script-ish node", { type: "doc", content: [{ type: "codeBlock" }] }],
    ["link mark", { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a", marks: [{ type: "link", attrs: { href: "javascript:x" } }] }] }] }],
    ["off-list font", { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a", marks: [{ type: "textStyle", attrs: { fontFamily: "Comic Sans" } }] }] }] }],
    ["bad color", { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a", marks: [{ type: "textStyle", attrs: { color: "red" } }] }] }] }],
    ["h4", { type: "doc", content: [{ type: "heading", attrs: { level: 4 } }] }],
  ])("rejects %s", (_, doc) => expect(validateRichText(doc, "t")).toEqual({ t: "Unsupported formatting" }));
});

describe("validateSponsorContent", () => {
  const cta = { enabled: true, heading: "", body: "", buttonLabel: "Renew", url: "http://x.test" };

  it("accepts empty content", () => expect(validateSponsorContent(EMPTY_SPONSOR_CONTENT, true)).toEqual({}));
  it("lets drafts hold a half-typed CTA but blocks publishing it", () => {
    const c = { ...EMPTY_SPONSOR_CONTENT, ctaOverride: cta };
    expect(validateSponsorContent(c, false)).toEqual({});
    expect(validateSponsorContent(c, true)).toEqual({ "cta.url": "Paste a full link that starts with https://" });
  });
  it("flags unknown slots and blocks", () => {
    const e = validateSponsorContent({ ...EMPTY_SPONSOR_CONTENT, images: { banner: {} }, text: { footer: styled } }, false);
    expect(Object.keys(e)).toEqual(["images.banner", "text.footer"]);
  });
});

it("isHttpsUrl", () => {
  expect(isHttpsUrl("https://renew.example.org/x")).toBe(true);
  expect(["http://a.b", "javascript:alert(1)", "https://", "renew.org"].map(isHttpsUrl)).toEqual([false, false, false, false]);
});
