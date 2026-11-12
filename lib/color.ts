import type { Hex } from "./contract";

/** WCAG relative luminance of a `#rrggbb` color. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1–21. */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Readable text color for a background: near-black or white, whichever contrasts more. */
export const textOn = (bg: string): Hex => (contrast(bg, "#1a1a1a") >= contrast(bg, "#ffffff") ? "#1a1a1a" : "#ffffff");
