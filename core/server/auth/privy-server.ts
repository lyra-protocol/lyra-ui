import "server-only";

import { PrivyClient } from "@privy-io/node";
import { getServerEnv } from "@/core/config/server-env";

type AuthenticatedRequest = {
  privyUserId: string;
};

let cachedClient: PrivyClient | null = null;

function getPrivyServerClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getServerEnv();
  cachedClient = new PrivyClient({
    appId: env.privyAppId,
    appSecret: env.privySecret,
  });

  return cachedClient;
}

function extractAccessToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    throw new Error("Missing bearer token");
  }

  return header.slice(7).trim();
}

export async function authenticatePrivyRequest(request: Request): Promise<AuthenticatedRequest> {
  const accessToken = extractAccessToken(request);
  const payload = await getPrivyServerClient().utils().auth().verifyAccessToken(accessToken);

  return {
    privyUserId: payload.user_id,
  };
}
