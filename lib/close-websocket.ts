/** Tear down a WebSocket without "closed before connection established" console noise. */
export function closeWebSocket(ws: WebSocket | null | undefined): void {
  if (!ws) return;
  ws.onopen = null;
  ws.onmessage = null;
  ws.onclose = null;
  ws.onerror = null;
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    try {
      ws.close();
    } catch {
      /* noop */
    }
  }
}
