import { QueryClient } from "@tanstack/react-query";

let browserQueryClient: QueryClient | undefined;

function createWorkspaceQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

export function getWorkspaceQueryClient() {
  if (typeof window === "undefined") {
    return createWorkspaceQueryClient();
  }

  browserQueryClient ??= createWorkspaceQueryClient();
  return browserQueryClient;
}
