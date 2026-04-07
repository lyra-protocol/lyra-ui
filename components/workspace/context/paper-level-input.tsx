export function PaperLevelInput({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  invalid = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  invalid?: boolean;
  hint?: string | null;
}) {
  return (
    <div className="border border-black/8 bg-white px-2">
      <label className="grid h-8 grid-cols-[72px_minmax(0,1fr)_auto] items-center text-[11px] text-black/82">
        <span className="text-black/42">{label}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          placeholder={placeholder}
          aria-invalid={invalid}
          className={`w-full bg-white pl-2 text-right tabular-nums outline-none placeholder:text-black/22 ${
            invalid ? "text-[#8a3b3b]" : ""
          }`}
        />
        {suffix ? <span className="pl-2 text-black/36">{suffix}</span> : null}
      </label>
      {hint ? <p className="pb-1 text-[9px] leading-4 text-[#8a3b3b]">{hint}</p> : null}
    </div>
  );
}
