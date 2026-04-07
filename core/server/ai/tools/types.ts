import type { FunctionTool } from "openai/resources/responses/responses";
import { AiContextPacket, AiWorkspaceSelection } from "@/core/ai/types";
import { WorkspaceIdentitySeedInput } from "@/core/server/services/workspace-user-service";

export type AiToolExecutionContext = {
  identitySeed: WorkspaceIdentitySeedInput;
  workspaceUserId: string;
  selection: AiWorkspaceSelection;
  context: AiContextPacket;
};

type AiToolExecutor<TArgs extends Record<string, unknown>> = {
  bivarianceHack: (args: TArgs, context: AiToolExecutionContext) => Promise<Record<string, unknown>>;
}["bivarianceHack"];

export type AiToolDefinition<TArgs extends Record<string, unknown> = Record<string, unknown>> = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: AiToolExecutor<TArgs>;
};

export type AiFunctionTool = FunctionTool;
