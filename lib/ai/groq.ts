import "server-only";

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGroq } from "@langchain/groq";

const DEFAULT_MODEL = "openai/gpt-oss-120b";

type GenerateTextInput = {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
};

function getApiKey() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq is not configured. Add GROQ_API_KEY to the server environment.");
  }
  return apiKey;
}

function contentToText(content: Awaited<ReturnType<ChatGroq["invoke"]>>["content"]) {
  if (typeof content === "string") return content.trim();

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      return "text" in part && typeof part.text === "string" ? part.text : "";
    })
    .join("")
    .trim();
}

/**
 * Single server-only boundary for all product AI generation.
 * Keeping provider setup here makes a later model switch non-invasive.
 */
export async function generateGroqText({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  maxTokens = 800,
}: GenerateTextInput) {
  const model = new ChatGroq({
    apiKey: getApiKey(),
    model: process.env.GROQ_MODEL ?? DEFAULT_MODEL,
    temperature,
    maxTokens,
    timeout: 15_000,
    maxRetries: 2,
  });

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);
  const text = contentToText(response.content);

  if (!text) throw new Error("Groq returned an empty response.");
  return text;
}
