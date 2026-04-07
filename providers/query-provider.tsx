"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getWorkspaceQueryClient } from "@/lib/query-client";

export function QueryProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <QueryClientProvider client={getWorkspaceQueryClient()}>{children}</QueryClientProvider>;
}
