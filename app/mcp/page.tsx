import { McpConnectorPage } from "@/components/mcp/mcp-connector-page";

export const metadata = {
  title: "Lyra — Connect Claude (MCP)",
  description:
    "Mint a Lyra MCP token, copy your Streamable HTTP connector URL, and follow Claude integration steps for Lyra trading tools.",
};

export default function McpPage() {
  return <McpConnectorPage />;
}
