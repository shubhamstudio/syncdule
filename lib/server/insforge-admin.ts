import "server-only";

import { auth } from "@clerk/nextjs/server";
import { getInsforgeAdminClient } from "@/lib/insforge-server";

/**
 * Returns an admin database client only after Clerk has authenticated the request.
 *
 * Route handlers must still scope every query by `userId`; the admin client bypasses
 * InsForge RLS so scheduling does not depend on a separate Clerk JWT template.
 */
export async function getAuthenticatedInsforgeAdminClient() {
  const { userId } = await auth();

  return {
    insforge: userId ? getInsforgeAdminClient() : null,
    userId,
  };
}
