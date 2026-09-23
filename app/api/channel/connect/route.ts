import { ChannelTypeEnum, SUPPORTED_CHANNEL_TYPES } from "@/constants/channels";
import { getInsforgeServerClient } from "@/lib/insforge-server";
import { getMissingOAuthConfiguration, getOAuthProvider } from "@/lib/social-oauth";
import { getOAuthStateCookieName } from "@/lib/social-oauth/pkce";
import { createOAuthState } from "@/lib/social-oauth/state";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function POST(request: NextRequest) {
    try {
        const { insforge, userId } = await getInsforgeServerClient();
        if (!userId) return NextResponse.json({ error: "User not found" }, { status: 401 });

        const { channelTypeId, redirectTo: requestedRedirectTo } = await request.json();
        if (!channelTypeId) return NextResponse.json({ error: "Channel type ID is required" }, { status: 400 });

        const { data: channelType, error } = await insforge.database
            .from("channel_types")
            .select("id, type, name")
            .eq("id", channelTypeId)
            .single();

        if (error || !channelType) {
            return NextResponse.json({ error: "Channel type not found" }, { status: 404 });
        }

        if (!SUPPORTED_CHANNEL_TYPES.includes(channelType.type as ChannelTypeEnum)) {
            return NextResponse.json({ error: "Channel type is not supported" }, { status: 400 });
        }

        if (!APP_URL) {
            return NextResponse.json({ error: "Channel integrations are not configured yet." }, { status: 503 });
        }

        const missingConfiguration = getMissingOAuthConfiguration(channelType.type as ChannelTypeEnum);
        if (missingConfiguration.length > 0) {
            return NextResponse.json({
                error: `${channelType.name} is not configured yet. Ask an administrator to add its OAuth settings.`,
            }, { status: 503 });
        }

        const returnPath = requestedRedirectTo === "/handles" || requestedRedirectTo === "/settings"
            ? requestedRedirectTo
            : "/handles";
        const redirectTo = `${APP_URL}${returnPath}`;

        const provider = getOAuthProvider(channelType.type as ChannelTypeEnum);
        const state = createOAuthState({
            userId,
            channelTypeId: channelType.id,
            channelType: channelType.type,
            redirectTo,
            nonce: randomBytes(32).toString("base64url"),
        });

        const callbackUrl = `${APP_URL}/api/channel/callback`;

        const url = provider.getAuthorizationUrl({
            state,
            redirectUri: callbackUrl,
        });

        const response = NextResponse.json({ url });
        response.cookies.set(getOAuthStateCookieName(state), state.split(".")[0], {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 10 * 60,
            path: "/",
        });
        return response;

    } catch (error) {
        console.error("Error connecting channel:", error);
        return NextResponse.json({ error: "Failed to connect channel" }, { status: 500 });
    }
}
