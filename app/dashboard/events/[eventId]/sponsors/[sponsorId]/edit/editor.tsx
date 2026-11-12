"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { publishSponsor, saveSponsorDraft, setSponsorSlug } from "@/app/actions";
import { ReportRenderer } from "@/app/report/report-renderer";
import {
  slugify, TEMPLATES, TEXT_BLOCK_IDS, type Cta, type EventRecord, type Hex, type Metric,
  type SponsorContent, type SponsorDraftInput, type SponsorRecord,
} from "@/lib/contract";
import { contrast, textOn } from "@/lib/color";
import { mediaUrl, resolveReport } from "@/lib/report";
import { uploadMedia } from "@/lib/upload";
import { isHttpsUrl } from "@/lib/validate";
import { ImagePick } from "@/app/dashboard/image-pick";
import { Swatches } from "@/app/dashboard/swatches";
import { logoColors } from "./logo-colors";
import { PhotoStep } from "./photo-step";
import { BlockEditor, defaultCopy, Toolbar } from "./rich-editor";

const STEPS = ["Sponsor", "Template", "Colors", "Photos", "Text", "Renewal", "Publish"];
const TITLES = ["Who is this for?", "Pick a template", "Choose the colors", "Add the photos", "Make the words yours", "Invite them back"];
const HELP = [
  "Use the name the sponsor uses for themselves. Their logo appears at the top of the page.",
  "Your sponsor's logo and name are already placed. The template decides where photos and text sit; you can switch later without losing anything.",
  "Start from one of these. The preview updates as you go.",
  "One at a time. Skip any you do not have; empty spots disappear from the finished page.",
  "Click any text in the preview to edit it directly.",
  "This closes the page. It starts from your event's default; change it for this sponsor if you like. Only mention perks your organization has agreed to.",
];
const HTTPS_MSG = "Paste a full link that starts with https://";
const SLUG_MSG: Record<string, string> = {
  ok: "Available. You can still change it until you publish.",
  invalid: "Use lowercase letters, numbers and single dashes.",
  taken: "Another sponsor in this event already uses this address.",
  reserved: "That address is reserved. Try another.",
  locked: "Locked after first publish so shared links keep working.",
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
const Mark = ({ ok }: { ok: boolean }) => <span className={`font-bold w-3.5 flex-none ${ok ? "text-ok" : "text-err"}`}>{ok ? "✓" : "!"}</span>;

export function Editor({ event, sponsor, host }: { event: EventRecord; sponsor: SponsorRecord; host: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SponsorDraftInput>({
    name: sponsor.name, logoPath: sponsor.logoPath, templateKey: sponsor.templateKey, draftContent: sponsor.draftContent,
  });
  const [step, setStep] = useState(1);
  const [slot, setSlot] = useState(0);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [active, setActive] = useState<TiptapEditor | null>(null);
  const [status, setStatus] = useState("Saved");
  const [logoError, setLogoError] = useState("");
  const [suggested, setSuggested] = useState<Hex[]>([]);
  const [locked, setLocked] = useState(sponsor.publishedVersion > 0);
  const [slug, setSlug] = useState(sponsor.slug ?? slugify(sponsor.name));
  const [slugState, setSlugState] = useState<string | null>(locked ? "locked" : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const c = draft.draftContent;
  const folder = `${event.organizationId}/${event.id}`;
  const report = resolveReport(event, draft);
  const cta = c.ctaOverride ?? event.defaultCta;

  // ── Autosave: ~700ms after the last edit; saves run one at a time so they land in order.
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));
  const dirty = useRef(false);
  const save = useCallback((input: SponsorDraftInput) => {
    dirty.current = false;
    setStatus("Saving…");
    queue.current = queue.current.then(async () => {
      const res = await saveSponsorDraft(sponsor.id, input);
      if (!dirty.current) setStatus(res.ok ? "Saved" : "Couldn't save");
      return res.ok;
    });
    return queue.current;
  }, [sponsor.id]);
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(() => save(draft), 700);
    return () => clearTimeout(t);
  }, [draft, save]);
  /** Resolves once everything typed so far is saved; publishSponsor rejects a draft that changes under it. */
  const flush = () => (dirty.current ? save(draft) : queue.current);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (status !== "Saved") e.preventDefault(); };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [status]);

  const update = (fn: (d: SponsorDraftInput) => SponsorDraftInput) => {
    dirty.current = true;
    setStatus("Saving…");
    setDraft(fn);
  };
  const content = (fn: (c: SponsorContent) => Partial<SponsorContent>) =>
    update((d) => ({ ...d, draftContent: { ...d.draftContent, ...fn(d.draftContent) } }));
  const setCta = (p: Partial<Cta>) => content((c) => ({ ctaOverride: { ...(c.ctaOverride ?? event.defaultCta), ...p } }));
  const setMetric = (id: string, p: Partial<Metric>) => content((c) => ({ metrics: c.metrics.map((m) => (m.id === id ? { ...m, ...p } : m)) }));

  async function checkSlug(s = slug) {
    if (locked) return true;
    const res = await setSponsorSlug(sponsor.id, s);
    setSlugState(res.ok ? "ok" : res.error);
    return res.ok;
  }

  function go(n: number) {
    if (n === 5) {
      // Seed starter copy into blocks that were never written, so there is something to click in the preview.
      const missing = TEXT_BLOCK_IDS.filter((id) => !c.text[id]);
      if (missing.length) content((c) => ({ text: { ...Object.fromEntries(missing.map((id) => [id, defaultCopy(id, draft.name, event.title)])), ...c.text } }));
    } else setActive(null);
    if (n === 7 && !slugState && slug) checkSlug();
    setStep(n);
  }

  async function publish() {
    setBusy(true);
    setErrors({});
    const ok = (await flush()) && (await checkSlug());
    const res = ok ? await publishSponsor(sponsor.id) : null;
    setBusy(false);
    if (!res) return setErrors({ form: "Fix the page address or try saving again." });
    if (!res.ok) return setErrors({ ...res.fieldErrors, form: res.error });
    setLive(res.data.url);
    setLocked(true);
    setSlugState("locked");
    router.refresh();
  }

  useEffect(() => {
    if (step === 3 && c.palette.source === "logo" && draft.logoPath) logoColors(mediaUrl(draft.logoPath)).then(setSuggested);
  }, [step, c.palette.source, draft.logoPath]);

  const r1 = contrast(report.palette.accent, textOn(report.palette.accent));
  const r2 = contrast(report.palette.accent, report.palette.background);
  const ctaOk = !cta.enabled || isHttpsUrl(cta.url);
  const checklist: [boolean, string][] = [
    [!!draft.name.trim(), errors.name ?? "Sponsor name"],
    [true, "Template chosen"],
    [slugState === "ok" || slugState === "locked", "Page address available"],
    [ctaOk, cta.enabled ? "Renewal button has a working https link" : "Renewal button is turned off"],
  ];

  const body = [
    // 1 Sponsor
    <>
      <div>
        <label className="label" htmlFor="name">Sponsor name · needed to publish</label>
        <input id="name" className="input" value={draft.name} placeholder="e.g. Telegraph Noodle House"
          onChange={(e) => {
            const name = e.target.value;
            update((d) => ({ ...d, name }));
            if (!locked && !sponsor.slug) { setSlug(slugify(name)); setSlugState(null); }
          }} />
      </div>
      <ImagePick label="Logo · recommended" src={draft.logoPath && mediaUrl(draft.logoPath)} error={logoError} imgClass="w-24 h-24 object-contain p-2"
        onRemove={() => update((d) => ({ ...d, logoPath: null }))}
        onFile={async (f) => {
          const res = await uploadMedia(f, folder);
          setLogoError("error" in res ? res.error : "");
          if ("path" in res) update((d) => ({ ...d, logoPath: res.path }));
        }} />
    </>,
    // 2 Template
    <>
      {Object.values(TEMPLATES).map((t) => (
        <button key={t.key} type="button" aria-pressed={draft.templateKey === t.key} onClick={() => update((d) => ({ ...d, templateKey: t.key }))}
          className={`card flex gap-3 p-3 text-left cursor-pointer ${draft.templateKey === t.key ? "border-accent!" : ""}`}>
          <span className="w-20 h-14 rounded-md flex-none flex items-center justify-center font-bold text-sm overflow-hidden"
            style={{ background: report.palette.primary, color: textOn(report.palette.primary) }}>
            {report.sponsor.logoUrl ? <img src={report.sponsor.logoUrl} alt="" className="w-full h-full object-contain p-1.5 bg-white" /> : initials(draft.name)}
          </span>
          <span><span className="block font-semibold text-[15px]">{t.name}</span><span className="block text-[13px] text-muted mt-0.5">{t.description}</span></span>
        </button>
      ))}
      <div className="card flex gap-3 p-3 opacity-50" aria-disabled>
        <span className="w-20 h-14 rounded-md flex-none striped">soon</span>
        <span><span className="block font-semibold text-[15px]">Field Notes</span><span className="block text-[13px] text-muted mt-0.5">Bold sans, split hero, photo collage.</span>
          <span className="block font-mono text-[11px] text-accent mt-1">COMING SOON</span></span>
      </div>
    </>,
    // 3 Colors
    <>
      {([["event", "Use event colors", `Matches every other ${event.title} report.`], ["logo", "Pick from the sponsor logo", "We suggest colors; you choose."], ["manual", "Choose my own", "Any colors you like."]] as const).map(([source, label, desc]) => (
        <button key={source} type="button" aria-pressed={c.palette.source === source}
          className={`card p-3 text-left cursor-pointer ${c.palette.source === source ? "border-accent!" : ""}`}
          onClick={() => content((c) => ({ palette: { source, colors: source === "event" ? c.palette.colors : report.palette } }))}>
          <span className="block font-semibold text-sm">{label}</span><span className="block text-[13px] text-muted">{desc}</span>
        </button>
      ))}
      {c.palette.source === "logo" && (
        <div>
          <span className="label">From the logo · click to use as the main color</span>
          {!draft.logoPath ? <p className="text-[13px] text-muted m-0">Add a logo in step 1 first.</p> : (
            <div className="flex gap-2 flex-wrap">
              {suggested.map((hex) => (
                <button key={hex} type="button" aria-label={`Use ${hex}`} className="w-11 h-11 rounded-lg border-2 border-line-input cursor-pointer" style={{ background: hex }}
                  onClick={() => content((c) => ({ palette: { ...c.palette, colors: { ...c.palette.colors, primary: hex } } }))} />
              ))}
              {!suggested.length && <p className="text-[13px] text-muted m-0">No clear colors found in this logo.</p>}
            </div>
          )}
        </div>
      )}
      {c.palette.source === "event" ? (
        <p className="text-[13px] text-muted m-0">Change these on the event, and every sponsor using them follows.</p>
      ) : (
        <Swatches value={c.palette.colors} onChange={(colors) => content((c) => ({ palette: { ...c.palette, colors } }))} />
      )}
      <div className="card p-3 text-[13px] flex flex-col gap-1.5">
        <div className="eyebrow text-[11px]!">Readability check</div>
        <div className="flex gap-2"><Mark ok={r1 >= 4.5} />Button text on accent: {r1.toFixed(1)}:1{r1 >= 4.5 ? ", easy to read" : ", hard to read"}</div>
        <div className="flex gap-2"><Mark ok={r2 >= 3} />Accent on background: {r2.toFixed(1)}:1{r2 >= 3 ? ", clear" : ", too faint. Try a darker accent or a different background."}</div>
      </div>
    </>,
    // 4 Photos
    <PhotoStep key="photos" images={c.images} folder={folder} slot={slot} setSlot={setSlot} onDone={() => go(5)}
      onChange={(id, next) => content((c) => {
        const images = { ...c.images };
        const img = next(images[id]);
        if (img) images[id] = img; else delete images[id];
        return { images };
      })} />,
    // 5 Text
    <>
      <Toolbar editor={active} />
      <div className="flex flex-col gap-2 border-t border-line pt-4 mt-1">
        <div className="eyebrow">Numbers worth showing</div>
        <p className="text-[13px] text-muted m-0">Only add figures you can stand behind. Leave this empty and the section is hidden.</p>
        {c.metrics.map((m) => (
          <div key={m.id} className="flex gap-1.5">
            <input className="input w-24! flex-none" value={m.value} placeholder="640" aria-label="Value" onChange={(e) => setMetric(m.id, { value: e.target.value })} />
            <input className="input flex-1 min-w-0" value={m.label} placeholder="What the number counts" aria-label="Label" onChange={(e) => setMetric(m.id, { label: e.target.value })} />
            <button type="button" className="btn-ghost w-11 flex-none px-0!" aria-label="Remove metric"
              onClick={() => content((c) => ({ metrics: c.metrics.filter((x) => x.id !== m.id) }))}>×</button>
          </div>
        ))}
        <button type="button" className="btn-ghost self-start text-[13px]!"
          onClick={() => content((c) => ({ metrics: [...c.metrics, { id: crypto.randomUUID(), label: "", value: "" }] }))}>Add a number for this sponsor</button>
        {event.metrics.length > 0 && <div className="label mt-2 mb-0!">From the event · tick to include</div>}
        {event.metrics.map((m) => (
          <label key={m.id} className="flex gap-2.5 items-center text-sm min-h-11 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-accent" checked={c.eventMetricIds.includes(m.id)}
              onChange={(e) => content((c) => ({ eventMetricIds: e.target.checked ? [...c.eventMetricIds, m.id] : c.eventMetricIds.filter((x) => x !== m.id) }))} />
            <span><strong>{m.value}</strong> {m.label}</span>
          </label>
        ))}
      </div>
    </>,
    // 6 Renewal
    <>
      <label className="flex gap-2.5 items-center text-sm min-h-11 cursor-pointer">
        <input type="checkbox" className="w-4 h-4 accent-accent" checked={cta.enabled} onChange={(e) => setCta({ enabled: e.target.checked })} />
        Show the renewal invitation
      </label>
      {cta.enabled && (
        <>
          <div><label className="label" htmlFor="cta-h">Heading</label><input id="cta-h" className="input" value={cta.heading} onChange={(e) => setCta({ heading: e.target.value })} /></div>
          <div><label className="label" htmlFor="cta-b">Message</label><textarea id="cta-b" className="input resize-y" rows={4} value={cta.body} onChange={(e) => setCta({ body: e.target.value })} /></div>
          <div><label className="label" htmlFor="cta-l">Button text</label><input id="cta-l" className="input" value={cta.buttonLabel} onChange={(e) => setCta({ buttonLabel: e.target.value })} /></div>
          <div>
            <label className="label" htmlFor="cta-u">Where the button goes</label>
            <input id="cta-u" className={`input font-mono text-sm! ${ctaOk ? "" : "border-err!"}`} type="url" inputMode="url" value={cta.url} placeholder="https://forms.gle/…"
              onChange={(e) => setCta({ url: e.target.value.trim() })} />
            <p className={`text-[13px] mt-1.5 mb-0 ${ctaOk && !errors["cta.url"] ? "text-muted" : "text-err"}`}>{ctaOk && !errors["cta.url"] ? "Opens in a new tab. A Google Form works well." : HTTPS_MSG}</p>
          </div>
        </>
      )}
      {c.ctaOverride && <button type="button" className="btn-ghost self-start text-[13px]!" onClick={() => content(() => ({ ctaOverride: null }))}>Use the event default</button>}
    </>,
    // 7 Publish
    <>
      <div className="card p-3.5 flex flex-col gap-2 text-sm">
        {checklist.map(([ok, text]) => <div key={text} className="flex gap-2.5"><Mark ok={ok} />{text}</div>)}
      </div>
      <div>
        <label className="label" htmlFor="slug">Page address</label>
        <div className="font-mono text-xs text-muted mb-1.5 break-all">{host}/{event.slug}/</div>
        <input id="slug" className="input font-mono text-sm!" value={slug} disabled={locked}
          onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugState(null); }} onBlur={() => slug && checkSlug()} />
        {slugState && <p className={`text-[13px] mt-1.5 mb-0 ${slugState === "ok" || slugState === "locked" ? "text-muted" : "text-err"}`}>{SLUG_MSG[slugState] ?? slugState}</p>}
      </div>
      <button type="button" className="btn" disabled={busy || !draft.name.trim() || !slug || !ctaOk} onClick={publish}>
        {busy ? "Publishing…" : sponsor.publishedVersion > 0 || live ? "Republish" : "Publish"}
      </button>
      {errors.form && <p className="err m-0" role="alert">{errors.form}{Object.entries(errors).filter(([k]) => k !== "form").map(([, v]) => ` ${v}.`)}</p>}
      {live && (
        <div className="card p-3.5 border-ok! flex flex-col gap-2.5">
          <div className="font-semibold text-ok">It&apos;s live.</div>
          <div className="font-mono text-[13px] break-all">{live}</div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" className="btn text-[13px]!" onClick={() => navigator.clipboard.writeText(live).then(() => setCopied(true))}>{copied ? "Copied" : "Copy link"}</button>
            <a className="btn-ghost text-[13px]!" href={live} target="_blank" rel="noopener noreferrer">Open public link</a>
            <Link className="btn-ghost text-[13px]!" href={`/dashboard/events/${event.id}`}>Next sponsor</Link>
          </div>
        </div>
      )}
    </>,
  ][step - 1];

  return (
    <div className="flex flex-col h-[calc(100dvh-47px)]">
      <div className="flex-none flex items-center gap-2.5 px-3.5 py-2 border-b border-line flex-wrap">
        <button type="button" className="btn-ghost text-[13px]! border-0!" onClick={async () => { await flush(); router.push(`/dashboard/events/${event.id}`); }}>← Sponsors</button>
        <span className="font-semibold text-sm truncate">{draft.name || "New sponsor"}</span>
        <span className="font-mono text-[11px] text-muted">{locked ? "LIVE VERSION STAYS UP" : "DRAFT"}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs ${status === "Couldn't save" ? "text-err" : "text-muted"}`} role="status">{status}</span>
          <button type="button" className="btn-ghost text-[13px]! hidden min-[760px]:inline-flex" onClick={() => save(draft)}>Save draft</button>
          <button type="button" className="btn-ghost text-[13px]! hidden min-[760px]:inline-flex" onClick={() => setView(view === "edit" ? "preview" : "edit")}>
            {view === "edit" ? "Preview" : "Back to editing"}
          </button>
        </div>
        <div className="w-full grid grid-cols-2 gap-1 min-[760px]:hidden" role="tablist">
          {(["edit", "preview"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`btn-ghost text-[13px]! capitalize ${view === v ? "bg-raised! border-accent!" : ""}`}>{v}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className={`flex-1 min-w-0 overflow-y-auto p-3 min-[760px]:p-5 ${view === "edit" ? "hidden min-[760px]:block" : ""}`}>
          <div className="max-w-[1100px] mx-auto rounded-lg overflow-hidden">
            <ReportRenderer report={report} edit={{
              text: step === 5 ? (id) => (
                <BlockEditor key={id} doc={c.text[id] ?? defaultCopy(id, draft.name, event.title)} onFocus={setActive}
                  onChange={(doc) => content((c) => ({ text: { ...c.text, [id]: doc } }))} />
              ) : undefined,
              onPhoto: (s) => { setSlot(TEMPLATES[draft.templateKey].imageSlots.findIndex((x) => x.id === s)); go(4); setView("edit"); },
            }} />
          </div>
        </div>

        <aside className={`w-full min-[760px]:w-[380px] flex-none border-l border-line bg-rail flex-col min-h-0 ${view === "preview" ? "hidden" : "flex"}`}>
          <div className="flex gap-1 p-3.5 pb-0 min-[760px]:hidden" aria-hidden>
            {STEPS.map((s, i) => <span key={s} className={`h-1 flex-1 rounded-full ${i < step ? "bg-accent" : "bg-line"}`} />)}
          </div>
          <div className="flex-1 overflow-y-auto">
            {STEPS.slice(0, step - 1).map((s, i) => (
              <button key={s} type="button" onClick={() => go(i + 1)}
                className="hidden min-[760px]:flex w-full items-center gap-2 px-4 min-h-11 text-left text-sm text-muted border-b border-line cursor-pointer bg-transparent">
                <span className="text-ok">✓</span>{i + 1}. {s}<span className="ml-auto text-xs underline">Edit</span>
              </button>
            ))}
            <section className="p-4 flex flex-col gap-4">
              <div className="eyebrow">Step {step} of 7</div>
              <h2 className="text-xl font-semibold m-0 -mt-2">{step === 7 ? (locked ? "Republish" : "Review and publish") : TITLES[step - 1]}</h2>
              <p className="text-[13px] text-muted m-0 -mt-2 leading-normal">
                {step === 7 ? (locked ? "Republishing replaces the live page at the same address." : "Check the address, then publish. Photos and numbers are optional.") : HELP[step - 1]}
              </p>
              {body}
            </section>
            {STEPS.slice(step).map((s, i) => (
              <button key={s} type="button" onClick={() => go(step + i + 1)}
                className="hidden min-[760px]:flex w-full items-center gap-2 px-4 min-h-11 text-left text-sm text-muted border-t border-line cursor-pointer bg-transparent">
                {step + i + 1}. {s}
              </button>
            ))}
          </div>
          <div className="flex-none flex gap-2 p-3.5 border-t border-line">
            <button type="button" className={`btn-ghost ${step === 1 ? "invisible" : ""}`} onClick={() => go(step - 1)}>Back</button>
            {step < 7 && <button type="button" className="btn ml-auto" onClick={() => go(step + 1)}>{step === 6 ? "Next: review and publish" : `Next: ${STEPS[step]}`}</button>}
          </div>
        </aside>
      </div>
    </div>
  );
}

