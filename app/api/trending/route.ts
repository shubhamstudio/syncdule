import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateGroqText } from "@/lib/ai/groq";
import { consumeAiQuota } from "@/lib/billing";

const platforms = ["Instagram", "YouTube", "Facebook", "LinkedIn"] as const;

export type TrendingResult = {
  trends: Array<{
    topic: string;
    angle: string;
    format: string;
    hashtags: string[];
    why: string;
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = (await request.json()) as Record<string, string>;

    if (
      !String(input.niche ?? "").trim() ||
      !platforms.includes(input.platform as (typeof platforms)[number])
    ) {
      return NextResponse.json(
        { error: "Niche and platform are required." },
        { status: 400 }
      );
    }

    const quota = await consumeAiQuota("trending-finder");
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "Your AI generation quota is used for this billing cycle." },
        { status: 403 }
      );
    }

    const raw = await generateGroqText({
      systemPrompt: [
        "You are a social-media trend analyst with deep knowledge of content trends across platforms.",
        "Return ONLY valid JSON — an object with key 'trends', which is an array of exactly 5 objects.",
        "Each object must have: topic (string), angle (string — a unique content spin on it), format (string — best content format), hashtags (array of 4 strings), why (string — 1 sentence on why it is gaining traction).",
        "Base your answer on known patterns, seasonality, and platform-specific behavior. Do not fabricate specific data or virality promises. No markdown.",
      ].join(" "),
      userPrompt:
        `Find 5 trending or high-potential content topics right now for the "${input.niche}" niche on ${input.platform}.` +
        (input.audience ? ` Target audience: ${input.audience}.` : ""),
      temperature: 0.8,
      maxTokens: 1200,
    });

    const result: TrendingResult = JSON.parse(raw);

    return NextResponse.json({ result, quota: quota.billing.quota });
  } catch (error) {
    console.error("Trending finder failed", error);
    return NextResponse.json(
      { error: "Unable to find trends right now." },
      { status: 500 }
    );
  }
}
