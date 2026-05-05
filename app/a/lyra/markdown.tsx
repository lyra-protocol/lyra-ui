// Tiny markdown renderer for Lyra's prose. Intentionally minimal: handles
// what gpt-5.5 actually emits — bold, italic, inline code, links, lists,
// blockquotes, h2/h3 — and nothing else. Avoids a 30 KB dep for prose that
// is already structured by the model.

import React from "react";

function inline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) {
      parts.push(buf);
      buf = "";
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // Inline code
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i) {
        flush();
        parts.push(
          <code
            key={`c${i}`}
            style={{
              fontFamily: 'ui-monospace, "SF Mono", monospace',
              fontSize: "0.92em",
              background: "rgba(122,201,192,0.08)",
              border: "1px solid rgba(122,201,192,0.2)",
              padding: "0 4px",
              borderRadius: 3,
              color: "#7AC9C0",
            }}
          >
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }

    // Bold **...**
    if (ch === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end > i + 1) {
        flush();
        parts.push(
          <strong key={`b${i}`} style={{ fontWeight: 600, color: "#FFFFFF" }}>
            {inline(text.slice(i + 2, end))}
          </strong>,
        );
        i = end + 2;
        continue;
      }
    }

    // Italic *...*
    if (ch === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end > i) {
        flush();
        parts.push(
          <em key={`i${i}`} style={{ fontStyle: "italic" }}>
            {text.slice(i + 1, end)}
          </em>,
        );
        i = end + 1;
        continue;
      }
    }

    // Link [text](url)
    if (ch === "[") {
      const close = text.indexOf("]", i);
      if (close > i && text[close + 1] === "(") {
        const urlEnd = text.indexOf(")", close + 2);
        if (urlEnd > close + 1) {
          flush();
          const label = text.slice(i + 1, close);
          const href = text.slice(close + 2, urlEnd);
          parts.push(
            <a
              key={`l${i}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#7AC9C0",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              {label}
            </a>,
          );
          i = urlEnd + 1;
          continue;
        }
      }
    }

    buf += ch;
    i++;
  }
  flush();
  return parts;
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "h2" | "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; lines: string[] };

function blocks(src: string): Block[] {
  const lines = src.split("\n");
  const out: Block[] = [];
  let para: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] | null = null;

  const flushPara = () => {
    if (para.length) {
      out.push({ kind: "p", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(list);
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote && quote.length) {
      out.push({ kind: "quote", lines: quote });
      quote = null;
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushAll();
      continue;
    }

    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      flushAll();
      out.push({ kind: "h2", text: h2[1] });
      continue;
    }
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      flushAll();
      out.push({ kind: "h3", text: h3[1] });
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      flushQuote();
      if (!list || list.kind !== "ul") {
        flushList();
        list = { kind: "ul", items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const ordered = line.match(/^(\d+)\.\s+(.*)$/);
    if (ordered) {
      flushPara();
      flushQuote();
      if (!list || list.kind !== "ol") {
        flushList();
        list = { kind: "ol", items: [] };
      }
      list.items.push(ordered[2]);
      continue;
    }

    const q = line.match(/^>\s?(.*)$/);
    if (q) {
      flushPara();
      flushList();
      if (!quote) quote = [];
      quote.push(q[1]);
      continue;
    }

    flushList();
    flushQuote();
    para.push(line);
  }

  flushAll();
  return out;
}

export function Markdown({
  text,
  color,
}: {
  text: string;
  color: string;
}) {
  const parsed = blocks(text);
  return (
    <div className="space-y-3">
      {parsed.map((b, i) => {
        if (b.kind === "p")
          return (
            <p key={i} className="text-[14px] leading-[1.7]" style={{ color }}>
              {inline(b.text)}
            </p>
          );
        if (b.kind === "h2")
          return (
            <h2
              key={i}
              className="mt-4 text-[12px] font-semibold tracking-[0.18em]"
              style={{ color: "#FFFFFF" }}
            >
              {b.text.toUpperCase()}
            </h2>
          );
        if (b.kind === "h3")
          return (
            <h3
              key={i}
              className="mt-3 text-[12px] font-medium"
              style={{ color: "#ECECE6" }}
            >
              {b.text}
            </h3>
          );
        if (b.kind === "ul")
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {b.items.map((it, j) => (
                <li
                  key={j}
                  className="flex gap-2 text-[14px] leading-[1.7]"
                  style={{ color }}
                >
                  <span style={{ color: "#5A5852" }}>—</span>
                  <span className="flex-1">{inline(it)}</span>
                </li>
              ))}
            </ul>
          );
        if (b.kind === "ol")
          return (
            <ol key={i} className="space-y-1.5 pl-1" start={1}>
              {b.items.map((it, j) => (
                <li
                  key={j}
                  className="flex gap-2 text-[14px] leading-[1.7]"
                  style={{ color }}
                >
                  <span className="tabular-nums" style={{ color: "#5A5852" }}>
                    {String(j + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">{inline(it)}</span>
                </li>
              ))}
            </ol>
          );
        if (b.kind === "quote")
          return (
            <blockquote
              key={i}
              className="border-l-2 pl-3 text-[14px] leading-[1.7]"
              style={{ borderColor: "#2A2926", color: "#A8A69E" }}
            >
              {b.lines.map((l, j) => (
                <p key={j}>{inline(l)}</p>
              ))}
            </blockquote>
          );
        return null;
      })}
    </div>
  );
}
