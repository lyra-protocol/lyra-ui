import type { Metadata } from "next";
import "./globals.css";
import { getPrivyEnv } from "@/core/auth/privy-env";
import { AppProvider } from "@/providers/app-provider";

export const metadata: Metadata = {
  title: "Lyra UI",
  description: "Lyra trading workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const privy = getPrivyEnv();

  return (
    <html lang="en">
      <body>
        <AppProvider
          privyAppId={privy.appId}
          privyClientId={privy.clientId}
          privyServerAuthReady={privy.serverAuthReady}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
