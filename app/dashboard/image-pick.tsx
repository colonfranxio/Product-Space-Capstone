"use client";

/** Image field: preview, a dashed "browse" dropzone, optional Remove, extra actions (children) and an error line. */
export function ImagePick({ label, src, onFile, onRemove, error, imgClass = "w-full aspect-video object-cover", children }: {
  label: string;
  src: string | null;
  onFile: (file: File) => void;
  onRemove?: () => void;
  error?: string;
  imgClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      {src && <img src={src} alt="" className={`block rounded-lg mb-2 bg-raised ${imgClass}`} />}
      <label className="block border border-dashed border-line-dash rounded-lg p-[22px] text-center text-[13px] text-muted cursor-pointer">
        {src ? "Replace image" : <>Choose a JPG, PNG or WebP · <span className="text-ink underline">browse</span></>}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }} />
      </label>
      {(onRemove && src) || children ? (
        <div className="flex gap-2 mt-2 flex-wrap">
          {children}
          {onRemove && src && <button type="button" className="btn-ghost text-[13px]!" onClick={onRemove}>Remove</button>}
        </div>
      ) : null}
      {error && <p className="err">{error}</p>}
    </div>
  );
}
