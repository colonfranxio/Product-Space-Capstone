"use client";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { FONT_FAMILIES, FONT_SIZES, TEXT_ALIGNS, type RichTextDoc, type TextBlockId } from "@/lib/contract";
import { isHex } from "@/lib/validate";
import { fontVar } from "@/app/report/rich-text";

// Only what the contract's rich-text allowlist accepts.
const extensions = [
  StarterKit.configure({
    blockquote: false, bulletList: false, code: false, codeBlock: false, horizontalRule: false, listItem: false, listKeymap: false,
    orderedList: false, strike: false, link: false, dropcursor: false, gapcursor: false, trailingNode: false, heading: { levels: [1, 2, 3] },
  }),
  TextStyle, Color, FontSize, TextAlign.configure({ types: ["heading", "paragraph"] }),
  // Same font stack as the renderer, so the preview shows the next/font face rather than a bare family name.
  FontFamily.extend({
    addGlobalAttributes: () => [{
      types: ["textStyle"],
      attributes: {
        fontFamily: {
          default: null,
          parseHTML: (el) => el.style.fontFamily.match(/"([^"]+)"/)?.[1] ?? null,
          renderHTML: (a) => (a.fontFamily ? { style: `font-family: var(${fontVar(a.fontFamily)}), "${a.fontFamily}"` } : {}),
        },
      },
    }],
  }),
];

/** Pasted HTML can carry rgb() colors or other fonts; null out any textStyle value the backend would reject. */
export function clean(doc: RichTextDoc): RichTextDoc {
  const ok = (list: readonly string[], v: unknown) => (list.includes(v as string) ? (v as string) : null);
  return JSON.parse(JSON.stringify(doc), (k, v) =>
    v?.type === "textStyle" && v.attrs
      ? { ...v, attrs: { color: isHex(v.attrs.color) ? v.attrs.color : null, fontFamily: ok(FONT_FAMILIES, v.attrs.fontFamily), fontSize: ok(FONT_SIZES, v.attrs.fontSize) } }
      : v,
  );
}

const para = (text: string): RichTextDoc => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

/** Starter copy seeded into blocks the sponsor hasn't written yet (contract: seed on first show). */
export function defaultCopy(id: TextBlockId, sponsor: string, event: string): RichTextDoc {
  const who = sponsor || "our sponsor";
  return para({
    headline: `Thank you, ${who}.`,
    thank_you: `${event} happened because partners like ${who} showed up for us. Thank you.`,
    narrative: "Tell the story of the day: who came, what happened, and what their support made possible.",
    proof_description: "Here is where your name showed up.",
    closing: "We could not have done it without you.",
  }[id]);
}

/** One text block, edited in place inside the report preview. */
export function BlockEditor({ doc, onChange, onFocus }: { doc: RichTextDoc; onChange: (d: RichTextDoc) => void; onFocus: (e: Editor) => void }) {
  const editor = useEditor({
    extensions,
    content: doc,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(clean(editor.getJSON() as RichTextDoc)),
    onFocus: ({ editor }) => onFocus(editor),
  });
  return <EditorContent editor={editor} />;
}

const tool = "btn-ghost min-w-11 px-2! text-[13px]!";
const on = "bg-raised! border-accent!";

/** Formatting for whichever block was last focused in the preview. */
export function Toolbar({ editor }: { editor: Editor | null }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => e && {
      font: e.getAttributes("textStyle").fontFamily ?? "",
      size: e.getAttributes("textStyle").fontSize ?? "",
      color: e.getAttributes("textStyle").color ?? "#000000",
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"),
      align: TEXT_ALIGNS.find((a) => e.isActive({ textAlign: a })) ?? "left",
    },
  });
  if (!editor || !s) return <p className="text-[13px] text-muted m-0">Click any text in the preview to start editing it.</p>;
  const run = () => editor.chain().focus();
  const keep = (e: React.MouseEvent) => e.preventDefault(); // keep the selection in the editor

  return (
    <div className="flex flex-wrap gap-1.5">
      <select className="input w-auto! flex-1" aria-label="Font" value={s.font}
        onChange={(e) => (e.target.value ? run().setFontFamily(e.target.value) : run().unsetFontFamily()).run()}>
        <option value="">Template font</option>
        {FONT_FAMILIES.map((f) => <option key={f}>{f}</option>)}
      </select>
      <select className="input w-auto!" aria-label="Size" value={s.size}
        onChange={(e) => (e.target.value ? run().setFontSize(e.target.value) : run().unsetFontSize()).run()}>
        <option value="">Auto</option>
        {FONT_SIZES.map((f) => <option key={f}>{f}</option>)}
      </select>
      <button type="button" onMouseDown={keep} className={`${tool} font-bold ${s.bold ? on : ""}`} aria-pressed={s.bold} aria-label="Bold" onClick={() => run().toggleBold().run()}>B</button>
      <button type="button" onMouseDown={keep} className={`${tool} italic ${s.italic ? on : ""}`} aria-pressed={s.italic} aria-label="Italic" onClick={() => run().toggleItalic().run()}>I</button>
      <button type="button" onMouseDown={keep} className={`${tool} underline ${s.underline ? on : ""}`} aria-pressed={s.underline} aria-label="Underline" onClick={() => run().toggleUnderline().run()}>U</button>
      <label className={`${tool} relative cursor-pointer`} aria-label="Text color">
        <span className="w-5 h-5 rounded border border-line-input" style={{ background: s.color }} />
        <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" value={s.color}
          onChange={(e) => run().setColor(e.target.value.toLowerCase()).run()} />
      </label>
      {TEXT_ALIGNS.map((a) => (
        <button key={a} type="button" onMouseDown={keep} className={`${tool} ${s.align === a ? on : ""}`} aria-pressed={s.align === a}
          aria-label={`Align ${a}`} onClick={() => run().setTextAlign(a).run()}>{a[0].toUpperCase()}</button>
      ))}
    </div>
  );
}
