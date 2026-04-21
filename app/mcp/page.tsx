import { McpConnectorPage } from "@/components/mcp/mcp-connector-page";

export const metadata = {
  title: "Lyra MCP — connector URL",
  description: "Generate a session and copy your Streamable HTTP MCP URL for Claude.",
};

export default function McpPage() {
  return <McpConnectorPage />;
}
