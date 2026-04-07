"use client";

import { createContext, useContext } from "react";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";

type PrivyStatus = {
  appIdConfigured: boolean;
  serverAuthReady: boolean;
};

type PrivyAppProviderProps = {
  appId?: string;
  clientId?: string;
  serverAuthReady: boolean;
  children: React.ReactNode;
};

const statusFallback: PrivyStatus = {
  appIdConfigured: false,
  serverAuthReady: false,
};

const PrivyStatusContext = createContext<PrivyStatus>(statusFallback);

const privyConfig = {
  appearance: {
    theme: "light" as const,
    accentColor: "#0a0a0a" as const,
    landingHeader: "Connect wallet",
    loginMessage: "Use Google, email, or your wallet to enter Lyra.",
    showWalletLoginFirst: true,
    walletChainType: "ethereum-only" as const,
    walletList: [
      "detected_ethereum_wallets",
      "metamask",
      "phantom",
      "coinbase_wallet",
      "rainbow",
      "okx_wallet",
      "wallet_connect",
    ] as const,
  },
  loginMethods: ["wallet", "google", "email"] as const,
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets" as const,
    },
  },
} satisfies PrivyClientConfig;

export function usePrivyStatus() {
  return useContext(PrivyStatusContext);
}

export function PrivyAppProvider({
  appId,
  clientId,
  serverAuthReady,
  children,
}: PrivyAppProviderProps) {
  const status = {
    appIdConfigured: Boolean(appId),
    serverAuthReady,
  };

  if (!appId) {
    return <PrivyStatusContext.Provider value={status}>{children}</PrivyStatusContext.Provider>;
  }

  return (
    <PrivyStatusContext.Provider value={status}>
      <PrivyProvider appId={appId} clientId={clientId || undefined} config={privyConfig}>
        {children}
      </PrivyProvider>
    </PrivyStatusContext.Provider>
  );
}
