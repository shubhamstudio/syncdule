import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateGroqText } from "@/lib/ai/groq";
import { consumeAiQuota } from "@/lib/billing";

const platforms = ["Instagram", "YouTube", "Facebook", "LinkedIn"] as const;
const formats = ["Reel/Short", "Carousel", "Long-form", "Static post"] as const;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = (await request.json()) as Record<string, string | boolean>;
    if (
      !platforms.includes(input.platform as (typeof platforms)[number]) ||
      !formats.includes(input.format as (typeof formats)[number]) ||
      !String(input.niche ?? "").trim() ||
      !String(input.audience ?? "").trim()
    ) {
      return NextResponse.json({ error: "Platform, format, niche, and target audience are required." }, { status: 400 });
    }

    const quota = await consumeAiQuota("viral-suggestor");
    if (!quota.allowed) {
      return NextResponse.json({ error: "Your AI generation quota is used for this billing cycle." }, { status: 403 });
    }

    const topic = input.surprise
      ? "Surprise me with a fresh angle."
      : "Optional trend/topic: " + String(input.trend || "none") + ".";
    const raw = await generateGroqText({
      systemPrompt: [
        "You are an ethical social-media strategist.",
        "Return only valid JSON with keys hooks (array of 3 strings), outline (array of 4 strings), hashtags (array of 8 strings), rationale (string).",
        "Do not promise virality, fabricate trends, or use markdown.",
      ].join(" "),
      userPrompt:
        "Create an evidence-aware content angle for " +
        input.platform +
        ". Niche: " +
        input.niche +
        ". Format: " +
        input.format +
        ". Tone: " +
        (input.tone || "engaging") +
        ". Audience: " +
        input.audience +
        ". " +
        topic,
      temperature: 0.85,
      maxTokens: 1000,
    });
    const suggestion = JSON.parse(raw);

    return NextResponse.json({ suggestion, quota: quota.billing.quota });
  } catch (error) {
    console.error("Viral suggestor failed", error);
    return NextResponse.json({ error: "Unable to generate a suggestion right now. No additional generation was requested." }, { status: 500 });
  }
}
