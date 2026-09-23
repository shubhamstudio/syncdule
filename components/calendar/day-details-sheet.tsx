"use client";

import { format, isSameDay } from "date-fns";
import { CalendarDays, Clock3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PostType } from "@/types/post.type";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  queue: "Scheduled",
  published: "Posted",
  failed: "Failed",
};

interface DayDetailsSheetProps {
  date: Date | null;
  posts: PostType[];
  onOpenChange: (open: boolean) => void;
  onAddPost: (date: Date) => void;
  onPostClick: (post: PostType) => void;
}

export function DayDetailsSheet({
  date,
  posts,
  onOpenChange,
  onAddPost,
  onPostClick,
}: DayDetailsSheetProps) {
  const scheduledPosts = date
    ? posts
      .filter((post) => isSameDay(new Date(post.scheduled_at), date))
      .sort((first, second) => new Date(first.scheduled_at).getTime() - new Date(second.scheduled_at).getTime())
    : [];

  return (
    <Sheet open={Boolean(date)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-white/10 bg-[#0d0d0f] p-0 sm:max-w-md">
        <SheetHeader className="border-b border-white/10 p-6 pr-12">
          <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary">
            <CalendarDays className="size-4" />
          </div>
          <SheetTitle className="text-xl">{date ? format(date, "EEEE, MMMM d") : "Date details"}</SheetTitle>
          <SheetDescription>
            {scheduledPosts.length === 1
              ? "1 scheduled post"
              : `${scheduledPosts.length} scheduled posts`}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {scheduledPosts.length ? (
            <div className="space-y-2">
              {scheduledPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onPostClick(post)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.025] p-4 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.055]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      {format(new Date(post.scheduled_at), "h:mm a")}
                    </span>
                    <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
                      {statusLabel[post.status] ?? "Scheduled"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-foreground">
                    {post.content || "Untitled post"}
                  </p>
                  {post.user_channels?.handle ? (
                    <p className="mt-2 text-xs text-muted-foreground">{post.user_channels.handle}</p>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid min-h-52 place-items-center rounded-lg border border-dashed border-white/10 px-6 text-center">
              <div>
                <CalendarDays className="mx-auto mb-3 size-5 text-primary" />
                <p className="text-sm font-medium text-foreground">Nothing scheduled</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a time and add your first post for this date.</p>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-white/10 p-4">
          <Button className="w-full" onClick={() => date && onAddPost(date)}>
            <Plus className="size-4" /> Schedule post
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
