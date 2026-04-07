import "server-only";

import { getAzureOpenAiClient, getAzureOpenAiModel } from "@/core/server/ai/azure-openai-client";

function cleanTitle(value: string) {
  return value
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function generateAiThreadTitle(args: {
  market: string;
  timeframe: string;
  userMessage: string;
  assistantReply: string;
}) {
  const response = await getAzureOpenAiClient().chat.completions.create({
    model: getAzureOpenAiModel(),
    messages: [
      {
        role: "system",
        content:
          "Create a short workspace thread title in 2 to 6 words. No quotes. No punctuation unless needed. Focus on the user's market topic.",
      },
      {
        role: "user",
        content: `Market: ${args.market}\nTimeframe: ${args.timeframe}\nUser: ${args.userMessage}\nAssistant: ${args.assistantReply}`,
      },
    ],
    max_tokens: 24,
  });

  return cleanTitle(response.choices[0]?.message?.content || "") || `${args.market} ${args.timeframe}`;
}
