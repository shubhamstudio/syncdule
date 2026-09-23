"use client"

import { Suspense, useState } from "react";
import { useQueryState } from "nuqs"
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarIcon, LayoutList, Plus } from "lucide-react";
import ListView from "@/components/schedule/list-view";
import CalendarView from "@/components/schedule/calendar-view";
import CreatePostDialog from "@/components/schedule/create-post-dialog";
import { PageHeader } from "@/components/workspace-ui";

type ViewType = "calendar" | "list"
const SchedulePageContent = () => {
  const pathname = usePathname();
  const isCalendarPage = pathname === "/calendar";
  const [activeView, setActiveView] = useQueryState("scheduleView", {
    defaultValue: "calendar",
  });
  const [, setStatus] = useQueryState("status", {
    defaultValue: "",
  })
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false)
  return (
    <div className="flex flex-col h-full">
      <PageHeader eyebrow={isCalendarPage ? "Publishing calendar" : "Publishing control room"} title={isCalendarPage ? "Calendar" : "All channels"} description={isCalendarPage ? "See every scheduled post by date, status, and social handle in one place." : "Plan, review, and publish every channel from one focused queue."} actions={<>
          <ToggleGroup
            type="single"
            value={activeView}
            onValueChange={(value) => {
              //reset the url status
              setStatus(null)
              setActiveView(value as ViewType)

            }}
            className="rounded-md border border-white/10 bg-white/[0.025] p-0.5"
          >
            <ToggleGroupItem value="list"
              className="gap-2 my-px"
            >
              <LayoutList className="size-4" />
              <span className="text-sm">List</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar">
              <CalendarIcon className="size-4" />
              <span className="text-sm">Calendar</span>
            </ToggleGroupItem>
          </ToggleGroup>
          <Button className="rounded-md font-semibold" onClick={() => setCreatePostModalOpen(true)}>
            <Plus className="size-4" />
            Add Post
          </Button>
      </>} />

      <div className="flex-1 overflow-hidden">
        {activeView === "list" ? (
          <ListView setCreatePostModalOpen={setCreatePostModalOpen} />
        ) : (
          <CalendarView />
        )}
      </div>

      <CreatePostDialog 
        open={createPostModalOpen}
        onOpenChange={setCreatePostModalOpen}
      />
    </div>
  )
}



const SchedulePage = () => {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading your schedule…</div>}>
      <NuqsAdapter>
        <SchedulePageContent />
      </NuqsAdapter>
    </Suspense>
  )
}

export default SchedulePage
