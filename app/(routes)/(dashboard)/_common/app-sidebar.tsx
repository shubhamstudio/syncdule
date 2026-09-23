"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { AtSign, Calendar, CreditCard, Lightbulb, PanelsTopLeft, Plus, Settings, Zap } from "lucide-react";
import { useState } from "react";
import Logo from "@/components/logo";
import CreatePostDialog from "@/components/schedule/create-post-dialog";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Ideas", href: "/ideas", icon: Lightbulb },
  { name: "Schedule", href: "/schedule", icon: Calendar },
  { name: "Handles", href: "/handles", icon: AtSign },
  { name: "Viral Suggestor", href: "/viral-suggestor", icon: Zap },
  { name: "Billing", href: "/billing", icon: CreditCard },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  const { user } = useUser();
  const [createOpen, setCreateOpen] = useState(false);
  const showLabels = state === "expanded" || isMobile;

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#09090b]">
        <SidebarHeader className={cn("items-center p-3", showLabels && "items-stretch p-4")}>
          <div className={cn("flex w-full items-center", showLabels ? "justify-between" : "flex-col gap-2")}>
            <Link
              href="/"
              aria-label="SYNCDULE home"
              className="rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              <Logo hideName={!showLabels} className={cn(!showLabels && "justify-center")} />
            </Link>
            <SidebarTrigger aria-label={showLabels ? "Collapse sidebar" : "Expand sidebar"} className="hidden text-muted-foreground hover:bg-white/[0.06] hover:text-foreground md:inline-flex" />
          </div>
          {showLabels ? <div className="mt-4 flex items-center gap-3 rounded-md border border-primary/20 bg-primary/[0.055] px-3 py-3" aria-label="Creator workspace"><span className="grid size-8 place-items-center rounded-md bg-primary/15 text-primary"><PanelsTopLeft className="size-4" /></span><span><span className="block font-mono text-[10px] font-medium uppercase tracking-[0.13em] text-primary/80">Workspace</span><span className="mt-0.5 block text-sm font-medium text-sidebar-foreground">Creator workspace</span></span></div> : null}
          <Button size={showLabels ? "lg" : "icon-lg"} aria-label="Create a new post" className={cn("mt-4 rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary/90", !showLabels && "mt-5")} onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {showLabels ? "New Post" : null}
          </Button>
        </SidebarHeader>
        <SidebarContent className={cn("px-2 pt-3", showLabels && "px-3")}>
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map(({ name, href, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild tooltip={name} isActive={pathname === href} className="h-11 rounded-md text-sidebar-foreground/65 transition-colors hover:bg-white/[0.06] hover:text-sidebar-foreground data-active:bg-white/[0.10] data-active:text-sidebar-foreground">
                      <Link href={href} aria-label={name}>
                        <Icon className="size-[18px]" />
                        {showLabels ? <span className="text-sm">{name}</span> : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className={cn("border-t border-white/10 p-3", showLabels && "p-4")}>
          <SidebarMenu className="mb-3">
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings" isActive={pathname === "/settings"} className="h-10 rounded-md text-sidebar-foreground/65 hover:bg-white/[0.06] hover:text-sidebar-foreground data-active:bg-white/[0.10] data-active:text-sidebar-foreground">
                <Link href="/settings" aria-label="Settings"><Settings className="size-[18px]" />{showLabels ? <span className="text-sm">Settings</span> : null}</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className={cn("flex items-center gap-2", !showLabels && "justify-center")}>
            <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
            {showLabels ? <span className="truncate text-sm text-sidebar-foreground/80">{user?.fullName || user?.primaryEmailAddress?.emailAddress}</span> : null}
          </div>
        </SidebarFooter>
      </Sidebar>
      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
