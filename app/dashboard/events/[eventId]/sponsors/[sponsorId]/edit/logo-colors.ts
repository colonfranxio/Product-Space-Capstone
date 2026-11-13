import type { Hex } from "@/lib/contract";

const hex = (n: number) => n.toString(16).padStart(2, "0");

/** Most common colors in RGBA pixel data, bucketed to 4 bits per channel; skips transparent, near-white and near-black pixels. */
export function topColors(px: Uint8ClampedArray, n = 4): Hex[] {
  const count = new Map<string, number>();
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (a < 128 || min > 235 || max < 20) continue;
    const key = `#${hex(r & 0xf0 | 8)}${hex(g & 0xf0 | 8)}${hex(b & 0xf0 | 8)}`;
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  return [...count].sort((x, y) => y[1] - x[1]).slice(0, n).map(([k]) => k as Hex);
}

/** Suggested colors from a logo URL (Storage serves public files with CORS, so the canvas stays readable). */
export function logoColors(url: string): Promise<Hex[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve([]);
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 48;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 48, 48);
      try { resolve(topColors(ctx.getImageData(0, 0, 48, 48).data)); } catch { resolve([]); }
    };
    img.src = url;
  });
}
