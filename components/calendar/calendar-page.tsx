"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/workspace-ui";
import { DayDetailsSheet } from "@/components/calendar/day-details-sheet";
import CreatePostDialog from "@/components/schedule/create-post-dialog";
import { EditPostDialog } from "@/components/schedule/edit-post-dialog";
import { PostCalendar } from "@/components/schedule/post-calendar";
import type { PostType } from "@/types/post.type";
import { getApiErrorMessage } from "@/lib/http/api-response";

export function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostType | null>(null);

  const postsQuery = useQuery({
    queryKey: ["posts", "calendar"],
    queryFn: async () => {
      const response = await fetch("/api/post");
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to load calendar posts"));
      return response.json() as Promise<{ posts: PostType[] }>;
    },
    staleTime: 30_000,
  });

  const reschedule = useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: string; scheduledAt: Date }) => {
      const response = await fetch(`/api/post/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduledAt: scheduledAt.toISOString() }) });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to reschedule post"));
    },
    onSuccess: () => { toast.success("Post rescheduled"); void queryClient.invalidateQueries({ queryKey: ["posts"] }); },
    onError: (error) => toast.error(error.message),
  });

  const posts = postsQuery.data?.posts ?? [];
  const openCreate = (date: Date) => {
    setSelectedDay(null);
    setCreateDate(date);
    setCreateOpen(true);
  };

  return <div className="flex h-full min-h-0 flex-col">
    <PageHeader eyebrow="Publishing calendar" title="Calendar" description="See every scheduled post by date and status. Drag a post to a new slot to reschedule it." actions={<Button className="rounded-md font-semibold" onClick={() => openCreate(new Date())}><Plus className="size-4" /> Add post</Button>} />
    <div className="min-h-0 flex-1 overflow-x-auto p-4 pt-3 sm:p-6 sm:pt-4">
      <PostCalendar
        posts={posts}
        isPending={postsQuery.isFetching}
        currentDate={currentDate}
        view="month"
        onViewChange={() => undefined}
        onDateChange={setCurrentDate}
        onDateClick={setSelectedDay}
        onCreatePost={openCreate}
        onPostClick={setEditingPost}
        onReschedule={(post, scheduledAt) => {
          if (post.status === "published") { toast.error("Published posts cannot be rescheduled"); return; }
          reschedule.mutate({ id: post.id, scheduledAt });
        }}
      />
    </div>
    <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} selectedDate={createDate} />
    <DayDetailsSheet
      date={selectedDay}
      posts={posts}
      onOpenChange={(open) => !open && setSelectedDay(null)}
      onAddPost={openCreate}
      onPostClick={(post) => {
        setSelectedDay(null);
        setEditingPost(post);
      }}
    />
    <EditPostDialog open={Boolean(editingPost)} onOpenChange={(open) => !open && setEditingPost(null)} post={editingPost ? {
      id: editingPost.id,
      content: editingPost.content,
      images: editingPost.images ?? [],
      video: editingPost.video ?? null,
      scheduledDate: editingPost.scheduled_at,
      userChannelId: editingPost.user_channel_id ?? "",
      channel: editingPost.user_channels?.channel_types ? { ...editingPost.user_channels.channel_types, profile_image: editingPost.user_channels.profile_image, handle: editingPost.user_channels.handle } : null,
    } : null} />
  </div>;
}
