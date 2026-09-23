"use client"
import * as React from "react"
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar"
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop"
import { format, parse, startOfWeek, getDay, addHours, isBefore, startOfDay } from "date-fns"
import { enUS } from "date-fns/locale"
import { CalendarDays, ChevronLeft, ChevronRight, Plus, } from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"

import "react-big-calendar/lib/css/react-big-calendar.css"
import "react-big-calendar/lib/addons/dragAndDrop/styles.css"
import "./post-calendar.css"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getChannelIcon } from "@/constants/channels"
import { PostType } from "@/types/post.type"

const locales = { "en-US": enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})
const DragAndDropCalendar = withDragAndDrop(Calendar)

const statusLabel: Record<string, string> = {
  draft: "Draft",
  queue: "Scheduled",
  published: "Posted",
  failed: "Failed",
};

const statusClass: Record<string, string> = {
  draft: "bg-white/10 text-muted-foreground",
  queue: "bg-sky-400/15 text-sky-200",
  published: "bg-emerald-400/15 text-emerald-200",
  failed: "bg-rose-400/15 text-rose-200",
};


interface PostCalendarProps {
  posts: PostType[]
  isPending: boolean
  currentDate: Date
  view: "month" | "week"
  onViewChange: (view: string) => void
  onDateChange: (date: Date) => void
  onPostClick: (post: PostType) => void
  onCreatePost: (date: Date) => void
  onReschedule: (post: PostType, scheduledAt: Date) => void
  onDateClick?: (date: Date) => void
  rightActions?: React.ReactNode
  viewLabel?: string
}

export function PostCalendar({
  posts,
  isPending,
  currentDate,
  view,
  onViewChange,
  onDateChange,
  onPostClick,
  onCreatePost,
  onReschedule,
  onDateClick,
  rightActions,
  viewLabel,
}: PostCalendarProps) {
  const events = React.useMemo(() =>
    isPending ? [] : posts.map(p => ({
      ...p,
      title: p.content,
      start: new Date(p.scheduled_at),
      end: addHours(new Date(p.scheduled_at), 1),
    })), [posts, isPending]
  )

  const formats = React.useMemo(() => ({
    weekdayFormat: (date: Date, culture?: string, localizer?: any) =>
      localizer.format(date, 'EEEE', culture),

    dayFormat: (date: Date, culture?: string, localizer?: any) =>
      localizer.format(date, 'EEEE d', culture),
  }), []);

  const isWeekView = view === "week"

  const CustomToolbar = (toolbar: any) => {
    return (
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center overflow-hidden rounded-md border border-white/10 bg-white/[0.025]">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-r border-white/10" onClick={() => toolbar.onNavigate('PREV')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => toolbar.onNavigate('NEXT')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-foreground">
              {format(toolbar.date, "MMMM yyyy")}
            </span>

            <label
              className="relative flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.025] px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/45 hover:bg-primary/[0.045] hover:text-foreground focus-within:border-primary/45 focus-within:ring-1 focus-within:ring-primary/40"
            >
              <span>Go to</span>
              <span className="font-semibold tracking-[0.04em] text-foreground">{format(toolbar.date, "dd-MM-yyyy")}</span>
              <CalendarDays className="size-3.5 text-muted-foreground" />
              <input
                aria-label="Go to a date"
                type="date"
                value={format(toolbar.date, "yyyy-MM-dd")}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
                onChange={(event) => {
                  const date = new Date(`${event.target.value}T12:00:00`)
                  if (!Number.isNaN(date.getTime())) {
                    toolbar.onNavigate("DATE", date)
                    onDateClick?.(date)
                  }
                }}
              />
            </label>

            {viewLabel ? (
              <span className="rounded-md border border-primary/20 bg-primary/[0.06] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
                {viewLabel}
              </span>
            ) : null}
            <span className="hidden text-[10px] text-muted-foreground lg:inline">Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          </div>

          <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
            {rightActions}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative flex h-full min-h-[520px] min-w-[680px] flex-col bg-transparent md:min-w-0")}>
      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        date={currentDate}
        formats={formats}
        step={isWeekView ? 15 : 60}
        timeslots={10}
        min={new Date(2026, 0, 1, 0, 0)}
        max={new Date(2026, 0, 1, 22, 0)}
        onNavigate={onDateChange}
        view={view === "month" ? Views.MONTH : Views.WEEK}
        onView={(v) => onViewChange(v === Views.MONTH ? "month" : "week")}
        onSelectEvent={(event: any) => onPostClick(event)}
        onEventDrop={({ event, start }) => onReschedule(event as PostType, start as Date)}
        selectable={Boolean(onDateClick)}
        onSelectSlot={({ start, action }) => {
          if (action === "click") onDateClick?.(start as Date)
        }}
      
        // In week view, disable past time slots 
        // and style them differently
        slotPropGetter={(date) => {
          const isPastSlot = isBefore(date, new Date())
          return isPastSlot
            ? {
              className: "rbc-time-slot-disabled",
              style: {
                backgroundColor: "hsl(var(--muted) / 0.35)",
                pointerEvents: "none",
              },
            }
            : {}
        }}
        // In month view, disable past dates and style them differently
        dayPropGetter={(date: Date) => {
          const isPastDate = isBefore(date, new Date())
          return {
            className: isPastDate ? "bg-[#331f000f]!" : "",
            style: isPastDate ? { backgroundColor: "hsl(var(--muted) / 0.5)" } : {}
          }
        }}
        components={{
          toolbar: CustomToolbar,
          // Customize event rendering to show channel icons and better styling
          event: ({ event }) => {
            const post = event as PostType & { title: string }
            const channel = post.user_channels?.channel_types
            const Icon = getChannelIcon(channel?.type || undefined)
            const color = channel?.color || "#000000"
            return (
              <>
                <div
                  className="flex items-center gap-2 px-2 py-1 h-full"
                  style={{ backgroundColor: color + "20", borderLeft: `3px solid ${color}` }}
                  onClick={() => onPostClick(post)}
                >
                  {Icon && <HugeiconsIcon
                    icon={Icon}
                    className="shrink-0 text-white! size-4! p-0.5 rounded-sm"
                    style={{
                      background: color
                    }} />}
                  <span className="min-w-0 flex-1 truncate text-xs">{post.title}</span>
                  <span className={cn("hidden rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide lg:inline", statusClass[post.status] ?? statusClass.draft)}>{statusLabel[post.status] ?? "Draft"}</span>
                  <span className="shrink-0 font-semibold">{format(post.scheduled_at, "h:mm a")}</span>
                </div>
              </>
            )
          },

          month: {
            dateHeader: ({ label, date: cellDate }: any) => {
              const isCellToday = format(cellDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              const isPastDate = isBefore(cellDate, startOfDay(new Date()))
              return (
                <>
                  <div className="group flex items-center justify-between w-full">
                    {onDateClick ? (
                      <button
                        type="button"
                        aria-label={`View schedule for ${format(cellDate, "MMMM d, yyyy")}`}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary",
                          isCellToday ? "bg-primary text-primary-foreground" : isPastDate ? "text-muted-foreground hover:text-foreground" : "text-foreground"
                        )}
                        onClick={(event) => {
                          event.stopPropagation()
                          onDateClick(cellDate)
                        }}
                      >
                        {label}
                      </button>
                    ) : (
                      <span className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium",
                        isCellToday ? "bg-primary text-primary-foreground" : isPastDate ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {label}
                      </span>
                    )}
                    {!isPastDate && !isPending && (
                      <Button
                        size="icon-sm"
                        variant="default"
                        className="p-px! size-6! mt-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCreatePost(cellDate)
                        }}
                      >
                        <Plus className="size-3" />
                      </Button>
                    )}

                  </div>
                  {isPending && <Skeleton className="h-8 w-11/12 m-2 my-5" />}
                </>
              )
            }
          },
        }}
      />
    </div>
  )
}
