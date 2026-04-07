import "server-only";

import { AiOpportunitySettings } from "@/core/paper/types";
import { mapWorkspaceIdentity } from "@/core/server/services/paper-mappers";
import { ensureWorkspaceUser, WorkspaceIdentitySeedInput } from "@/core/server/services/workspace-user-service";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

export type AiOpportunitySettingsInput = AiOpportunitySettings;

function normalizeSettings(input: Partial<AiOpportunitySettingsInput>): AiOpportunitySettingsInput {
  return {
    enabled: input.enabled !== false,
    minimumConfidence: Math.min(95, Math.max(60, Math.round(input.minimumConfidence ?? 82))),
    minimumScore: Math.min(20, Math.max(6, Number((input.minimumScore ?? 11.5).toFixed(2)))),
    minimumRiskReward: Math.min(5, Math.max(1, Number((input.minimumRiskReward ?? 1.6).toFixed(2)))),
    maximumEntryDistancePercent: Math.min(4, Math.max(0.2, Number((input.maximumEntryDistancePercent ?? 0.85).toFixed(2)))),
    maximumAlertsPerScan: Math.min(3, Math.max(1, Math.round(input.maximumAlertsPerScan ?? 1))),
  };
}

export async function updateAiOpportunitySettings(
  identity: WorkspaceIdentitySeedInput,
  input: Partial<AiOpportunitySettingsInput>
) {
  const workspaceUser = await ensureWorkspaceUser(identity);
  const settings = normalizeSettings(input);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("workspace_users")
    .update({
      ai_opportunity_alerts_enabled: settings.enabled,
      ai_opportunity_min_confidence: settings.minimumConfidence,
      ai_opportunity_min_score: settings.minimumScore,
      ai_opportunity_min_rr: settings.minimumRiskReward,
      ai_opportunity_max_entry_distance_pct: settings.maximumEntryDistancePercent,
      ai_opportunity_max_alerts_per_scan: settings.maximumAlertsPerScan,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceUser.id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Unable to update AI opportunity settings: ${error?.message ?? "unknown error"}`);
  }

  return mapWorkspaceIdentity(data).aiOpportunitySettings;
}
