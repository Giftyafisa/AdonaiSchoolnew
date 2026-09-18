import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Bold, FileUp, Heading2, Image as ImageIcon, Italic, Link as LinkIcon, List, ListOrdered, Play, Quote, Table2, Underline } from "lucide-react";

const ALLOWED_TAGS = new Set([
  "A", "B", "BLOCKQUOTE", "BR", "COL", "EM", "H2", "H3", "HR", "I", "IMG", "LI", "OL", "P", "STRONG", "TABLE", "TBODY", "TD", "TFOOT", "TH", "THEAD", "TR", "U", "UL", "VIDEO", "IFRAME",
]);
const ALLOWED_ATTRIBUTES = new Set(["alt", "class", "controls", "height", "href", "rel", "src", "target", "title", "width"]);

function validUrl(value: string, allowData = false) {
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:", ...(allowData ? ["data:"] : [])].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function isAllowedEmbed(value: string) {
  try {
    const url = new URL(value);
    return ["youtube.com", "www.youtube.com", "youtu.be", "player.vimeo.com", "vimeo.com"].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : null;
  } catch {
    return null;
  }
}

export function sanitizeRichHtml(html: string) {
  if (typeof DOMParser === "undefined") {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
      .replace(/(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "$1=\"#\"");
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,object,embed,form").forEach((node) => node.remove());
  doc.querySelectorAll("*").forEach((element) => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }
    Array.from(element.attributes).forEach((attribute) => {
      if (!ALLOWED_ATTRIBUTES.has(attribute.name.toLowerCase()) || attribute.name.toLowerCase().startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    });
    if (element.hasAttribute("href")) {
      const href = validUrl(element.getAttribute("href") ?? "");
      if (!href) element.removeAttribute("href"); else element.setAttribute("href", href);
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
    }
    if (element.hasAttribute("src")) {
      const src = element.tagName === "IFRAME" ? isAllowedEmbed(element.getAttribute("src") ?? "") : validUrl(element.getAttribute("src") ?? "");
      if (!src) element.remove(); else element.setAttribute("src", src);
    }
  });
  return doc.body.innerHTML;
}

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => Promise<string>;
  placeholder?: string;
};

export function RichTextEditor({ value, onChange, onUpload, placeholder = "Write the article here…" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "<p><br></p>";
    }
  }, [value]);

  const sync = () => onChange(sanitizeRichHtml(editorRef.current?.innerHTML ?? ""));
  const focusEditor = () => editorRef.current?.focus();
  const command = (name: string, commandValue?: string) => {
    focusEditor();
    document.execCommand(name, false, commandValue);
    sync();
  };

  const insertHtml = (html: string) => {
    focusEditor();
    document.execCommand("insertHTML", false, html);
    sync();
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>, kind: "image" | "video") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const url = await onUpload(file);
      if (kind === "image") insertHtml(`<p><img src="${url}" alt="${file.name.replace(/"/g, "")}" /></p>`);
      else insertHtml(`<p><video controls src="${url}">${file.name}</video></p>`);
    } finally {
      setBusy(false);
    }
  };

  const addLink = () => {
    const url = prompt("Paste the link URL");
    if (!url) return;
    const safe = validUrl(url);
    if (safe) command("createLink", safe);
  };

  const addEmbed = () => {
    const url = prompt("Paste a YouTube or Vimeo URL");
    if (!url) return;
    const safe = isAllowedEmbed(url);
    if (safe) insertHtml(`<p><iframe src="${safe}" title="Embedded video" width="100%" height="360" allowfullscreen></iframe></p>`);
  };

  const addTable = () => {
    const rows = Math.max(1, Number(prompt("Number of rows", "3") ?? 3));
    const columns = Math.max(1, Number(prompt("Number of columns", "2") ?? 2));
    const head = Array.from({ length: columns }, (_, index) => `<th>Heading ${index + 1}</th>`).join("");
    const body = Array.from({ length: rows - 1 }, () => `<tr>${Array.from({ length: columns }, () => "<td>Cell</td>").join("")}</tr>`).join("");
    insertHtml(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><p><br></p>`);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-input bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-secondary/40 p-2">
        <ToolButton label="Bold" onClick={() => command("bold")}><Bold className="h-4 w-4" /></ToolButton>
        <ToolButton label="Italic" onClick={() => command("italic")}><Italic className="h-4 w-4" /></ToolButton>
        <ToolButton label="Underline" onClick={() => command("underline")}><Underline className="h-4 w-4" /></ToolButton>
        <ToolButton label="Heading" onClick={() => command("formatBlock", "h2")}><Heading2 className="h-4 w-4" /></ToolButton>
        <ToolButton label="Bulleted list" onClick={() => command("insertUnorderedList")}><List className="h-4 w-4" /></ToolButton>
        <ToolButton label="Numbered list" onClick={() => command("insertOrderedList")}><ListOrdered className="h-4 w-4" /></ToolButton>
        <ToolButton label="Quote" onClick={() => command("formatBlock", "blockquote")}><Quote className="h-4 w-4" /></ToolButton>
        <ToolButton label="Link" onClick={addLink}><LinkIcon className="h-4 w-4" /></ToolButton>
        <ToolButton label="Table" onClick={addTable}><Table2 className="h-4 w-4" /></ToolButton>
        <ToolButton label="Upload inline image" onClick={() => imageInputRef.current?.click()}><ImageIcon className="h-4 w-4" /></ToolButton>
        <ToolButton label="Upload inline video" onClick={() => videoInputRef.current?.click()}><Play className="h-4 w-4" /></ToolButton>
        <ToolButton label="Embed YouTube or Vimeo" onClick={addEmbed}><FileUp className="h-4 w-4" /></ToolButton>
        {busy && <span className="ml-2 text-xs text-muted-foreground">Uploading…</span>}
      </div>
      <div
        ref={editorRef}
        contentEditable={!busy}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={sync}
        onBlur={sync}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text/plain").trim();
          if (/^https?:\/\/\S+$/i.test(text)) {
            event.preventDefault();
            const safe = validUrl(text);
            if (safe) insertHtml(`<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`);
          }
        }}
        className="prose prose-sm max-w-none min-h-64 p-4 outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_img]:my-3 [&_img]:max-h-96 [&_img]:rounded-xl [&_img]:object-contain [&_table]:my-3 [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-secondary [&_th]:p-2 [&_video]:my-3 [&_video]:max-h-96 [&_video]:w-full"
      />
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => handleUpload(event, "image")} />
      <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(event) => handleUpload(event, "video")} />
    </div>
  );
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" title={label} aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={onClick} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground">{children}</button>;
}
