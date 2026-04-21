"use client";

import {
  MousePointer2,
  Minus,
  Ruler,
  Brush,
  Type,
  Smile,
  Eraser,
  Magnet,
  ImageIcon,
  Camera,
  ZoomIn,
  Settings,
  Lock,
} from "lucide-react";

const TOOLS = [
  { id: "cursor", icon: MousePointer2 },
  { id: "trend", icon: Minus },
  { id: "ruler", icon: Ruler },
  { id: "brush", icon: Brush },
  { id: "text", icon: Type },
  { id: "emoji", icon: Smile },
  { id: "eraser", icon: Eraser },
  { id: "magnet", icon: Magnet },
  { id: "image", icon: ImageIcon },
  { id: "camera", icon: Camera },
  { id: "zoom", icon: ZoomIn },
  { id: "lock", icon: Lock },
  { id: "settings", icon: Settings },
];

export function BulkChartToolRail() {
  return (
    <nav
      aria-label="Chart tools"
      className="flex h-full w-9 shrink-0 flex-col items-center gap-0 border-r border-[var(--line)] bg-[var(--panel)] py-2"
    >
      {TOOLS.map(({ id, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={id}
          title={id}
          className="flex h-8 w-8 items-center justify-center text-foreground/45 transition hover:bg-foreground/[0.05] hover:text-foreground/85"
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </nav>
  );
}
