import { Fragment, type ReactNode } from "react";
import type { RichTextBlock, RichTextDoc, RichTextInline } from "@/lib/contract";

/** CSS var set by the renderer's next/font classes, e.g. "Playfair Display" → --font-playfair-display. */
export const fontVar = (name: string) => `--font-${name.toLowerCase().replace(/ /g, "-")}`;

function inline(node: RichTextInline, key: number): ReactNode {
  if (node.type === "hardBreak") return <br key={key} />;
  const out = (node.marks ?? []).reduce<ReactNode>((child, m) => {
    if (m.type === "bold") return <strong>{child}</strong>;
    if (m.type === "italic") return <em>{child}</em>;
    if (m.type === "underline") return <u>{child}</u>;
    if (m.type === "textStyle") {
      const { color, fontFamily, fontSize } = m.attrs ?? {};
      return (
        <span style={{ color: color ?? undefined, fontSize: fontSize ?? undefined, fontFamily: fontFamily ? `var(${fontVar(fontFamily)}), "${fontFamily}"` : undefined }}>
          {child}
        </span>
      );
    }
    return child;
  }, node.text);
  return <Fragment key={key}>{out}</Fragment>;
}

function block(b: RichTextBlock, key: number, flat: boolean) {
  const align = b.attrs?.textAlign ?? undefined;
  const kids = b.content?.length ? b.content.map(inline) : <br />;
  // flat: inside an element that can't hold <p>/<h*> (e.g. the hero <h1>), blocks become block-level spans.
  if (flat) return <span key={key} style={{ display: "block", textAlign: align }}>{kids}</span>;
  const Tag = b.type === "heading" ? (`h${b.attrs.level}` as const) : "p";
  return <Tag key={key} style={align ? { textAlign: align } : undefined}>{kids}</Tag>;
}

/** Renders allowlisted Tiptap JSON as React elements. Never uses dangerouslySetInnerHTML. */
export function RichText({ doc, flat = false }: { doc: RichTextDoc; flat?: boolean }) {
  return <>{doc.content.map((b, i) => block(b, i, flat))}</>;
}
