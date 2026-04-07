import { Fragment, ReactNode } from "react";

type Block =
  | { type: "heading"; level: 2 | 3; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; ordered: boolean; items: string[] };

function parseBlocks(content: string) {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", content: paragraph.join(" ").trim() });
    paragraph = [];
  };

  const flushList = () => {
    if (!list || list.items.length === 0) return;
    blocks.push({ type: "list", ordered: list.ordered, items: [...list.items] });
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length >= 3 ? 3 : 2;
      blocks.push({ type: "heading", level, content: headingMatch[2].trim() });
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(orderedMatch[1].trim());
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bulletMatch[1].trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(content: string) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`} className="font-medium text-black/88">{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function renderListItem(content: string, index: number, ordered: boolean) {
  return (
    <li key={`${content}-${index}`} className="flex items-start gap-2 text-[11px] leading-[18px] text-black/72">
      <span className="mt-[2px] w-4 shrink-0 text-black/40">{ordered ? `${index + 1}.` : "•"}</span>
      <span>{renderInline(content)}</span>
    </li>
  );
}

export function AiMarkdownContent({ content }: { content: string }) {
  const blocks = parseBlocks(content.trim());

  return (
    <div className="space-y-2 text-[11px] leading-[18px] text-black/74">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const className = block.level === 2
            ? "text-[11px] font-medium uppercase tracking-[0.12em] text-black/44"
            : "text-[11px] font-medium text-black/82";
          return <p key={`${block.content}-${index}`} className={className}>{block.content}</p>;
        }

        if (block.type === "list") {
          return (
            <ul key={`${block.items[0] ?? index}-${index}`} className="space-y-1">
              {block.items.map((item, itemIndex) => renderListItem(item, itemIndex, block.ordered))}
            </ul>
          );
        }

        return (
          <p key={`${block.content}-${index}`} className="text-[11px] leading-[18px] text-black/74">
            {renderInline(block.content) as ReactNode}
          </p>
        );
      })}
    </div>
  );
}
