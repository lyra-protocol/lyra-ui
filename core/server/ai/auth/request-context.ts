import "server-only";

import { authenticatePrivyRequest } from "@/core/server/auth/privy-server";
import { ensureWorkspaceUser, WorkspaceIdentitySeedInput } from "@/core/server/services/workspace-user-service";

export type AiRequestContext = {
  identitySeed: WorkspaceIdentitySeedInput;
  workspaceUser: Awaited<ReturnType<typeof ensureWorkspaceUser>>;
};

export async function getAiRequestContext(request: Request): Promise<AiRequestContext> {
  const auth = await authenticatePrivyRequest(request);
  const identitySeed: WorkspaceIdentitySeedInput = {
    privyUserId: auth.privyUserId,
    walletAddress: request.headers.get("x-wallet-address"),
    email: request.headers.get("x-user-email"),
    displayName: request.headers.get("x-user-name"),
  };

  return {
    identitySeed,
    workspaceUser: await ensureWorkspaceUser(identitySeed),
  };
}
