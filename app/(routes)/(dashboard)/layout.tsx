import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./_common/app-sidebar";
import { CircleDot, Sparkles } from "lucide-react";
import { MobileWorkspaceNav } from "@/components/mobile-workspace-nav";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="workspace-shell h-[100dvh] min-h-0 overflow-hidden">
    <SidebarProvider defaultOpen className="h-full min-h-0">
            <AppSidebar />
            <SidebarInset
            className="workspace-canvas h-full min-h-0 min-w-0 overflow-hidden border-none"
            >
            <div className="workspace-grid h-full min-h-0 overflow-hidden px-0 py-0 md:px-4 md:py-4">
            <div className="workspace-panel mx-auto flex h-full min-h-0 w-full max-w-[1800px] flex-col overflow-hidden border border-white/10 shadow-2xl shadow-black/30 md:rounded-xl">
              <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-black/20 px-4 backdrop-blur-xl md:px-6">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="text-muted-foreground hover:bg-white/6 hover:text-foreground md:hidden" />
                  <div>
                    <p className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      <CircleDot className="size-3 text-primary" /> Workspace
                    </p>
                    <p className="mt-0.5 text-sm font-medium tracking-tight">Build your publishing rhythm</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="group hidden cursor-help items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-xs font-medium text-primary transition-all hover:border-primary/45 hover:bg-primary/[0.12] sm:flex">
                        Creative workspace ready
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Use Ideas to plan, Schedule to publish, and Viral Suggestor for AI-led angles.</TooltipContent>
                  </Tooltip>
                </div>
              </header>
              <main className="dashboard-page-scroll relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-24 pt-2 md:pb-3 md:py-3">{children}</main>
            </div>
            </div>
        </SidebarInset>
        <MobileWorkspaceNav />
    </SidebarProvider>
    </div>
  )
}
