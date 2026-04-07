import "server-only";

import { getServerEnv } from "@/core/config/server-env";

export function getPrivyEnv() {
  const env = getServerEnv();

  return {
    appId: env.privyAppId,
    clientId: env.privyClientId,
    appIdConfigured: Boolean(env.privyAppId),
    clientIdConfigured: Boolean(env.privyClientId),
    serverAuthReady: Boolean(env.privyAppId && env.privySecret),
  };
}
