type Props = {
  enterLabel?: string;
  onEnterTrade?: () => void;
  onExplain?: () => void;
  onFindAlternative?: () => void;
};

function ActionButton({
  label,
  onClick,
  strong = false,
}: {
  label: string;
  onClick?: () => void;
  strong?: boolean;
}) {
  if (!onClick) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-8 items-center justify-center border px-3 text-[10px] font-medium transition",
        strong
          ? "border-black bg-black text-white hover:bg-black/88"
          : "border-black/10 bg-white text-black/72 hover:bg-black/[0.02]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export function AiSignalActions({ enterLabel, onEnterTrade, onExplain, onFindAlternative }: Props) {
  if (!onEnterTrade && !onExplain && !onFindAlternative) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5 border-t border-black/6 pt-2">
      <ActionButton label="Break it down" onClick={onExplain} />
      <ActionButton label="Find better setup" onClick={onFindAlternative} />
      <ActionButton label={enterLabel ?? "Use setup"} onClick={onEnterTrade} strong />
    </div>
  );
}
