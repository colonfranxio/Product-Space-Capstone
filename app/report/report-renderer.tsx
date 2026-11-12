import type { CSSProperties, ReactNode } from "react";
import { Inter, Lora, Montserrat, Playfair_Display, Space_Grotesk } from "next/font/google";
import { TEMPLATES, type ImageSlotId, type ResolvedReport, type TextBlockId } from "@/lib/contract";
import { textOn } from "@/lib/color";
import { RichText } from "./rich-text";
import "./report.css";

// FONT_FAMILIES for the text toolbar; no preload since most reports won't use them.
// next/font needs literal options; variable names must match rich-text's fontVar().
const inter = Inter({ subsets: ["latin"], preload: false, variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], preload: false, variable: "--font-playfair-display" });
const lora = Lora({ subsets: ["latin"], preload: false, variable: "--font-lora" });
const montserrat = Montserrat({ subsets: ["latin"], preload: false, variable: "--font-montserrat" });
const grotesk = Space_Grotesk({ subsets: ["latin"], preload: false, variable: "--font-space-grotesk" });
const fontVars = [inter, playfair, lora, montserrat, grotesk].map((f) => f.variable).join(" ");

const aspect = Object.fromEntries(TEMPLATES["impact-classic"].imageSlots.map((x) => [x.id, x.aspect])) as Record<ImageSlotId, number>;

/** An uploaded image framed by its react-easy-crop `area` (percentages) inside a box of the slot's aspect. */
function Photo({ report, slot, onPick }: { report: ResolvedReport; slot: ImageSlotId; onPick?: (slot: ImageSlotId) => void }) {
  const img = report.images[slot];
  if (!img) return null;
  const { x, y, width, height } = img.area;
  const pick = onPick && {
    role: "button", tabIndex: 0, "aria-label": `Edit ${slot.replace("_", " ")} photo`, className: "ssr-frame ssr-pick",
    onClick: () => onPick(slot), onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && onPick(slot),
  };
  return (
    <div className="ssr-frame" style={{ aspectRatio: aspect[slot] }} {...pick}>
      <img
        src={img.url}
        alt={img.alt}
        loading={slot === "hero" ? undefined : "lazy"}
        style={{ width: `${10000 / width}%`, height: `${10000 / height}%`, left: `${(-x * 100) / width}%`, top: `${(-y * 100) / height}%` }}
      />
    </div>
  );
}

const PROOF_SLOTS = ["proof_primary", "proof_secondary", "event_moment"] as const;

/** Editor hooks: `text` swaps every text block for an inline editor (empty blocks stay visible); `onPhoto` makes photos clickable. */
export interface ReportEdit {
  text?: (id: TextBlockId) => ReactNode;
  onPhoto?: (slot: ImageSlotId) => void;
}

/** The one report renderer: public page, admin Viewer and editor preview. Empty sections are omitted. */
export function ReportRenderer({ report, edit }: { report: ResolvedReport; edit?: ReportEdit }) {
  const { event, sponsor, palette, text, metrics, cta } = report;
  const vars = {
    "--r-bg": palette.background,
    "--r-ink": palette.text,
    "--r-primary": palette.primary,
    "--r-on-primary": textOn(palette.primary),
    "--r-accent": palette.accent,
    "--r-on-accent": textOn(palette.accent),
  } as CSSProperties;
  const proof = PROOF_SLOTS.filter((id) => report.images[id]);
  const t = (id: TextBlockId) => (edit?.text ? edit.text(id) : text[id] && <RichText doc={text[id]} />);
  const photo = (slot: ImageSlotId) => <Photo report={report} slot={slot} onPick={edit?.onPhoto} />;

  return (
    <article className={`ssr-root ${fontVars}`} style={vars}>
      <header className="ssr-hero">
        <div className="ssr-heroTop">
          <span className="ssr-eyebrow">
            {event.logoUrl && <img className="ssr-eventLogo" src={event.logoUrl} alt="" />}
            {event.title} · Sponsor report
          </span>
          <div className="ssr-sponsor">
            {sponsor.logoUrl && <img className="ssr-logo" src={sponsor.logoUrl} alt={`${sponsor.name} logo`} />}
            <span>{sponsor.name}</span>
          </div>
        </div>
        <h1 className="ssr-headline ssr-rt">
          {edit?.text ? edit.text("headline") : text.headline ? <RichText doc={text.headline} flat /> : sponsor.name ? `Thank you, ${sponsor.name}.` : "Thank you."}
        </h1>
      </header>

      {photo("hero")}

      {(t("thank_you") || t("narrative")) && (
        <section className="ssr-thanks">
          <div className="ssr-eyebrow">A note from the team</div>
          <div className="ssr-thanksBody">
            {t("thank_you") && <div className="ssr-rt">{t("thank_you")}</div>}
            {t("narrative") && <div className="ssr-rt ssr-narrative">{t("narrative")}</div>}
            <p className="ssr-signoff">— The {event.title} team</p>
          </div>
        </section>
      )}

      {metrics.length > 0 && (
        <section className="ssr-section" aria-label="Impact">
          <div className="ssr-metrics">
            {metrics.map((m) => (
              <div key={m.id}>
                <div className="ssr-metricValue">{m.value}</div>
                <div className="ssr-metricLabel">
                  {m.label}
                  {m.context && <div className="ssr-metricContext">{m.context}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(proof.length > 0 || t("proof_description")) && (
        <section className="ssr-section">
          <h2 className="ssr-h2">Where you showed up</h2>
          {t("proof_description") && <div className="ssr-rt ssr-proofIntro">{t("proof_description")}</div>}
          <div className="ssr-proofGrid">
            {proof.map((id) => (
              <figure key={id}>
                {photo(id)}
                {report.images[id]?.caption && <figcaption>{report.images[id].caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}

      {t("closing") && (
        <section className="ssr-section">
          <div className="ssr-rt ssr-closing">{t("closing")}</div>
        </section>
      )}

      {cta && (
        <section className="ssr-cta">
          <div style={{ maxWidth: "34em" }}>
            <h2>{cta.heading}</h2>
            {cta.body && <p>{cta.body}</p>}
          </div>
          <a className="ssr-button" href={cta.url} target="_blank" rel="noopener noreferrer">{cta.buttonLabel}</a>
        </section>
      )}
    </article>
  );
}
