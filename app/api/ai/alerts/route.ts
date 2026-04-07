import { after } from "next/server";
import { getAiRequestContext } from "@/core/server/ai/auth/request-context";
import { acknowledgeAiAlert, listAiAlerts } from "@/core/server/ai/conversation/repository";
import { runAiOpportunityMonitor } from "@/core/server/ai/triggers/opportunity-monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const requestContext = await getAiRequestContext(request);
    after(async () => {
      await runAiOpportunityMonitor(requestContext).catch(() => undefined);
    });
    const alerts = await listAiAlerts(requestContext.workspaceUser.id);
    return Response.json({ alerts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load AI alerts.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const requestContext = await getAiRequestContext(request);
    const payload = (await request.json()) as { alertId?: string };
    if (!payload.alertId) {
      return Response.json({ error: "alertId is required." }, { status: 400 });
    }

    const alert = await acknowledgeAiAlert(payload.alertId, requestContext.workspaceUser.id);
    return Response.json({ alert });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update AI alert.";
    const status = message.toLowerCase().includes("bearer") ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
