"use client";

import { Separator } from "react-resizable-panels";

type WorkspaceResizeHandleProps = {
  direction: "horizontal" | "vertical";
};

export function WorkspaceResizeHandle({ direction }: WorkspaceResizeHandleProps) {
  const isVertical = direction === "vertical";

  return (
    <Separator
      className={[
        "relative shrink-0 bg-transparent",
        isVertical ? "w-2 -mx-1" : "h-2 -my-1",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "absolute bg-black/18",
          isVertical
            ? "left-1/2 top-0 h-full w-px -translate-x-1/2"
            : "left-0 top-1/2 h-px w-full -translate-y-1/2",
        ].join(" ")}
      />
    </Separator>
  );
}
