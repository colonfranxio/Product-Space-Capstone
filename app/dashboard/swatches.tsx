"use client";
import type { Palette } from "@/lib/contract";
import { textOn } from "@/lib/color";

const NAMES = { primary: "Primary", accent: "Accent", background: "Background" } as const;

/** Primary / accent / background pickers. `text` is derived from the background so it always stays readable. */
export function Swatches({ value, onChange }: { value: Palette; onChange: (p: Palette) => void }) {
  return (
    <div className="flex gap-3.5 flex-wrap">
      {(Object.keys(NAMES) as (keyof typeof NAMES)[]).map((k) => (
        <label key={k} className="flex flex-col gap-1.5 text-xs text-muted cursor-pointer">
          <input
            type="color" value={value[k]}
            onChange={(e) => {
              const next = { ...value, [k]: e.target.value.toLowerCase() as Palette[typeof k] };
              onChange({ ...next, text: textOn(next.background) });
            }}
            className="w-14 h-11 p-0 border-2 border-line-input rounded-lg bg-transparent cursor-pointer"
          />
          <span>{NAMES[k]}</span>
          <span className="font-mono text-[11px] text-ink">{value[k]}</span>
        </label>
      ))}
    </div>
  );
}
