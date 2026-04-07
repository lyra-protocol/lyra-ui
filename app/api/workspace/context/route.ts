import { authenticatePrivyRequest } from "@/core/server/auth/privy-server";
import { getPaperWorkspaceContext } from "@/core/server/services/paper-workspace-service";

export async function GET(request: Request) {
  try {
    const auth = await authenticatePrivyRequest(request);
    const walletAddress = request.headers.get("x-wallet-address");
    const email = request.headers.get("x-user-email");
    const displayName = request.headers.get("x-user-name");
    const context = await getPaperWorkspaceContext({
      privyUserId: auth.privyUserId,
      walletAddress,
      email,
      displayName,
    });

    return Response.json(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load workspace.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 500;

    return Response.json(
      { error: message },
      { status }
    );
  }
}
