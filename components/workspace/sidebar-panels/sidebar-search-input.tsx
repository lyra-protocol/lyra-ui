"use client";

import { Search } from "lucide-react";

type SidebarSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export function SidebarSearchInput({
  value,
  onChange,
  placeholder,
}: SidebarSearchInputProps) {
  return (
    <div className="px-2 py-1">
      <label className="flex h-7 items-center gap-1.5 border-b border-black/8 px-0.5 text-black/34 transition focus-within:border-black/18">
        <Search className="h-3 w-3 shrink-0" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full bg-transparent text-[10px] text-black/82 outline-none placeholder:text-black/28"
        />
      </label>
    </div>
  );
}
