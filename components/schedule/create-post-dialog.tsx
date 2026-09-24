"use client"
import React, { useEffect, useMemo, useState } from "react";
import { format, parse, set } from "date-fns"
import { ChannelTypeEnum, getChannelIcon } from "@/constants/channels";
import { ChannelType } from "@/types/channel.type";
import { ImageObject, VideoObject } from "@/types/post.type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle, Lightbulb, ScanEye, Wand2 } from "lucide-react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { toast } from "sonner";
import { toggleVariants } from "../ui/toggle";
import ChannelAvatar from "../channel-avatar";
import ContentTextarea from "../content-textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { HugeiconsIcon } from "@hugeicons/react";
import IdeasList from "./ideas-list";
import PreviewPanel from "./preview";
import { ButtonGroup } from "../ui/button-group";
import { POST_STATUS, PostStatus } from "@/constants/post";
import { ScheduleDatePicker } from "./schedule-date-picker";
import Link from "next/link";
import { Spinner } from "../ui/spinner";
import { AIAssistant } from "./ai-assitant";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { getApiErrorMessage } from "@/lib/http/api-response";

type PropsType = {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedDate?: Date | null
}

type ChannelContent = {
    title: string
    description: string
    text: string
    images: ImageObject[]
    video: VideoObject | null
}

function supportsSeparateTitleAndDescription(channel: ChannelType) {
    // LinkedIn posts accept commentary and media, not separate title/description fields.
    return channel.type !== ChannelTypeEnum.LINKEDIN;
}

type ActionTabType = "ideas" | "ai" | "preview"

const rightTabs = [
    { id: "ideas" as ActionTabType, label: "Ideas", icon: Lightbulb },
    { id: "ai" as ActionTabType, label: "AI Assistant", icon: Wand2 },
    { id: "preview" as ActionTabType, label: "Preview", icon: ScanEye },
]


const CreatePostDialog = ({ open, onOpenChange, selectedDate }: PropsType) => {

    const queryClient = useQueryClient();
    const [globalContent, setGlobalContent] = useState<ChannelContent>({ title: "", description: "", text: "", images: [], video: null })
    const [channelContent, setChannelContent] = useState<Record<string, ChannelContent>>({})
    const [selectedChannels, setSelectedChannels] = useState<string[]>([])
    const [selectedRightTab, setSelectedRightTab] = useState<ActionTabType | null>(null)
    const [activePreview, setActivePreview] = useState<string>("")
    const [activeAccordion, setActiveAccordion] = useState<string>("")
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [timeSlot, setTimeSlot] = useState<string>("")

    const { data, isPending } = useQuery({
        queryKey: ["channels"],
        enabled: open,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        queryFn: async () => {
            const res = await fetch("/api/channel");
            if (!res.ok) throw new Error("Failed to fetch channels");
            const data = await res.json();
            return data
        },
    });

    const channelsData = data?.channels
    const hasConnectedChannel = data?.connectedCount > 0

    const channels = useMemo(() => {
        if (isPending) {
            return []
        }
        return (channelsData || []).map((channel: any) => ({
            ...channel,
            icon: getChannelIcon(channel.type)
        })) as ChannelType[]
    }, [isPending, channelsData])

     useEffect(() => {
       if(selectedDate){
        setDate(selectedDate)
       }
    }, [selectedDate])

   
    useEffect(() => {
        if (channels.length > 0 && Object.keys(channelContent).length === 0) {
            const initialContent: Record<string, ChannelContent> = {}
            channels.forEach(channel => {
                initialContent[channel.id] = { title: "", description: "", text: "", images: [], video: null }
            })
            setChannelContent(initialContent)
        }
    }, [channels])

    const connectedChannels = channels.filter(channel => channel.connected);
    const selectedChannelsList = channels.filter((channel) => selectedChannels.includes(channel.id))
    const previewChannelId = activePreview || activeAccordion || selectedChannels[0] || "";
    const previewChannel = channels.find((c) => c.id === previewChannelId) ?? null;
    const previewContent = channelContent?.[previewChannelId] ?? { title: "", description: "", text: "", images: [], video: null }

    const createPostMutation = useMutation({
        mutationFn: async ({ posts, scheduledAt, status }:
            { posts: any[], scheduledAt: string, status?: PostStatus }) => {
            const response = await fetch("/api/post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    posts,
                    scheduledAt,
                    status
                })
            });
            if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to schedule posts"));
            return response.json();
        },
        onSuccess: (data, variables) => {
            toast.success(`${data.posts.length} post(s) ${variables.status === POST_STATUS.DRAFT ? 'saved to draft' : 'scheduled'} successfully`);
            queryClient.invalidateQueries({
                predicate: (query) => query.queryKey[0] === "posts",
            });
            handleOpenChange(false)
        },
        onError: (error: any) => {
            console.log("failed to create post", error)
            toast.error(error instanceof Error ? error.message : "Unable to save post")
        }
    })

    const handleSelectRightTab = (tab: ActionTabType) => {
        if (tab === "preview" && selectedRightTab !== "preview") {
            setActivePreview(activePreview || activeAccordion || selectedChannels[0] || "");
        }
        setSelectedRightTab((prev) => (prev === tab ? null : tab));
    }

    const handleSelectAll = () => {
        setSelectedChannels((prev) => {
            if (prev.length === connectedChannels.length) {
                setActivePreview("")
                return []
            }

            const channelIds = connectedChannels.map(channel => channel.id);
            setActiveAccordion(channelIds[0] || "");
            setActivePreview(channelIds[0] || "");
            setChannelContent((prev) => {
                const update = { ...prev }
                connectedChannels.forEach((channel) => {
                    if (!update[channel.id]?.text && globalContent.text) {
                        const limit = Number(channel.character_limit);

                        update[channel.id] = {
                            title: globalContent.title,
                            description: globalContent.description,
                            text: globalContent.text.slice(0, limit),
                            images: channel.type === "YOUTUBE" ? [] : [...globalContent.images],
                            video: globalContent.video
                        }
                    } else if (!update[channel.id]) {
                        update[channel.id] = { title: "", description: "", text: "", images: [], video: null }
                    }
                })
                return update;
            })
            return channelIds
        })
    }

    const handleGlobalContentChange = (text: string, images?: ImageObject[]) => {
        setGlobalContent((prev) => ({
            ...prev,
            text,
            images: images || prev.images
        }))
    }

    const handleAccordionChange = (value: string) => {
        setActiveAccordion(value)
        setActivePreview(value)
    }

    const handleTextChange = (
        channelId: string,
        text: string,
        character_limit: number
    ) => {
        const limit = Number(character_limit);
        if (text.length <= limit) {
            setChannelContent((prev) => ({
                ...prev,
                [channelId]: {
                    ...prev[channelId],
                    text
                }
            }))
        }
    }

    const toggleChannel = (channelId: string, character_limit: number) => {
        setSelectedChannels((prev) => {
            if (prev.includes(channelId) && activePreview === channelId) setActivePreview("")
            const isSelected = prev.includes(channelId);

            const newChannels = isSelected ? prev.filter((id) => id != channelId) : [...prev, channelId];

            if (!isSelected) {
                    if (globalContent.text && !channelContent[channelId]?.text) {
                        const limit = Number(character_limit);
                        const channel = channels.find((item) => item.id === channelId);
                        setChannelContent((prev) => ({
                            ...prev,
                            [channelId]: {
                                ...prev[channelId],
                                title: globalContent.title,
                                description: globalContent.description,
                                text: globalContent.text.slice(0, limit),
                                images: channel?.type === "YOUTUBE" ? [] : [...globalContent.images],
                                video: globalContent.video
                        }
                    }))
                }
            } else {
                setChannelContent((prev) => ({
                    ...prev,
                    [channelId]: { title: "", description: "", text: "", images: [], video: null }
                }))
            }
            return newChannels;
        })

        if (!selectedChannels.includes(channelId)) {
            setActiveAccordion(channelId)
            setActivePreview(channelId)
        }
    }

    const handleIdeaSelect = (idea: any) => {
        if (!hasConnectedChannel) {
            toast.error("Connect at least one channel to add idea")
            return
        }
        const targetChannelId = activeAccordion || activePreview || selectedChannels[0];
        if (!targetChannelId) {
            setGlobalContent({
                title: idea.title,
                description: idea.description,
                text: idea.title + "\n\n" + idea.description,
                images: idea.images || [], video: null
            })
            return
        }
        setChannelContent((prev) => {
            return ({
                ...prev,
                [targetChannelId]: {
                    title: idea.title,
                    description: idea.description,
                    text: idea.title + "\n\n" + idea.description,
                    images: idea.images || [], video: null
                }
            })
        })
    }

    const handleCreatePost = (status?: PostStatus) => {
        if (selectedChannels.length === 0) {
            toast.error("Select at least one channel")
            return;
        }
        const postToCreate = selectedChannelsList.map((channel) => {
            const content = channelContent[channel.id] ?? { title: "", description: "", text: "", images: [], video: null }
            const supportsMetadata = supportsSeparateTitleAndDescription(channel)
            return {
                channelTypeId: channel.id,
                title: supportsMetadata ? content.title : "",
                description: supportsMetadata ? content.description : "",
                content: content.text,
                images: content.images, video: content.video
            }
        })
        const postsToSave = status === POST_STATUS.DRAFT
            ? postToCreate.filter((post) => post.content.trim() || post.images.length > 0 || post.video || post.title.trim() || post.description.trim())
            : postToCreate;

        if (postsToSave.length === 0) {
            toast.error("Add text, media, a title, or a description before saving a draft")
            return
        }
        if (status !== POST_STATUS.DRAFT && postsToSave.some((post) => !post.content.trim() && post.images.length === 0 && !post.video)) {
            toast.error("Each selected channel needs text or media")
            return
        }

        let scheduleAt = date ? new Date(date) : new Date();
        if (timeSlot) {
            const parsedTime = parse(timeSlot, "h:mm a", new Date());
            if (Number.isNaN(parsedTime.getTime())) {
                toast.error("Please select a valid time")
                return
            }
            scheduleAt = set(scheduleAt, {
                hours: parsedTime.getHours(),
                minutes: parsedTime.getMinutes(),
                seconds: 0,
                milliseconds: 0
            })
        }

        createPostMutation.mutate({
            posts: postsToSave,
            scheduledAt: scheduleAt.toISOString(),
            status
        })
    }


    const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
        setGlobalContent({ title: "", description: "", text: "", images: [], video: null });
        setChannelContent({});
        setActiveAccordion("")
        setActivePreview("")
        setSelectedRightTab(null)
        setDate(new Date())
        setTimeSlot("")
        setSelectedChannels([])
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className={cn(
                "flex h-[calc(100svh-1rem)] max-h-[760px] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden px-0 py-0 sm:h-[min(92svh,760px)] sm:max-w-[calc(100vw-2rem)] xl:max-w-[1100px]",
            )}>
                <div className="flex min-h-0 flex-1 flex-col">
                    <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-8">
                        <div className="flex items-center justify-between gap-2">
                            <DialogTitle className="font-semibold">Create Post</DialogTitle>
                            <div className="flex items-center gap-px">
                                {rightTabs.map((tab) => (
                                    <Button
                                        key={tab.id}
                                        variant={selectedRightTab === tab.id ? "default" : "ghost"}
                                        className={cn(!selectedRightTab && "size-8")}
                                        onClick={() => handleSelectRightTab(tab.id)}
                                    >
                                        <tab.icon className="size-4" />
                                        <span className={cn(!selectedRightTab && "hidden")}> {tab.label}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </DialogHeader>


                    <div className="post-dialog-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden">

                        {/* Left — channel list */}
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-5 xl:w-[300px]">
                            <div className="channel--selector px-4 py-5 sm:px-8">
                                {channels?.length > 0 && !isPending && (
                                    <button
                                        className="mb-4 text-[13px] font-medium cursor-pointer"
                                        onClick={handleSelectAll}
                                    >
                                        {selectedChannels.length === connectedChannels.length ? "Unselect all" : "Select all"}
                                    </button>
                                )}
                                <div className="flex flex-wrap gap-4">
                                    {isPending ? (
                                        Array.from({ length: 6 }).map((_, index) => (
                                            <Skeleton key={index} className="size-[50px] rounded-xl" />
                                        ))
                                    ) : (
                                        channels?.map((channel) => {
                                            const selected = selectedChannels.includes(channel.id)
                                            const isConnected = channel.connected
                                            return (
                                                <Tooltip key={channel.id}>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            style={{ "--channel-color": channel.color } as React.CSSProperties}
                                                            className={cn(
                                                                "relative shrink-0 rounded-xl p-0 transition-all",
                                                                !isConnected ? "cursor-not-allowed" : "cursor-pointer",
                                                                selected ? "ring-2 ring-(--channel-color) ring-offset-1" : "grayscale!"
                                                            )}
                                                            onClick={() => {
                                                                if (!isConnected) {
                                                                    toast.error("Please connect the channel first");
                                                                    return;
                                                                }

                                                                toggleChannel(
                                                                    channel.id,
                                                                    channel.character_limit
                                                                )
                                                            }}>

                                                            <ChannelAvatar
                                                                className=""
                                                                type={channel.type}
                                                                color={channel.color}
                                                                profileImage={channel.profile_image}
                                                            />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Preview {channel.name}
                                                        {!isConnected && <span className="text-primary"> → Connect Channel</span>}
                                                    </TooltipContent>
                                                </Tooltip>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="channel--content relative 
                                        post-dialog-scrollbar flex min-h-0 flex-1 flex-col px-4 sm:px-8
                                        overflow-y-auto">
                                {selectedChannels.length === 0 ? (
                                    <div className="border rounded-xl p-4">
                                        <div className="mb-4 grid gap-3">
                                            <div className="grid gap-1.5">
                                                <label className="text-xs font-medium" htmlFor="global-post-title">Post title <span className="text-muted-foreground">(required for YouTube)</span></label>
                                                <Input
                                                    id="global-post-title"
                                                    value={globalContent.title}
                                                    onChange={(event) => setGlobalContent((prev) => ({ ...prev, title: event.target.value }))}
                                                    placeholder="Give this post a clear title"
                                                    disabled={!hasConnectedChannel}
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <label className="text-xs font-medium" htmlFor="global-post-description">Description <span className="text-muted-foreground">(required for YouTube)</span></label>
                                                <Textarea
                                                    id="global-post-description"
                                                    value={globalContent.description}
                                                    onChange={(event) => setGlobalContent((prev) => ({ ...prev, description: event.target.value }))}
                                                    placeholder="Summarize the post for platforms that support descriptions"
                                                    className="min-h-20 resize-y"
                                                    disabled={!hasConnectedChannel}
                                                />
                                            </div>
                                        </div>
                                        <ContentTextarea
                                            value={globalContent?.text || ""}
                                            images={globalContent?.images || []}
                                            video={globalContent.video}
                                            placeholder="Write your main content here..
        . It will be copied to channels when you select them"
                                            minHeight={270}
                                            showAIAssistant={true}
                                            disabled={!hasConnectedChannel}
                                            contentClass="text-sm placeholder:opacity-50 pt-0!"
                                            onChange={(text) => handleGlobalContentChange(text)}
                                            onImagesChange={(images) =>
                                                handleGlobalContentChange(globalContent.text, images)
                                            }
                                            onVideoChange={(video) => setGlobalContent((prev) => ({ ...prev, video }))}
                                        />
                                    </div>
                                ) : (
                                    <Accordion
                                        type="single"
                                        collapsible
                                        value={activeAccordion}
                                        className="w-full space-y-3"
                                        onValueChange={(val) => {
                                            handleAccordionChange(val)
                                        }}
                                    >
                                        {selectedChannelsList?.map((channel) => {
                                            const content = channelContent[channel.id] || { title: "", description: "", text: "", images: [], video: null };
                                            const isExpanded = activeAccordion === channel.id;
                                            const icon = getChannelIcon(channel.type);
                                            const supportsMetadata = supportsSeparateTitleAndDescription(channel);
                                            return (
                                                <AccordionItem
                                                    key={channel.id}
                                                    value={channel.id}
                                                    className="border rounded-xl"
                                                >
                                                    {!isExpanded && (
                                                        <AccordionTrigger
                                                            className="w-full px-3 cursor-pointer [&>svg]:hidden! hover:bg-muted
hover:no-underline! justify-start gap-3 
"
                                                        >
                                                            <span>
                                                                <HugeiconsIcon
                                                                    icon={icon}
                                                                    className={cn(
                                                                        "shrink-0 text-white! size-5! p-[3px] rounded-sm",
                                                                    )}
                                                                    style={{ background: channel.color }}
                                                                />
                                                            </span>
                                                            {content.text ? (
                                                                <p className="text-sm text-muted-foreground/80 
truncate flex-1 text-left max-w-[400px]">
                                                                    {content.text}
                                                                </p>
                                                            ) : (
                                                                <p className="text-sm tex-muted">What would you like to share</p>
                                                            )}
                                                        </AccordionTrigger>
                                                    )}

                                                    <AccordionContent className="overflow-visible">
                                                        <div className="flex pt-3 px-3 gap-3">
                                                            {isExpanded && (
                                                                <span>
                                                                    <HugeiconsIcon
                                                                        icon={icon}
                                                                        className={cn(
                                                                            "shrink-0 text-white! size-5! p-[3px] rounded-sm",
                                                                        )}
                                                                        style={{ background: channel.color }}
                                                                    />
                                                                </span>
                                                            )}

                                                            <div className="flex-1">
                                                                {!content?.text && (
                                                                    <div className="w-full flex items-center gap-2 rounded-md
bg-[#ffefd0] px-3 py-1 text-xs text-amber-700
dark:bg-amber-950/40
dark:text-amber-400">
                                                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                                        <p>Please include at least some text or an attachment.</p>
                                                                    </div>
                                                                )}

                                                                {supportsMetadata && <div className="mb-4 grid gap-3">
                                                                    <div className="grid gap-1.5">
                                                                        <label className="text-xs font-medium" htmlFor={`post-title-${channel.id}`}>
                                                                            Post title {channel.type === "YOUTUBE" && <span className="text-muted-foreground">(required)</span>}
                                                                        </label>
                                                                        <Input
                                                                            id={`post-title-${channel.id}`}
                                                                            value={content.title}
                                                                            onChange={(event) => setChannelContent((prev) => ({
                                                                                ...prev,
                                                                                [channel.id]: { ...content, title: event.target.value },
                                                                            }))}
                                                                            placeholder="Give this post a clear title"
                                                                            disabled={!channel.connected}
                                                                        />
                                                                    </div>
                                                                    <div className="grid gap-1.5">
                                                                        <label className="text-xs font-medium" htmlFor={`post-description-${channel.id}`}>
                                                                            Description {channel.type === "YOUTUBE" && <span className="text-muted-foreground">(required)</span>}
                                                                        </label>
                                                                        <Textarea
                                                                            id={`post-description-${channel.id}`}
                                                                            value={content.description}
                                                                            onChange={(event) => setChannelContent((prev) => ({
                                                                                ...prev,
                                                                                [channel.id]: { ...content, description: event.target.value },
                                                                            }))}
                                                                            placeholder="Add a platform-ready description"
                                                                            className="min-h-20 resize-y"
                                                                            disabled={!channel.connected}
                                                                        />
                                                                    </div>
                                                                </div>}

                                                                <ContentTextarea
                                                                    value={content?.text || ""}
                                                                    images={content?.images || []}
                                                                    video={content.video}
                                                                    allowImages={channel.type !== "YOUTUBE"}
                                                                    mediaDescription={channel.type === "YOUTUBE"
                                                                        ? "Attach one 9:16 short video for this YouTube post."
                                                                        : undefined}
                                                                    placeholder="Start writing or get inspired by AI"
                                                                    minHeight={260}
                                                                    contentClass="text-sm placeholder:opacity-50 pt-0"
                                                                    showAIAssistant={true}
                                                                    disabled={!channel.connected}
                                                                    onAIAssistantClick={() => {
                                                                        setSelectedRightTab("ai")
                                                                    }}
                                                                    onChange={(text) => handleTextChange(
                                                                        channel.id, text, channel.character_limit
                                                                    )}
                                                                    onImagesChange={(images) => {
                                                                        if (channel.type === "YOUTUBE" && images.length) {
                                                                            toast.error("YouTube requires video content. It was not selected for this photo post.")
                                                                            return
                                                                        }
                                                                        setChannelContent((prev) => (
                                                                            {
                                                                                ...prev,
                                                                                [channel.id]: {
                                                                                    ...content,
                                                                                    images,
                                                                                }
                                                                            }
                                                                        ))
                                                                    }}
                                                                    onVideoChange={(video) => setChannelContent((prev) => ({ ...prev, [channel.id]: { ...content, video } }))}

                                                                    renderToolbarRight={
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={cn(
                                                                                "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                                                                (content?.text?.length || 0) >= Number(channel.character_limit) * 0.9
                                                                                    ? "bg-orange-100 text-orange-600"
                                                                                    : "bg-muted text-muted-foreground"
                                                                            )}>
                                                                                {content?.text?.length || 0} / {channel.character_limit}
                                                                            </span>
                                                                        </div>
                                                                    }

                                                                />
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            )
                                        })}
                                    </Accordion>
                                )}

                            </div>
                        </div>


                        {/* Right — channel preview */}
                        {selectedRightTab && (
                            <div className="post-dialog-scrollbar flex h-[360px] min-h-0 w-full shrink-0 flex-col overflow-y-auto border-t border-border bg-muted/30 xl:h-auto xl:w-[350px] xl:border-t-0 xl:border-l
            ">
                                <div className="flex min-h-0 flex-1 flex-col py-4">
                                    {selectedRightTab === "ai" && (
                                        <div className="px-6">
                                            <AIAssistant 
                            content={channelContent[activeAccordion]?.text || 
                                globalContent?.text || ""
                            }
                            channelId={activeAccordion}
                            structured={true}
                            onGenerate={(generated) => {
                                const targetChannelId = activeAccordion || activePreview || selectedChannels[0];
                                if (!targetChannelId) {
                                    setGlobalContent((prev) => ({
                                        ...prev,
                                        title: generated.title ?? prev.title,
                                        description: generated.description ?? prev.description,
                                        text: generated.content,
                                    }));
                                    return;
                                }
                                setChannelContent((prev) => ({
                                ...prev,
                                [targetChannelId]: {
                                    ...prev[targetChannelId],
                                    title: generated.title ?? prev[targetChannelId]?.title ?? "",
                                    description: generated.description ?? prev[targetChannelId]?.description ?? "",
                                    text: generated.content,
                                }
                                }))
                            }}
                        />
                                        </div>
                                    )}

                                    {selectedRightTab === "ideas" && (
                                        <IdeasList
                                            onSelect={handleIdeaSelect}
                                        />
                                    )}

                                    {selectedRightTab === "preview" && (
                                        <PreviewPanel
                                            channel={previewChannel}
                                            content={previewContent}
                                        />
                                    )}
                                </div>
                            </div>

                        )}

                    </div>
                </div>

                <DialogFooter className="m-0! shrink-0 px-4 pb-4 pt-5 sm:px-8">
                    {hasConnectedChannel ? (
                        <div className="w-full flex items-center justify-between
                        gap-2
                        ">
                            <Button
                                size="lg"
                                variant="ghost"
                                disabled={createPostMutation.isPending}
                                onClick={() => handleCreatePost(POST_STATUS.DRAFT)}
                            >
                                {createPostMutation.isPending && createPostMutation.variables.status === POST_STATUS.DRAFT && <Spinner />}
                                Save Draft
                            </Button>
                            <ButtonGroup className="p-0!">
                                <ScheduleDatePicker
                                    date={date}
                                    setDate={setDate}
                                    time={timeSlot}
                                    setTime={setTimeSlot}
                                    renderButton={(isDatePassed, isTimeNotAvailable) => <Button
                                        size="lg"
                                        className="border py-4.5 px-4"
                                        disabled={createPostMutation.isPending || !date || !timeSlot || isDatePassed || isTimeNotAvailable}
                                        onClick={() => {
                                            if (isDatePassed || isTimeNotAvailable) {
                                                toast.error("Please select a valid date and time")
                                                return;
                                            }
                                            handleCreatePost()
                                        }}
                                    >
                                        {createPostMutation.isPending && createPostMutation.variables.status === undefined && <Spinner />}
                                        Schedule Post
                                    </Button>}

                                />
                            </ButtonGroup>
                        </div>
                    ) : (
                        <Button size="lg" asChild>
                            <Link href="/settings"> Connect Channel to Post</Link>
                        </Button>
                    )}
                </DialogFooter>

            </DialogContent>
        </Dialog>
    )
}

export default CreatePostDialog
