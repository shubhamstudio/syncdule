import { auth } from '@clerk/nextjs/server';
import { createAdminClient, createClient, type InsForgeClient } from '@insforge/sdk';
import "server-only";

// Environment variables
const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
const PROJECT_API_KEY = process.env.INSFORGE_PROJECT_API_KEY
const TEMPLATE = process.env.CLERK_INSFORGE_TEMPLATE;

const SERVER_TOKEN_TEMPLATE = TEMPLATE || 'insforge';

export async function getInsforgeServerClient(): Promise<{ insforge: InsForgeClient; userId: string | null }> {
  if (!BASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_INSFORGE_BASE_URL or INSFORGE_BASE_URL environment variable');
  }
  if (!ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_INSFORGE_ANON_KEY or INSFORGE_ANON_KEY environment variable');
  }

  const session = await auth();
  const { userId } = session;

  const token = userId
    ? await session.getToken({ template: SERVER_TOKEN_TEMPLATE })
    : null;

  if (userId && !token) {
    throw new Error('No Clerk token received for InsForge client');
  }

  const insforge = createClient({
    baseUrl: BASE_URL,
    anonKey: ANON_KEY,
    accessToken: token ?? undefined,
    isServerMode: true,
  });

  return { insforge, userId };
}

export function getInsforgeAdminClient(): InsForgeClient {
  // Validate environment variables
  if (!BASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_INSFORGE_BASE_URL or INSFORGE_BASE_URL environment variable');
  }
  if (!ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_INSFORGE_ANON_KEY or INSFORGE_ANON_KEY environment variable');
  }
  if (!PROJECT_API_KEY) {
    throw new Error('Missing INSFORGE_PROJECT_API_KEY or INSFORGE_API_KEY environment variable');
  }

  return createAdminClient({
    baseUrl: BASE_URL,
    apiKey: PROJECT_API_KEY,
  });
}

export const getInsforgeUploadClient = getInsforgeAdminClient;
