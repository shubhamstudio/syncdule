import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
export function LandingActions({ isSignedIn, className, compact = false }: { isSignedIn: boolean | undefined; className?: string; compact?: boolean }) { const label = isSignedIn ? "Open workspace" : "Start for free"; return <div className={cn("landing-actions", className)}><Link href={isSignedIn ? "/schedule" : "/sign-up"} className="landing-button landing-button-primary">{label}<ArrowRight aria-hidden="true" className="size-4" /></Link>{!compact && !isSignedIn && <Link href="/sign-in" className="landing-button landing-button-secondary">Log in</Link>}</div>; }
