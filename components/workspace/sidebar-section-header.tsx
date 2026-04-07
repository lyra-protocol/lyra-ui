import { ReactNode } from "react";

type SidebarSectionHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SidebarSectionHeader({
  title,
  description,
  action,
}: SidebarSectionHeaderProps) {
  return (
    <div className="px-2 pb-1 pt-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[9px] uppercase tracking-[0.14em] text-black/34">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[10px] leading-4 text-black/38">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
