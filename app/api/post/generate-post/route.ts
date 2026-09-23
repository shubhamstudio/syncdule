import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateGroqText } from "@/lib/ai/groq";
import { consumeAiQuota, getBillingStatus } from "@/lib/billing";
import { getAuthenticatedInsforgeAdminClient } from "@/lib/server/insforge-admin";

const ACTIONS = ["generate", "rephrase", "shorten", "expand"] as const;
type ActionType = (typeof ACTIONS)[number];

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, content = "", prompt = "", channelId, structured = false } = await request.json();
    if (!ACTIONS.includes(action as ActionType)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    if (action === "generate" && !String(prompt).trim()) {
      return NextResponse.json({ error: "Prompt is required for generate action" }, { status: 400 });
    }

    const billing = await getBillingStatus();
    if (!billing.canUseAI) {
      return NextResponse.json(
        { error: "Your AI generation quota is used for this billing cycle. Choose another plan to continue." },
        { status: 403 },
      );
    }

    let channelType: string | undefined;
    let characterLimit: number | undefined;
    // The request is already authenticated by Clerk above. Using the admin
    // client here avoids requiring a separate Clerk-to-InsForge JWT template
    // just to read the public channel type lookup.
    const { insforge } = await getAuthenticatedInsforgeAdminClient();
    if (!insforge) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (channelId) {
      const { data: channelData, error: channelError } = await insforge.database
        .from("channel_types")
        .select("type, character_limit")
        .eq("id", channelId)
        .single();

      if (channelError) return NextResponse.json({ error: "Invalid channel ID" }, { status: 400 });
      if (!channelData) return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      channelType = channelData.type;
      characterLimit = channelData.character_limit;
    }

    const text = await generateGroqText({
      systemPrompt: buildSystemPrompt(channelType, characterLimit, Boolean(structured && action === "generate")),
      userPrompt: buildPrompt(action as ActionType, String(content), String(prompt)),
      temperature: action === "generate" ? 0.75 : 0.45,
      maxTokens: characterLimit ? Math.min(1200, Math.max(200, Math.ceil(characterLimit / 2))) : 800,
    });

    // Only record usage after a non-empty provider response. This prevents a
    // timeout or provider error from taking one of the user's generations.
    const quota = await consumeAiQuota("post-copy");
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "Your AI generation quota is used for this billing cycle. Choose another plan to continue." },
        { status: 403 },
      );
    }

    const generated = structured && action === "generate" ? parseStructuredPost(text) : { content: text };
    return NextResponse.json({ ...generated, quota: quota.billing.quota });
  } catch (error) {
    console.error("Post generation failed", error);
    return NextResponse.json({ error: "Failed to generate post" }, { status: 500 });
  }
}

function buildSystemPrompt(channelType?: string, characterLimit?: number, structured = false) {
  const systemPrompt = [
    "You are a social media writing assistant.",
    structured
      ? 'Return only valid JSON with string keys "title", "description", and "content".'
      : "Return only the final post text.",
    "Do not add quotes, labels, bullet points, or explanations outside the requested response.",
    "Do not use markdown formatting like **, *, #, or backticks.",
  ];
  if (channelType) {
    systemPrompt.push("Write for " + channelType + ". Match its tone, style, expected length, and relevant hashtags.");
  }
  if (characterLimit) systemPrompt.push("Stay under " + characterLimit + " characters.");
  return systemPrompt.join("\n");
}

function parseStructuredPost(text: string) {
  const cleanText = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const objectStart = cleanText.indexOf("{");
  const objectEnd = cleanText.lastIndexOf("}");
  const json = objectStart >= 0 && objectEnd >= objectStart
    ? cleanText.slice(objectStart, objectEnd + 1)
    : cleanText;

  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const title = readString(parsed.title) || readString(parsed.headline);
    const description = readString(parsed.description) || readString(parsed.caption) || readString(parsed.summary);
    const content = readString(parsed.content) || readString(parsed.body) || description;
    const fallback = content || description || title || cleanText;

    return {
      title: title || titleFromText(fallback),
      description: description || fallback,
      content: content || fallback,
    };
  } catch {
    // Some models occasionally add a short preface or return plain text even
    // when JSON is requested. Still provide usable fields instead of failing
    // the complete generation.
    return {
      title: titleFromText(cleanText),
      description: cleanText,
      content: cleanText,
    };
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function titleFromText(text: string) {
  const firstLine = text.split(/\n|[.!?]/)[0]?.trim() || "Untitled post";
  return firstLine.slice(0, 100);
}

function buildPrompt(action: ActionType, content: string, prompt: string) {
  if (action === "generate") return "Write one clean social media post based on this request:\n" + prompt;
  if (!content.trim()) throw new Error("Content is required for this action");
  if (action === "rephrase") return "Rephrase this social media post while keeping the meaning:\n" + content;
  if (action === "shorten") return "Shorten this social media post while keeping the key message:\n" + content;
  return "Expand this social media post with more helpful detail while keeping the same tone:\n" + content;
}
