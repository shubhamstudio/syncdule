import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateGroqText } from "@/lib/ai/groq";
import { consumeAiQuota, getBillingStatus } from "@/lib/billing";

type GeneratedIdea = {
  title: string;
  description: string;
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { businessType, targetAudience } = await request.json();
    if (!String(businessType ?? "").trim() || !String(targetAudience ?? "").trim()) {
      return NextResponse.json({ error: "Missing businessType or targetAudience" }, { status: 400 });
    }

    const billing = await getBillingStatus();
    if (!billing.canUseAI) {
      return NextResponse.json(
        { error: "Your AI generation quota is used for this billing cycle. Choose another plan to continue." },
        { status: 403 },
      );
    }

    const text = await generateGroqText({
      systemPrompt: [
        "You are a social media content ideation assistant.",
        "Return only valid JSON.",
        'The response must be an object with an "ideas" array.',
        'Each item must have: "title" and "description".',
        "Generate 3 ideas.",
        "Keep titles catchy.",
        "Keep descriptions practical and specific.",
        "Do not use markdown formatting like **, *, #, or backticks.",
        "Return plain text only inside the JSON strings.",
      ].join("\n"),
      userPrompt: "Business type: " + String(businessType) + ". Target audience: " + String(targetAudience) + ".",
      temperature: 0.8,
      maxTokens: 700,
    });
    const ideas = parseGeneratedIdeas(text);
    if (ideas.length === 0) {
      throw new Error("The AI response did not include any usable ideas.");
    }

    // Do not charge a generation when the provider response is invalid.
    const quota = await consumeAiQuota("ideas");
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "Your AI generation quota is used for this billing cycle. Choose another plan to continue." },
        { status: 403 },
      );
    }

    return NextResponse.json({ ideas, quota: quota.billing.quota });
  } catch (error) {
    console.error("Error generating ideas:", error);
    return NextResponse.json({ error: "Failed to generate ideas" }, { status: 500 });
  }
}

function parseGeneratedIdeas(text: string): GeneratedIdea[] {
  const withoutCodeFence = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const objectStart = withoutCodeFence.indexOf("{");
  const objectEnd = withoutCodeFence.lastIndexOf("}");
  const json = objectStart >= 0 && objectEnd >= objectStart
    ? withoutCodeFence.slice(objectStart, objectEnd + 1)
    : withoutCodeFence;
  const parsed = JSON.parse(json) as { ideas?: unknown };

  if (!Array.isArray(parsed.ideas)) return [];

  return parsed.ideas
    .map((idea): GeneratedIdea | null => {
      if (!idea || typeof idea !== "object") return null;
      const { title, description } = idea as Record<string, unknown>;
      if (typeof title !== "string" || typeof description !== "string") return null;
      const normalizedTitle = title.trim();
      const normalizedDescription = description.trim();
      return normalizedTitle && normalizedDescription
        ? { title: normalizedTitle, description: normalizedDescription }
        : null;
    })
    .filter((idea): idea is GeneratedIdea => idea !== null)
    .slice(0, 3);
}
