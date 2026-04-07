"use client";

import { useEffect } from "react";
import { useWorkspaceAuth } from "@/hooks/use-workspace-auth";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function WorkspaceSessionSync() {
  const auth = useWorkspaceAuth();
  const setMode = useWorkspaceStore((state) => state.setMode);

  useEffect(() => {
    if (!auth.ready) {
      return;
    }

    setMode(auth.authenticated ? "paper" : "guest");
  }, [auth.authenticated, auth.ready, setMode]);

  return null;
}
