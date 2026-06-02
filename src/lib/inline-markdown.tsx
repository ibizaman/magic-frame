import React from "react";

// Inline-Markdown wie Todoist es in task-content liefert → React-Nodes.
// Bewusst klein (kein Parser-Dependency, kein dangerouslySetInnerHTML → kein
// XSS): [text](url), **bold**, __bold__, *italic*, _italic_, ~~strike~~,
// `code`. Keine Verschachtelung — reicht für Aufgaben-/Listen-Titel.
//
// Links werden als <span> mit window.open gerendert (nicht <a>), weil die
// Rows <button>-Elemente sind und ein <a> darin verschachteltes interaktives
// HTML wäre. stopPropagation verhindert, dass der Link-Klick die Task abhakt.
const INLINE =
  /(\[[^\]]+\]\(https?:\/\/[^\s)]+\))|(\*\*[^*]+\*\*)|(__[^_]+__)|(~~[^~]+~~)|(`[^`]+`)|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)/g;

export function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return text;
  // Schneller Ausstieg, wenn gar kein Markdown-Marker vorkommt.
  if (!/[*_~]/.test(text) && !text.includes("[") && !text.includes("`")) {
    return text;
  }

  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];

    if (m[1]) {
      // [label](url)
      const split = tok.indexOf("](");
      const label = tok.slice(1, split);
      const url = tok.slice(split + 2, -1);
      out.push(
        <span
          key={key++}
          role="link"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          className="underline underline-offset-2 cursor-pointer"
        >
          {label}
        </span>,
      );
    } else if (m[2] || m[3]) {
      out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (m[4]) {
      out.push(<s key={key++}>{tok.slice(2, -2)}</s>);
    } else if (m[5]) {
      out.push(
        <code key={key++} className="font-mono text-[0.92em] opacity-90">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (m[6] || m[7]) {
      out.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    }

    last = idx + tok.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}
