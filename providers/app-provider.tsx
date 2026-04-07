"use client";

import { PrivyAppProvider } from "@/providers/privy-provider";
import { QueryProvider } from "@/providers/query-provider";

export function AppProvider({
  privyAppId,
  privyClientId,
  privyServerAuthReady,
  children,
}: Readonly<{
  privyAppId?: string;
  privyClientId?: string;
  privyServerAuthReady: boolean;
  children: React.ReactNode;
}>) {
  return (
    <QueryProvider>
      <PrivyAppProvider
        appId={privyAppId}
        clientId={privyClientId}
        serverAuthReady={privyServerAuthReady}
      >
        {children}
      </PrivyAppProvider>
    </QueryProvider>
  );
}
