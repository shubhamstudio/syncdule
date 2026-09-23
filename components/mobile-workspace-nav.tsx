"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Lightbulb, Menu, Plus, Zap } from "lucide-react";
import { useState } from "react";
import CreatePostDialog from "@/components/schedule/create-post-dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const items = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/viral-suggestor", label: "Viral", icon: Zap },
];

export function MobileWorkspaceNav() {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      <nav aria-label="Workspace navigation" className="fixed inset-x-0 bottom-0 z-40 grid h-[72px] grid-cols-5 border-t border-white/10 bg-[#09090b]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {items.slice(0, 2).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-medium", pathname === href ? "text-primary" : "text-muted-foreground")}><Icon className="size-[18px]" /><span>{label}</span></Link>)}
        <button type="button" aria-label="Create a new post" onClick={() => setCreateOpen(true)} className="relative flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-primary"><span className="-mt-7 grid size-12 place-items-center rounded-full border border-orange-200/20 bg-primary text-primary-foreground shadow-lg shadow-orange-950/50"><Plus className="size-5" /></span><span className="-mt-0.5">New Post</span></button>
        {items.slice(2).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("flex flex-col items-center justify-center gap-1 text-[10px] font-medium", pathname === href ? "text-primary" : "text-muted-foreground")}><Icon className="size-[18px]" /><span>{label}</span></Link>)}
        <SidebarTrigger className="h-auto rounded-none text-muted-foreground hover:bg-transparent hover:text-foreground"><Menu className="size-[18px]" /><span className="sr-only">More</span></SidebarTrigger>
      </nav>
      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
