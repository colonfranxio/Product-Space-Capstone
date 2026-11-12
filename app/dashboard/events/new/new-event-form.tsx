"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEvent } from "@/app/actions";
import { slugify, type Metric, type Palette } from "@/lib/contract";
import { mediaUrl } from "@/lib/report";
import { uploadMedia } from "@/lib/upload";
import { isHttpsUrl } from "@/lib/validate";
import { Swatches } from "../../swatches";

const HTTPS_MSG = "Paste a full link that starts with https://";

export function NewEventForm({ orgId, host, colors: initialColors }: { orgId: string; host: string; colors: Palette }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [colors, setColors] = useState(initialColors);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [ctaBody, setCtaBody] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const setMetric = (id: string, patch: Partial<Metric>) => setMetrics((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  async function pickCover(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const res = await uploadMedia(file, orgId);
    setBusy(false);
    if ("error" in res) return setErrors({ cover: res.error });
    setErrors({});
    setCover(res.path);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (ctaUrl.trim() && !isHttpsUrl(ctaUrl.trim())) return setErrors({ ctaUrl: HTTPS_MSG });
    setBusy(true);
    const res = await createEvent({
      title, date: date || null, description: description.trim() || null, coverImagePath: cover, brandColors: colors,
      metrics: metrics.filter((m) => m.value.trim() || m.label.trim()),
      // Heading and button label get defaults here; each sponsor can rewrite them in the editor's Renewal step.
      defaultCta: { enabled: !!ctaUrl.trim(), heading: "Let's do this again", body: ctaBody.trim(), buttonLabel: "Sponsor next year", url: ctaUrl.trim() },
    });
    setBusy(false);
    if (!res.ok) {
      const f = res.fieldErrors ?? {};
      return setErrors({ ...f, ctaUrl: f["defaultCta.url"] && HTTPS_MSG, form: res.fieldErrors ? "" : res.error });
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="page">
      <Link href="/dashboard" className="text-muted text-[13px] no-underline">← Events</Link>
      <h1 className="h1 mt-2.5 mb-1.5">New event</h1>
      <p className="text-sm text-muted mt-0 mb-7 max-w-[44em] leading-normal">
        Enter this once. Every sponsor report for this event reuses it. Only the title is required.
      </p>
      <div className="grid gap-x-10 gap-y-7 grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] max-w-[980px]">
        <div className="flex flex-col gap-4">
          <div className="eyebrow">Basics</div>
          <div>
            <label className="label" htmlFor="title">Event title · required</label>
            <input className="input" id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Berkeley Open 2027" />
            {errors.title && <p className="err">{errors.title}</p>}
          </div>
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input className="input" id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="desc">Short description</label>
            <textarea className="input resize-y" id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What the event was, in a sentence or two." />
          </div>
          <div>
            <span className="label">Public URL</span>
            <div className="font-mono text-[13px] bg-panel border border-line-input rounded-md px-3 py-2.5 break-all">
              <span className="text-muted">{host}/</span>{slugify(title) || "your-event"}
            </div>
            <p className="text-xs text-muted mt-1.5 mb-0">Final address is confirmed when you create the event.</p>
          </div>
          <div>
            <span className="label">Cover image</span>
            {cover && <img src={mediaUrl(cover)} alt="" className="block w-full aspect-video object-cover rounded-lg mb-2" />}
            <label className="block border border-dashed border-line-dash rounded-lg p-[22px] text-center text-[13px] text-muted cursor-pointer">
              {cover ? "Replace image" : <>Choose a JPG, PNG or WebP · <span className="text-ink underline">browse</span></>}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickCover(e.target.files?.[0])} />
            </label>
            {errors.cover && <p className="err">{errors.cover}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="eyebrow">Shared with every sponsor report</div>
          <div>
            <span className="label">Event colors · click a swatch to change it</span>
            <Swatches value={colors} onChange={setColors} />
          </div>
          <div>
            <span className="label">Event metrics · optional, never added to a report automatically</span>
            <div className="flex flex-col gap-2">
              {metrics.map((m) => (
                <div key={m.id} className="flex gap-1.5">
                  <input className="input w-28! flex-none" value={m.value} onChange={(e) => setMetric(m.id, { value: e.target.value })} placeholder="312" aria-label="Number" />
                  <input className="input flex-1 min-w-0" value={m.label} onChange={(e) => setMetric(m.id, { label: e.target.value })} placeholder="competitors across both days" aria-label="What it counts" />
                  <button type="button" className="btn-ghost w-11 flex-none px-0!" aria-label="Remove metric"
                    onClick={() => setMetrics((ms) => ms.filter((x) => x.id !== m.id))}>×</button>
                </div>
              ))}
              <button type="button" className="btn-ghost self-start text-[13px]!"
                onClick={() => setMetrics((ms) => [...ms, { id: crypto.randomUUID(), label: "", value: "" }])}>
                {metrics.length ? "Add another metric" : "Add a metric"}
              </button>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="cta-body">Default renewal message</label>
            <textarea className="input resize-y" id="cta-body" rows={3} value={ctaBody} onChange={(e) => setCtaBody(e.target.value)}
              placeholder="We are planning next year now. If you would like to be part of it again, tell us." />
          </div>
          <div>
            <label className="label" htmlFor="cta-url">Renewal link · https only</label>
            <input className="input" id="cta-url" type="url" inputMode="url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://forms.gle/…" />
            {errors.ctaUrl && <p className="err">{errors.ctaUrl}</p>}
          </div>
        </div>
      </div>
      <div className="flex gap-2.5 mt-8 items-center flex-wrap">
        <button className="btn" disabled={busy || !title.trim()}>Create event</button>
        <Link href="/dashboard" className="btn-ghost">Cancel</Link>
        <span className="text-[13px] text-muted">{title.trim() ? "" : "Add a title to continue."}</span>
        {errors.form && <span className="err m-0" role="alert">{errors.form}</span>}
      </div>
    </form>
  );
}
