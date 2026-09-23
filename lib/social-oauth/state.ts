import { ChannelTypeEnum } from "@/constants/channels"
import { createHmac, timingSafeEqual } from "crypto"


function getOAuthStateSecret() {
    const secret = process.env.CHANNEL_OAUTH_STATE_SECRET
    if (!secret) {
        throw new Error('CHANNEL_OAUTH_STATE_SECRET is not defined')
    }
    return secret
}

export type OAuthStatePayload = {
  userId: string
  channelTypeId: string
  channelType: ChannelTypeEnum
  /** Binds the signed callback state to the browser that started the flow. */
  nonce: string
  redirectTo?: string
  exp: number
}
export function createOAuthState(payload: Omit<OAuthStatePayload, 'exp'> & {
    expiresInMs?: number
}) {
    const statePayload:OAuthStatePayload = {
        ...payload,
        exp: Date.now() + (payload.expiresInMs ?? 10 * 60 * 1000)
    }
    const encodedState = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

    const signature = createHmac('sha256', getOAuthStateSecret()).update(encodedState).digest('base64url');

    return `${encodedState}.${signature}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload {
    const [encodedState, signature] = state.split('.');
    if(!encodedState || !signature) {
        throw new Error('Invalid state format');
    }
    const expectedSignature = createHmac('sha256', getOAuthStateSecret()).update(encodedState).digest('base64url');

    const providedSignature = Buffer.from(signature)
    const expectedSignatureBuffer = Buffer.from(expectedSignature)
    const isValid = providedSignature.length === expectedSignatureBuffer.length &&
        timingSafeEqual(providedSignature, expectedSignatureBuffer);
    if (!isValid) {
        throw new Error('Invalid state signature');
    }
    const statePayload = JSON.parse(Buffer.from(encodedState, 'base64url').toString('utf-8'));


    if (!statePayload.exp || statePayload.exp < Date.now()) {
        throw new Error('OAuth state expired');
    }
    if (typeof statePayload.nonce !== 'string' || statePayload.nonce.length < 32) {
        throw new Error('Invalid OAuth state nonce');
    }
    return statePayload;
}
