import { encrypt } from "@/lib/encryption";
import { getInsforgeAdminClient } from "@/lib/insforge-server";
import { getOAuthProvider } from "@/lib/social-oauth";
import { getOAuthStateCookieName } from "@/lib/social-oauth/pkce";
import { verifyOAuthState } from "@/lib/social-oauth/state";
import { OAuthProvider } from "@/lib/social-oauth/types";
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

function buildRedirectUrl(
    appUrl: string,
    redirectTo: string,
    params: Record<string, string>) {

    const url = new URL(redirectTo, appUrl);

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    return NextResponse.redirect(url);
}

function hasMatchingStateNonce(request: NextRequest, state: string) {
    const cookieValue = request.cookies.get(getOAuthStateCookieName(state))?.value;
    const expectedValue = state.split(".")[0];

    if (!cookieValue || !expectedValue) return false;
    const received = Buffer.from(cookieValue);
    const expected = Buffer.from(expectedValue);
    return received.length === expected.length && timingSafeEqual(received, expected);
}

function clearOAuthCookies(response: NextResponse, state: string) {
    response.cookies.delete(getOAuthStateCookieName(state));
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const stateParams = searchParams.get('state');
    const providerError = searchParams.get('error');

    if (!stateParams) {
        return buildRedirectUrl(APP_URL, '/handles', {
            connected: "false",
            error: "missing_state"
        });
    }
    try {
        const state = verifyOAuthState(stateParams);
        const redirectTo = state?.redirectTo || `${APP_URL}/handles`;

        if (!hasMatchingStateNonce(request, stateParams)) {
            return buildRedirectUrl(APP_URL, redirectTo, {
                connected: "false",
                error: "invalid_oauth_session",
            });
        }

        if (providerError) {
            const response = buildRedirectUrl(APP_URL, redirectTo, {
                connected: "false",
                error: providerError
            })
            clearOAuthCookies(response, stateParams)
            return response
        }

        if (!code) {
            const response = buildRedirectUrl(APP_URL, redirectTo, {
                connected: "false",
                error: "missing_code"
            })
            clearOAuthCookies(response, stateParams)
            return response
        }

        const insforge = getInsforgeAdminClient()

        const provider = getOAuthProvider(state.channelType) as OAuthProvider;
        const redirectUri = `${APP_URL}/api/channel/callback`;

        const token = await provider.exchangeCodeForToken({
            code,
            redirectUri,
        })

        const profile = await provider.getProfile({
            accessToken: token.accessToken
        })

        if (!profile.providerAccountId) {
            throw new Error("The provider did not return a channel account.")
        }


        const payload = {
            user_id: state.userId,
            channel_type_id: state.channelTypeId,
            provider_account_id: profile.providerAccountId ?? null,
            handle: profile.handle ?? null,
            profile_image: profile.profileImage ?? null,
            profile_url: profile.profileUrl ?? null,
            access_token: encrypt(token.accessToken),
            refresh_token: encrypt(token.refreshToken ?? null),
            token_expires_at: token.expiresAt ?? null,
            is_connected: true,
            is_active: true,
        }

        const { error } = await insforge.database
            .from("user_channels")
            .upsert(payload, {
                onConflict: "user_id,channel_type_id"
            })

        if (error) {
            console.error("Unable to save connected channel", {
                code: error.code,
                message: error.message,
            });
            const response = buildRedirectUrl(APP_URL, redirectTo, {
                connected: "false",
                error: "failed_to_upsert_user_channel"
            })
            clearOAuthCookies(response, stateParams)
            return response
        }

        const response = buildRedirectUrl(APP_URL, redirectTo, {
            connected: "true",
            channelType: state.channelType,
        })
        clearOAuthCookies(response, stateParams)
        return response
    } catch (error) {
        console.error('OAuth callback error:', error);
        const response = buildRedirectUrl(APP_URL, '/handles', {
            connected: "false",
            error: "oauth_callback_failed"
        });
        
        const stateParams = new URL(request.url).searchParams.get('state');
        if (stateParams) {
            clearOAuthCookies(response, stateParams);
        }
        return response;
    }
}
