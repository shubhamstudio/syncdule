"use client"
import * as React from "react"
import { parse, set } from "date-fns"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
    Wand2,
    ScanEye,
    Lightbulb,
} from "lucide-react"
import { ScheduleDatePicker } from "./schedule-date-picker"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChannelType } from "@/types/channel.type"
import { ButtonGroup } from "../ui/button-group"
import { Spinner } from "../ui/spinner"
import { ImageObject, VideoObject } from "@/types/post.type"
import { POST_STATUS, PostStatus } from "@/constants/post"
import { getChannelIcon } from "@/constants/channels"
import ContentTextarea from "../content-textarea"
import IdeasList from "./ideas-list"
import PreviewPanel from "./preview"
import { AIAssistant } from "./ai-assitant"
import { getApiErrorMessage } from "@/lib/http/api-response"

interface EditPostDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    post: {
        id: string
        content: string
        images: ImageObject[]
        video?: VideoObject | null
        userChannelId: string
        scheduledDate: string
        channel?: ChannelType | null
    } | null
}

type ActionTabType = "ideas" | "ai" | "preview"

const rightTabs = [
    { id: "ideas" as ActionTabType, label: "Ideas", icon: Lightbulb },
    { id: "ai" as ActionTabType, label: "AI Assistant", icon: Wand2 },
    { id: "preview" as ActionTabType, label: "Preview", icon: ScanEye },
]

export function EditPostDialog({
    open,
    onOpenChange,
    post
}: EditPostDialogProps) {


    const queryClient = useQueryClient();

    const updatePostMutation = useMutation({
        mutationFn: async ({ postId, content, images, video, scheduledAt, status }: {
            postId: string,
            content: string,
            images: ImageObject[],
            video: VideoObject | null,
            scheduledAt: string,
            status?: PostStatus,
            userChannelId: string
        }) => {
            const response = await fetch(`/api/post/${postId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    images,
                    video,
                    scheduledAt,
                    status
                })
            });
            if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to update post"));
            return response.json();
        },
        onSuccess: (data, variables) => {
            toast.success(`Post ${variables.status === POST_STATUS.DRAFT ? "saved to drafts" : "rescheduled"} successfully!`);
            queryClient.invalidateQueries({ queryKey: ["posts"] });
            onOpenChange(false);
        },
        onError: (error: any) => {
            console.error("Update error:", error);
            toast.error(error.message);
        }
    });

    const [content, setContent] = React.useState("")
    const [images, setImages] = React.useState<ImageObject[]>([])
    const [video, setVideo] = React.useState<VideoObject | null>(null)
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    const [time, setTime] = React.useState<string>("")
    const [selectedRightTab, setSeletedRightTab] = React.useState<ActionTabType | null>(null)

    // Sync state when post changes
        React.useEffect(() => {
            if (post) {
                setContent(post.content)
                setImages(post.images ?? [])
                setVideo(post.video ?? null)
                const date = new Date(post.scheduledDate)
                setDate(date)
                // Extract time from scheduledDate
                const hours = date.getHours()
                const minutes = date.getMinutes()
                const ampm = hours >= 12 ? "PM" : "AM"
                const h = hours % 12 || 12
                const m = minutes.toString().padStart(2, "0")
                setTime(`${h}:${m} ${ampm}`)
            }
        }, [post])

    const channel = post?.channel
    const icon = channel ? getChannelIcon(channel.type) : null

    const handleUpdate = (status?: PostStatus) => {
        if (!post) return
        const parsedTime = parse(time, "h:mm a", new Date())
        const finalDate = set(date || new Date(), {
            hours: parsedTime.getHours(),
            minutes: parsedTime.getMinutes(),
            seconds: 0,
            milliseconds: 0
        })

        updatePostMutation.mutate({
            postId: post.id,
            content,
            images,
            video,
            scheduledAt: finalDate.toISOString(),
            status: status,
            userChannelId: post.userChannelId
        });
    }

    const handleAddIdea = (idea: any) => {
        setContent(idea.description || "")
        setImages(idea.images || [])
    }

    const handleSelectRightTab = (tab: ActionTabType) => {
        setSeletedRightTab((prev) => (prev === tab ? null : tab))
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
              "flex h-[min(92svh,720px)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:w-full",
                selectedRightTab && "lg:max-w-[950px]"
            )}>
                <DialogHeader className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-8">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                            <DialogTitle className="text-lg font-semibold">Edit Post</DialogTitle>
                            <div className="flex items-center gap-px">
                                {rightTabs.map((tab) => (
                                    <Button
                                        key={tab.id}
                                        variant={selectedRightTab === tab.id ? "default" : "ghost"}
                                        className={cn(!selectedRightTab && "size-8", "")}
                                        onClick={() => handleSelectRightTab(tab.id)}
                                    >
                                        <tab.icon className="h-4 w-4" />
                                        <span className={cn(!selectedRightTab && "hidden")}>{tab.label}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                </DialogHeader>
                <DialogDescription className="sr-only">Edit the content, media, and scheduled time for this post.</DialogDescription>

                    {/* ── Main panel ── */}
                    <div className="min-h-0 w-full flex-1 overflow-y-auto">
                    <div className="flex min-h-full w-full flex-col lg:flex-row">

                        {/* Left panel */}
                        <div className="flex min-w-0 flex-1 flex-col pb-5 lg:w-[300px]">

                            <section className="channel--composer relative 
                    flex flex-col px-4 sm:px-8 mt-5 min-h-[300px] 
                    h-auto">
                                <div className="flex min-h-[400px] flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.015] p-4 shadow-none">
                                    <div className="flex-1 relative">
                                        {icon && (
                                            <div className="absolute top-0 left-0">
                                                <HugeiconsIcon
                                                    icon={icon}
                                                    style={{ background: channel?.color }}
                                                    className="size-5 text-white! p-1 rounded-sm"
                                                />
                                            </div>
                                        )}
                                        <div className={cn(icon && "pl-8")}>
                                            <ContentTextarea
                                                value={content}
                                                images={images}
                                                video={video}
                                                placeholder="Start writing or get inspired by AI..."
                                                minHeight={350}
                                                contentClass="text-[15px] placeholder:opacity-50 pt-0!"
                                                showAIAssistant={true}
                                                onAIAssistantClick={() => handleSelectRightTab("ai")}
                                                onChange={setContent}
                                                onImagesChange={setImages}
                                                onVideoChange={setVideo}
                                                renderToolbarRight={
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "rounded-md px-2 py-0.5 font-mono text-[10px] font-medium",
                                                            channel && content.length >= Number(channel.character_limit) * 0.9
                                                                ? "bg-orange-100 text-orange-600"
                                                                : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {content.length} / {channel?.character_limit || 280}
                                                        </span>
                                                    </div>
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Side Panel */}
                        {selectedRightTab && (
                            <aside className="flex h-[360px] w-full shrink-0 flex-col border-t border-border bg-muted/30 lg:h-full lg:w-[350px] lg:border-t-0 lg:border-l">
                                <div className="py-4 flex-1 h-full flex flex-col">
                                    {selectedRightTab === "ai" && (
                                        <div className="px-6 flex flex-col">
                                            <AIAssistant
                                                content={content}
                                                channelId={post?.channel?.id}
                                                onGenerate={(generated) => {
                                                    setContent(generated.content)
                                                }}
                                            />
                                        </div>
                                    )}
                                    {selectedRightTab === "ideas" && (
                                        <IdeasList
                                            onSelect={handleAddIdea}
                                        />
                                    )}

                                    {selectedRightTab === "preview" && (
                                        <PreviewPanel
                                            channel={channel || null}
                                            content={{ text: content, images, video }}
                                        />
                                    )}
                                </div>
                            </aside>
                        )}
                    </div>

                </div>
                </div>

                <DialogFooter className="m-0! shrink-0 px-4 pb-4 pt-4 sm:px-8">
                    <div className="w-full flex items-center justify-between gap-2">
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={() => handleUpdate(POST_STATUS.DRAFT)}
                            disabled={updatePostMutation.isPending}
                        >
                            {updatePostMutation.isPending && updatePostMutation.variables?.status === POST_STATUS.DRAFT && <Spinner />}
                            Save Draft
                        </Button>
                        <ButtonGroup className="p-0!">
                            <ScheduleDatePicker
                                date={date} setDate={setDate} time={time} setTime={setTime}
                                renderButton={(isDatePassed, isTimeNotAvailable) => <Button
                                    size="lg"
                                    className="border py-4.5 px-4"
                                    onClick={() => {
                                        if (isDatePassed || isTimeNotAvailable) {
                                            toast.error("Please select a valid time")
                                            return;
                                        }
                                        handleUpdate()
                                    }}
                                    disabled={updatePostMutation.isPending || !date || !time || isTimeNotAvailable || isDatePassed}
                                >
                                    {updatePostMutation.isPending && updatePostMutation.variables?.status === undefined && <Spinner />}
                                    Schedule Post
                                </Button>}
                            />
                        </ButtonGroup>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
