import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in/:path*',
  '/sign-up/:path*',
  '/',
  '/api/inngest',
  // The callback validates a signed state and an http-only browser nonce.
  // Clerk must not consume this one-time provider redirect first.
  '/api/channel/callback',
])

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect()
    }
  },
  {
    // Local Windows clock drift can briefly exceed Clerk's five-second default.
    // Keep the normal production tolerance while allowing development sign-ins to recover.
    clockSkewInMs: process.env.NODE_ENV === 'development' ? 15_000 : 5_000,
  },
)

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk-specific frontend API routes
    '/__clerk/(.*)',
  ],
}
