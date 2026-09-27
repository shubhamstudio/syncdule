"use client"

import * as React from "react"
import { CalendarDays, ChevronDown, Clock, Check, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { format, startOfDay, isSameDay, isBefore } from "date-fns"

interface ScheduleDatePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  time: string
  setTime: (time: string) => void
  className?: string
  align?: "start" | "center" | "end"
  renderButton?: (isDatePassed: boolean, isTimeNotAvailable: boolean, isPostNow: boolean) => React.ReactNode
}

/** Parse a custom time string like "14:30" and return { hours, minutes } or null */
function parseCustomTime(value: string): { hours: number; minutes: number } | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return { hours, minutes }
}


export function ScheduleDatePicker({
  date,
  setDate,
  time,
  setTime,
  className,
  align = "end",
  renderButton
}: ScheduleDatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<"now" | "custom">("custom")
  // raw 24h input value e.g. "09:30"
  const [rawTime, setRawTime] = React.useState("")

  const today = React.useMemo(() => startOfDay(new Date()), [])

  // Derive the 24h value from the current `time` prop (which is "h:mm a") to populate input
  React.useEffect(() => {
    if (time && mode === "custom") {
      // convert "h:mm a" → "HH:MM"
      try {
        const parsed = new Date(`1970-01-01 ${time}`)
        if (!isNaN(parsed.getTime())) {
          const hh = String(parsed.getHours()).padStart(2, "0")
          const mm = String(parsed.getMinutes()).padStart(2, "0")
          setRawTime(`${hh}:${mm}`)
        }
      } catch {
        // ignore
      }
    }
  }, [time, mode])

  const handleModeChange = (newMode: "now" | "custom") => {
    setMode(newMode)
    if (newMode === "now") {
      // Set time to "now" as h:mm a
      setDate(new Date())
      setTime(format(new Date(), "h:mm a"))
    }
  }

  const handleRawTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setRawTime(val)
    const parsed = parseCustomTime(val)
    if (parsed) {
      const d = new Date()
      d.setHours(parsed.hours, parsed.minutes, 0, 0)
      setTime(format(d, "h:mm a"))
    }
  }

  const isDatePassed = date ? isBefore(date, new Date()) && !isSameDay(date, new Date()) : false

  // Check if a custom time is in the past for today
  const isTimeNotAvailable = React.useMemo(() => {
    if (mode === "now") return false
    if (!date || !time) return false
    if (!isSameDay(date, new Date())) return false
    // parse h:mm a
    try {
      const parsed = new Date(`1970-01-01 ${time}`)
      if (isNaN(parsed.getTime())) return true
      const candidate = new Date(date)
      candidate.setHours(parsed.getHours(), parsed.getMinutes(), 0, 0)
      return isBefore(candidate, new Date())
    } catch {
      return true
    }
  }, [date, time, mode])

  const displayLabel = React.useMemo(() => {
    if (mode === "now") return "Post Now"
    if (date && time) return `${format(date, "MMMM d")}, ${time}`
    if (date) return format(date, "MMMM d")
    return "Set Date & Time"
  }, [mode, date, time])

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="lg" className={cn("px-4", className)} variant="outline">
            <span className="flex-1 flex items-center gap-2 text-sm">
              {mode === "now" ? (
                <Zap className="size-4 text-primary" />
              ) : (
                <CalendarDays className="size-4" />
              )}
              <span className="flex items-center gap-1.5 font-semibold">
                {displayLabel}
              </span>
            </span>
            <ChevronDown className="size-4!" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align={align}>
          <div className="w-full p-4 space-y-4">

            {/* Mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors",
                  mode === "now"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-muted"
                )}
                onClick={() => handleModeChange("now")}
              >
                <Zap className="size-3" />
                Post Now
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors border-l border-border",
                  mode === "custom"
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-muted"
                )}
                onClick={() => handleModeChange("custom")}
              >
                <Clock className="size-3" />
                Custom Time
              </button>
            </div>

            {mode === "custom" && (
              <>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={{ before: today }}
                  className="p-0 w-full"
                  formatters={{
                    formatWeekdayName: (date) => date.toLocaleDateString('en-US', { weekday: 'narrow' })
                  }}
                  classNames={{
                    month_caption: "flex justify-start items-center h-9 ml-2",
                    caption_label: "text-base font-semibold",
                    nav: "absolute right-2 top-0 flex items-center gap-1",
                    month: "space-y-4 w-full",
                    day: cn(
                      "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-lg hover:bg-muted transition-colors"
                    ),
                  }}
                />

                <div className="space-y-1.5">
                  <h4 className="text-[13px] font-semibold text-foreground/70">Select Time</h4>
                  <div className="relative flex items-center">
                    <Clock className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="time"
                      value={rawTime}
                      onChange={handleRawTimeChange}
                      className={cn(
                        "w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm font-medium",
                        "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60",
                        "transition-colors"
                      )}
                    />
                  </div>
                  {isTimeNotAvailable && (
                    <p className="text-[11px] text-rose-400 font-medium">Selected time is in the past</p>
                  )}
                </div>
              </>
            )}

            {mode === "now" && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2.5 text-xs text-primary font-medium">
                Your post will be published immediately when you click <strong>Schedule Post</strong>.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end p-4 border-t bg-muted/5">
            <Button size="lg" onClick={() => setOpen(false)}>
              <Check className="size-4" />
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {renderButton && renderButton(isDatePassed, isTimeNotAvailable, mode === "now")}
    </>
  )
}
