export const LYRA_AGENT_URL = process.env.LYRA_AGENT_URL ?? "https://lyra-agent-vercel.vercel.app";

export async function proxyAgentGet(path: string): Promise<Response> {
  return fetch(`${LYRA_AGENT_URL}${path}`, { cache: "no-store" });
}

export async function proxyAgentPost(path: string, body?: unknown): Promise<Response> {
  return fetch(`${LYRA_AGENT_URL}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    body !== undefined ? JSON.stringify(body) : undefined,
    cache:   "no-store",
  });
}
