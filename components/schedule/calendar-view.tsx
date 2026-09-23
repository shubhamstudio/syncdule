
"use client"

import { PostType } from "@/types/post.type"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useQueryState } from "nuqs"
import { useState } from "react"
import { PostCalendar } from "./post-calendar"
import ScheduleToolbar from "./schedule-toolbar"
import CreatePostDialog from "./create-post-dialog"
import { EditPostDialog } from "./edit-post-dialog"
import { toast } from "sonner"
import { DayDetailsSheet } from "@/components/calendar/day-details-sheet"
import { getApiErrorMessage } from "@/lib/http/api-response"

const CalendarView = () => {
  const [channelIds, setChannelIds] = useQueryState("channelIds", {
    defaultValue: [],
    parse: (query) => query.split(","),
    serialize: (value) => value.join(",")
  })
  const [selectedStatus, setSelectedStatus] = useQueryState("status",
    {
      defaultValue: ""

    })
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<PostType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isFetching:isPending } = useQuery({
    queryKey: ["posts", selectedStatus, channelIds],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedStatus && selectedStatus !== "all") {
        params.append("status", selectedStatus)
      }
      if (channelIds.length > 0) {
        params.append("channelIds", channelIds.join(","))
      }
      const res = await fetch(`/api/post?${params.toString()}`);
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Unable to load scheduled posts"));
      return res.json();
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const posts = data?.posts || [] as PostType[]
  const reschedule = useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: string; scheduledAt: Date }) => {
      const response = await fetch(`/api/post/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduledAt: scheduledAt.toISOString() }) })
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to reschedule post"))
    },
    onSuccess: () => { toast.success("Post rescheduled"); void queryClient.invalidateQueries({ queryKey: ["posts"] }) },
    onError: (error) => toast.error(error.message),
  })

  const handlePostClick = (_post: PostType) => {
    const post = posts.find((post: PostType) => post.id === _post.id)
    if (post) {
      setSelectedPostForEdit(post)
      setIsEditDialogOpen(true)
    }
  }

  const toggleChannel = (channelId: string) => {
    setChannelIds((prev) => {
      if (!prev) {
        return [channelId]
      }
      if (prev.includes(channelId)) {
        const filtered = prev.filter((id) => id !== channelId)
        return filtered.length === 0 ? null : filtered
      }
      return [...prev, channelId]
    })
  }

  const handleCreatePost = (date: Date) => {
    setSelectedDay(null)
    setSelectedDate(date)
    setIsCreateDialogOpen(true)
  }

  return (
    <div className="flex flex-col overflow-hidden bg-transparent">
      <div className="min-h-0 flex-1">
        <div className="h-full min-w-0 overflow-x-auto p-4 pt-3 sm:p-6 sm:pt-4">
          <PostCalendar
            posts={posts}
            isPending={isPending}
            currentDate={currentDate}
            view="week"
            onViewChange={() => undefined}
            viewLabel="Week wise schedule"
            onDateChange={setCurrentDate}
            onDateClick={setSelectedDay}
            onPostClick={handlePostClick}
            onCreatePost={handleCreatePost}
            onReschedule={(post, scheduledAt) => {
              if (post.status === "published") { toast.error("Published posts cannot be rescheduled"); return }
              reschedule.mutate({ id: post.id, scheduledAt })
            }}
            rightActions={
              <ScheduleToolbar
                channelIds={channelIds}
                toggleChannel={toggleChannel}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
              />
            }
          />
        </div>
      </div>


      <EditPostDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        post={selectedPostForEdit ? {
          id: selectedPostForEdit.id,
          content: selectedPostForEdit.content,
          images: selectedPostForEdit.images || [],
          video: selectedPostForEdit.video ?? null,
          scheduledDate: selectedPostForEdit.scheduled_at,
          userChannelId: selectedPostForEdit.user_channel_id || "",
          channel: selectedPostForEdit.user_channels?.channel_types ? {
            ...selectedPostForEdit.user_channels.channel_types,
            profile_image: selectedPostForEdit.user_channels.profile_image,
            handle: selectedPostForEdit.user_channels.handle
          } : null,
          // status: selectedPostForEdit.status
        } : null}
      />

      <CreatePostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        selectedDate={selectedDate}
      />
      <DayDetailsSheet
        date={selectedDay}
        posts={posts}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        onAddPost={handleCreatePost}
        onPostClick={(post) => {
          setSelectedDay(null)
          handlePostClick(post)
        }}
      />
    </div>
  )
}

export default CalendarView
