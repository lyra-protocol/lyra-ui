import type { Metadata } from "next";
import { McpInstallOnboarding } from "@/components/mcp/mcp-install-onboarding";

export const metadata: Metadata = {
  title: "Lyra — Finish Claude MCP install",
  description: "Paste your Lyra token and copy the Streamable HTTP connector URL for Claude.",
};

export default function McpInstallPage() {
  return <McpInstallOnboarding />;
}
