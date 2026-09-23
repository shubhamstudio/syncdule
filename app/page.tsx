"use client";

import "./(routes)/(landing)/landing.css";
import "./(routes)/(landing)/navbar.css";
import "./(routes)/(landing)/responsive.css";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import {
  ChannelsSection,
  ClosingSection,
  FaqSection,
  FeaturesSection,
  WorkflowSection,
} from "@/components/landing/content-sections";
import { Hero } from "@/components/landing/hero";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

function LandingPageContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = searchParams.get("auth");
  const authMode = auth === "sign-in" || auth === "sign-up" ? auth : null;

  // Keep links shared before the dedicated auth pages were introduced from
  // leaving an authenticated user on an empty modal state.
  useEffect(() => {
    if (!authMode || !isLoaded) return;

    router.replace(isSignedIn ? "/calendar" : `/${authMode}`);
  }, [authMode, isLoaded, isSignedIn, router]);

  return (
    <div className="landing-neo">
      <SiteHeader isSignedIn={isSignedIn} />
      <main>
        <Hero isSignedIn={isSignedIn} />
        <WorkflowSection />
        <FeaturesSection />
        <ChannelsSection />
        <FaqSection />
        <ClosingSection isSignedIn={isSignedIn} />
      </main>
      <SiteFooter />
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageContent />
    </Suspense>
  );
}
