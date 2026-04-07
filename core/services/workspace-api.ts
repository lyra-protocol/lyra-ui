import {
  PaperPositionLevelsMutationResult,
  PaperPositionLevelsRequest,
  PaperTradeMutationResult,
  PaperTradeRequest,
  PaperWorkspaceContext,
} from "@/core/paper/types";

type WorkspaceRequestIdentity = {
  walletAddress?: string | null;
  email?: string | null;
  displayName?: string | null;
};

async function requestJson<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
  identity?: WorkspaceRequestIdentity
) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (identity?.walletAddress) headers.set("x-wallet-address", identity.walletAddress);
  if (identity?.email) headers.set("x-user-email", identity.email);
  if (identity?.displayName) headers.set("x-user-name", identity.displayName);

  const response = await fetch(path, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function fetchPaperWorkspaceContext(
  accessToken: string,
  identity: WorkspaceRequestIdentity
) {
  return requestJson<PaperWorkspaceContext>("/api/workspace/context", accessToken, undefined, identity);
}

export function createPaperTrade(accessToken: string, input: PaperTradeRequest) {
  return requestJson<PaperTradeMutationResult>("/api/paper/trades", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePaperPositionLevels(accessToken: string, input: PaperPositionLevelsRequest) {
  return requestJson<PaperPositionLevelsMutationResult>(
    `/api/paper/positions/${encodeURIComponent(input.productId)}/levels`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        stopLoss: input.stopLoss,
        takeProfit: input.takeProfit,
        note: input.note,
      }),
    }
  );
}

export function dismissPaperBalanceBanner(accessToken: string) {
  return requestJson<{ ok: true }>("/api/workspace/onboarding/paper-balance", accessToken, {
    method: "PATCH",
  });
}
