"use client";
import { useState } from "react";
import Cropper from "react-easy-crop";
import { TEMPLATES, type ImageSlotId, type PlacedImage } from "@/lib/contract";
import { mediaUrl } from "@/lib/report";
import { uploadMedia } from "@/lib/upload";

const SLOTS = TEMPLATES["impact-classic"].imageSlots;
const ratio = (a: number) => ({ [16 / 9]: "16:9", [4 / 3]: "4:3", [3 / 2]: "3:2" })[a] ?? a.toFixed(2);

/** Step 4: one slot at a time. Crop/zoom/area come straight from react-easy-crop and frame the photo in the report. */
export function PhotoStep({ images, folder, slot, setSlot, onChange, onDone }: {
  images: Partial<Record<ImageSlotId, PlacedImage>>;
  folder: string;
  slot: number;
  setSlot: (i: number) => void;
  /** Functional update so the cropper's back-to-back callbacks don't overwrite each other. */
  onChange: (id: ImageSlotId, next: (img?: PlacedImage) => PlacedImage | null) => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const def = SLOTS[slot];
  const img = images[def.id];
  const patch = (p: Partial<PlacedImage>) => onChange(def.id, (i) => (i ? { ...i, ...p } : null));

  async function upload(file: File) {
    setBusy(true);
    const res = await uploadMedia(file, folder);
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setError("");
    // area is replaced by the cropper's first onCropComplete as soon as it mounts.
    onChange(def.id, (i) => ({ path: res.path, alt: i?.alt ?? "", caption: i?.caption, crop: { x: 0, y: 0 }, zoom: 1, area: { x: 0, y: 0, width: 100, height: 100 } }));
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex gap-2" role="tablist" aria-label="Photo slots">
        {SLOTS.map((s, i) => (
          <button key={s.id} type="button" role="tab" aria-selected={i === slot} aria-label={s.label} onClick={() => setSlot(i)}
            className={`btn-ghost w-11 px-0! ${i === slot ? "bg-raised! border-accent!" : ""} ${images[s.id] ? "" : "text-muted!"}`}>
            {i + 1}
          </button>
        ))}
      </div>
      <div>
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-semibold text-[15px]">{def.label}</span>
          <span className="font-mono text-xs text-muted">{slot + 1} of {SLOTS.length} · {ratio(def.aspect)}</span>
        </div>
        <p className="text-[13px] text-muted mt-1 mb-0">{def.help}</p>
      </div>

      {img ? (
        <>
          <div className="relative w-full rounded-lg overflow-hidden bg-raised" style={{ aspectRatio: def.aspect }}>
            <Cropper image={mediaUrl(img.path)} aspect={def.aspect} crop={img.crop} zoom={img.zoom}
              onCropChange={(crop) => patch({ crop })} onZoomChange={(zoom) => patch({ zoom })}
              onCropComplete={(area) => patch({ area })} />
          </div>
          <label className="label mb-0!">Zoom
            <input type="range" min={1} max={3} step={0.01} value={img.zoom} className="w-full mt-1.5 accent-accent"
              onChange={(e) => patch({ zoom: Number(e.target.value) })} />
          </label>
          <div>
            <label className="label" htmlFor="alt">Describe the photo for screen readers</label>
            <input id="alt" className="input" value={img.alt} placeholder="e.g. Volunteers at the sponsor table" onChange={(e) => patch({ alt: e.target.value })} />
          </div>
          {def.id !== "hero" && (
            <div>
              <label className="label" htmlFor="caption">Caption · optional</label>
              <input id="caption" className="input" value={img.caption ?? ""} onChange={(e) => patch({ caption: e.target.value || undefined })} />
            </div>
          )}
        </>
      ) : (
        <div className="striped rounded-lg" style={{ aspectRatio: def.aspect }}>no photo · this spot is hidden</div>
      )}

      <div className="flex gap-2 flex-wrap">
        <label className={`btn-ghost text-[13px]! ${busy ? "opacity-45" : ""}`}>
          {busy ? "Uploading…" : img ? "Replace" : "Upload photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
        </label>
        {img && <button type="button" className="btn-ghost text-[13px]!" onClick={() => onChange(def.id, () => null)}>Remove</button>}
        <button type="button" className="btn-ghost text-[13px]! ml-auto" onClick={() => (slot < SLOTS.length - 1 ? setSlot(slot + 1) : onDone())}>
          {slot < SLOTS.length - 1 ? "Next photo" : "Done with photos"}
        </button>
      </div>
      {error && <p className="err m-0" role="alert">{error}</p>}
      <p className="text-xs text-muted m-0">Drag to reframe. Click a photo in the preview to jump to its spot.</p>
    </div>
  );
}
