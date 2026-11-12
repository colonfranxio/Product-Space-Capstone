import { expect, test } from "vitest";
import { contrast, textOn } from "./color";

test("contrast and readable text color", () => {
  expect(contrast("#000000", "#ffffff")).toBeCloseTo(21);
  expect(contrast("#777777", "#777777")).toBe(1);
  expect(textOn("#ffffff")).toBe("#1a1a1a");
  expect(textOn("#f7f4ec")).toBe("#1a1a1a");
  expect(textOn("#1f2a44")).toBe("#ffffff");
});
