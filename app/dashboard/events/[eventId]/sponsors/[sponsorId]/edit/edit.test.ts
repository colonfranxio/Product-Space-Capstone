import { describe, expect, it } from "vitest";
import { validateRichText } from "@/lib/validate";
import { topColors } from "./logo-colors";
import { clean } from "./rich-editor";

describe("editor helpers", () => {
  it("topColors ranks colors and skips white, black and transparent", () => {
    const px = (r: number, g: number, b: number, a = 255) => [r, g, b, a];
    const data = new Uint8ClampedArray([
      ...px(255, 255, 255), ...px(255, 255, 255), ...px(255, 255, 255), ...px(0, 0, 0), ...px(200, 0, 0, 0),
      ...px(20, 60, 200), ...px(22, 62, 205), ...px(230, 120, 10),
    ]);
    expect(topColors(data)).toEqual(["#1838c8", "#e87808"]);
  });

  it("clean nulls pasted textStyle values the backend rejects", () => {
    const doc = clean({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [
        { type: "textStyle", attrs: { color: "rgb(1, 2, 3)" as `#${string}`, fontFamily: "Lora", fontSize: "13px" as "14px" } },
      ] }] }],
    });
    expect(doc.content[0].content?.[0]).toEqual({ type: "text", text: "x", marks: [{ type: "textStyle", attrs: { color: null, fontFamily: "Lora", fontSize: null } }] });
    expect(validateRichText(doc, "t")).toEqual({});
  });
});
