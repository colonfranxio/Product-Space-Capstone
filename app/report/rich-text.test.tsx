import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "./rich-text";
import type { RichTextDoc } from "@/lib/contract";

const doc: RichTextDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2, textAlign: "center" }, content: [{ type: "text", text: "Hi" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "<b>x</b>", marks: [{ type: "bold" }, { type: "italic" }] },
        { type: "hardBreak" },
        { type: "text", text: "y", marks: [{ type: "textStyle", attrs: { color: "#ff0000", fontFamily: "Playfair Display", fontSize: "20px" } }] },
      ],
    },
    { type: "paragraph" },
  ],
};

describe("RichText", () => {
  it("renders Tiptap JSON as escaped elements", () => {
    expect(renderToStaticMarkup(<RichText doc={doc} />)).toBe(
      '<h2 style="text-align:center">Hi</h2>' +
        "<p><em><strong>&lt;b&gt;x&lt;/b&gt;</strong></em><br/>" +
        '<span style="color:#ff0000;font-size:20px;font-family:var(--font-playfair-display), &quot;Playfair Display&quot;">y</span></p>' +
        "<p><br/></p>",
    );
  });

  it("flattens blocks to spans for use inside a heading", () => {
    expect(renderToStaticMarkup(<RichText doc={doc} flat />)).toMatch(/^<span style="display:block;text-align:center">Hi<\/span>/);
  });
});
