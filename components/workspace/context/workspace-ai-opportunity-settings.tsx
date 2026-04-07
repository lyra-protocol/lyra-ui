"use client";

import { AiOpportunitySettings } from "@/core/paper/types";
import { useAiOpportunitySettings } from "@/hooks/use-ai-opportunity-settings";

const PRESETS = {
  balanced: {
    label: "Balanced",
    settings: { minimumConfidence: 78, minimumScore: 10.5, minimumRiskReward: 1.5, maximumEntryDistancePercent: 1.2 },
  },
  selective: {
    label: "Selective",
    settings: { minimumConfidence: 82, minimumScore: 11.5, minimumRiskReward: 1.6, maximumEntryDistancePercent: 0.85 },
  },
  conviction: {
    label: "High conviction",
    settings: { minimumConfidence: 88, minimumScore: 12.5, minimumRiskReward: 1.9, maximumEntryDistancePercent: 0.55 },
  },
} as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

function detectPreset(settings: AiOpportunitySettings | null) {
  if (!settings) return "selective";
  for (const [key, preset] of Object.entries(PRESETS)) {
    if (
      settings.minimumConfidence === preset.settings.minimumConfidence &&
      Number(settings.minimumScore.toFixed(2)) === preset.settings.minimumScore &&
      Number(settings.minimumRiskReward.toFixed(2)) === preset.settings.minimumRiskReward &&
      Number(settings.maximumEntryDistancePercent.toFixed(2)) === preset.settings.maximumEntryDistancePercent
    ) {
      return key as keyof typeof PRESETS;
    }
  }
  return null;
}

export function WorkspaceAiOpportunitySettings({ open, onClose }: Props) {
  const { settings, ready, saving, saveSettings } = useAiOpportunitySettings();
  const activePreset = detectPreset(settings);

  if (!open) {
    return null;
  }

  return (
    <div className="absolute right-3 top-11 z-20 flex w-[320px] flex-col border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between border-b border-black/8 px-3 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-black/34">Opportunity alerts</p>
          <p className="mt-0.5 text-[11px] text-black/52">Only notify when a setup is worth reviewing.</p>
        </div>
        <button type="button" onClick={onClose} className="text-[11px] text-black/44 transition hover:text-black/76">
          Close
        </button>
      </div>

      <div className="space-y-3 px-3 py-3 text-[11px] text-black/72">
        <label className="flex items-center justify-between gap-3 border border-black/8 px-2.5 py-2">
          <div>
            <p className="font-medium text-black/82">Notify me on strong setups</p>
            <p className="mt-0.5 text-[10px] text-black/46">Keep Lyra quiet until the setup is clean.</p>
          </div>
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-black"
            checked={settings?.enabled ?? true}
            disabled={!ready || saving}
            onChange={(event) => void saveSettings({ enabled: event.target.checked })}
          />
        </label>

        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-black/34">Profile</p>
          <div className="mt-1 flex gap-1">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                disabled={!ready || saving}
                onClick={() => void saveSettings(preset.settings)}
                className={[
                  "flex-1 border px-2 py-1.5 text-[10px] font-medium transition",
                  activePreset === key ? "border-black bg-black text-white" : "border-black/10 text-black/66 hover:border-black/16 hover:text-black/84",
                ].join(" ")}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-black/34">Min RR</span>
            <select
              value={settings?.minimumRiskReward?.toFixed(1) ?? "1.6"}
              disabled={!ready || saving}
              onChange={(event) => void saveSettings({ minimumRiskReward: Number(event.target.value) })}
              className="h-8 w-full border border-black/10 bg-white px-2 text-[11px] text-black/78 outline-none"
            >
              {[1.3, 1.5, 1.6, 1.8, 2.0, 2.5].map((value) => (
                <option key={value} value={value.toFixed(1)}>{value.toFixed(1)}R</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-black/34">Alerts / scan</span>
            <select
              value={String(settings?.maximumAlertsPerScan ?? 1)}
              disabled={!ready || saving}
              onChange={(event) => void saveSettings({ maximumAlertsPerScan: Number(event.target.value) })}
              className="h-8 w-full border border-black/10 bg-white px-2 text-[11px] text-black/78 outline-none"
            >
              {[1, 2, 3].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="border-t border-black/8 pt-2 text-[10px] leading-4 text-black/48">
          {settings ? (
            <p>
              Now requiring <span className="font-medium text-black/70">{settings.minimumConfidence}%+</span> confidence,
              <span className="font-medium text-black/70"> {settings.minimumRiskReward.toFixed(1)}R+</span>, and price within
              <span className="font-medium text-black/70"> {settings.maximumEntryDistancePercent.toFixed(2)}%</span> of the trigger.
            </p>
          ) : (
            <p>Loading alert rules…</p>
          )}
        </div>
      </div>
    </div>
  );
}
