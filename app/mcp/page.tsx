import { Mcp } from "@/components/mcp";

export const metadata = {
  title: "Lyra — MCP",
  description:
    "Read Lyra's record from Claude, Cursor or any MCP client. Read-only, no key required.",
};

export default function McpPage() {
  return <Mcp />;
}
