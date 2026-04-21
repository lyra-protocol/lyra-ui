"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-[var(--line)] bg-[var(--panel)] text-foreground shadow-[0_1px_0_rgba(0,0,0,0.08)]",
        className
      )}
      {...props}
    />
  );
}

