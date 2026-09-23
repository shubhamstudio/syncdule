"use client"

import * as React from "react"
import { EmojiPicker } from "@ferrucc-io/emoji-picker"
import { X, Wand2Icon, ImagePlus, SmileIcon, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Separator } from "./ui/separator"
import { Spinner } from "./ui/spinner"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Textarea } from "./ui/textarea"
import { ImageObject, VideoObject } from "@/types/post.type"
import { toast } from "sonner"

const MAX_VIDEO_SIZE_BYTES = 250 * 1024 * 1024

interface ContentTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  contentClass?: string
  minHeight?: number
  showAIAssistant?: boolean
  onAIAssistantClick?: () => void
  showHashtag?: boolean
  className?: string
  images?: ImageObject[]
  onImagesChange?: (images: ImageObject[]) => void
  video?: VideoObject | null
  onVideoChange?: (video: VideoObject | null) => void
  allowImages?: boolean
  mediaDescription?: string
  renderToolbarRight?: React.ReactNode
  renderContent?: React.ReactNode
  disabled?: boolean
}

const ContentTextarea = ({
  value,
  onChange,
  placeholder = "What's on your mind?",
  contentClass,
  minHeight = 280,
  showAIAssistant = false,
  onAIAssistantClick,
  className,
  images = [],
  onImagesChange,
  video = null,
  onVideoChange,
  allowImages = true,
  mediaDescription = "Choose photos or one video for this post.",
  renderToolbarRight,
  renderContent,
  disabled = false
}: ContentTextareaProps) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const videoInputRef = React.useRef<HTMLInputElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [emojiOpen, setEmojiOpen] = React.useState(false)

  const readUploadResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      await response.text()
      throw new Error(`Upload request failed (${response.status}). Restart the dev server and check its terminal output.`)
    }

    const result = await response.json() as { error?: string; image?: ImageObject; video?: VideoObject }
    if (!response.ok) throw new Error(result.error || "Upload failed")
    return result
  }

  const insertEmoji = (emoji: string) => {
    if (disabled) return
    const textarea = textareaRef.current
    if (!textarea) {
      onChange(`${value}${emoji}`)
      setEmojiOpen(false)
      return
    }
    const start = textarea.selectionStart ?? value.length
    const end = textarea.selectionEnd ?? value.length
    const nextValue = `${value.slice(0, start)}${emoji}${value.slice(end)}`

    onChange(nextValue)
    setEmojiOpen(false)
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, kind: "image" | "video") => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (kind === "image" && video) {
      toast.error("Remove the video before adding photos")
      e.target.value = ""
      return
    }

    if (kind === "video" && images.length > 0) {
      toast.error("Remove the photos before adding a video")
      e.target.value = ""
      return
    }

    if (kind === "video" && files[0].size > MAX_VIDEO_SIZE_BYTES) {
      toast.error("Videos must be 250 MB or smaller")
      e.target.value = ""
      return
    }

    setIsUploading(true)
    const newImages = [...images]

    try {
      const filesToUpload = kind === "video" ? Array.from(files).slice(0, 1) : Array.from(files)
      for (const file of filesToUpload) {
        const formData = new FormData()
        formData.append("file", file)
        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        })
        const result = await readUploadResponse(response)
        if (result.image) {
          newImages.push({
            url: result.image.url,
            key: result.image.key
          })
        }
        if (result.video) onVideoChange?.(result.video)
      }
      // Do not write the image state after a video upload: the parent update
      // would otherwise use a stale closure and clear the newly stored video.
      if (kind === "image") onImagesChange?.(newImages)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsUploading(false)
      e.target.value = ""
    }
  }

  const handleRemoveImage = (index: number) => {
    onImagesChange?.(images.filter((_, i) => i !== index))
  }

  return (
       <div className={cn("flex flex-col h-full", className)}>
    
      {/* Editable area */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        //minHeight={minHeight}
        className={cn(
           "flex-[0.2] bg-transparent ring-0! border-none! resize-none! pt-0! pl-0! pr-0!",
          "placeholder:text-muted-foreground/80 overflow-y-auto",
          disabled && "opacity-50 cursor-not-allowed",
          contentClass
          // `w-full bg-transparent 
          // text-base
          // placeholder:text-muted-foreground/80 focus:outline-none`,
          // //contentClass && contentClass,
          // disabled && "opacity-50 cursor-not-allowed"
        )}
     style={{ minHeight: `${minHeight}px`, maxHeight: `${minHeight}px` }}
      />

      <div className="mt-3 shrink-0 space-y-3 border-t border-white/10 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-foreground">Media</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{mediaDescription}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            One type per post
          </span>
        </div>

        {/* A post has either a photo set or one video, never both. */}
        <div className={cn("grid max-w-md gap-2 sm:gap-3", allowImages ? "grid-cols-2" : "grid-cols-1")}>
          {allowImages && <>
            <button
            type="button"
            aria-label={video ? "Remove the video to add photos" : "Add photos"}
            disabled={Boolean(isUploading || disabled || video)}
            onClick={() => !video && !isUploading && !disabled && fileInputRef.current?.click()}
            className={cn(
              "group flex min-h-[92px] flex-col justify-between rounded-lg border p-3 text-left transition-all",
              images.length > 0
                ? "border-primary/45 bg-primary/[0.07] text-foreground"
                : "border-dashed border-white/15 bg-white/[0.018] hover:border-primary/45 hover:bg-primary/[0.045]",
              (isUploading || disabled || video) && "cursor-not-allowed opacity-45",
              disabled && "grayscale"
            )}
          >
            <span className="grid size-8 place-items-center rounded-md bg-white/[0.07] text-primary transition-transform group-hover:scale-105">
              {isUploading ? <Spinner /> : <ImagePlus className="size-4" />}
            </span>
            <span>
              <span className="block text-sm font-semibold">{isUploading ? "Uploading…" : "Photos"}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">Add one or more images</span>
            </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => handleMediaUpload(event, "image")}
              className="hidden"
            />
          </>}

          {video ? (
            <div className="relative min-h-[92px] overflow-hidden rounded-lg border border-primary/45 bg-primary/[0.07] p-2.5">
              <video src={video.url} className="h-[84px] w-full rounded-md object-cover" muted playsInline />
              <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between rounded-md bg-black/65 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                <span>Video attached</span>
                <span>Remove to replace</span>
              </div>
              <button
                type="button"
                aria-label="Remove video"
                onClick={() => onVideoChange?.(null)}
                className="absolute right-3 top-3 rounded-full bg-black/75 p-1.5 text-white transition-colors hover:bg-black"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={images.length ? "Remove the photos to add a video" : "Add a short video"}
              disabled={Boolean(isUploading || disabled || images.length > 0)}
              onClick={() => !images.length && !isUploading && !disabled && videoInputRef.current?.click()}
              className={cn(
                "group flex min-h-[92px] flex-col justify-between rounded-lg border p-3 text-left transition-all",
                "border-dashed border-white/15 bg-white/[0.018] hover:border-primary/45 hover:bg-primary/[0.045]",
                (isUploading || disabled || images.length > 0) && "cursor-not-allowed opacity-45",
                disabled && "grayscale"
              )}
            >
              <span className="grid size-8 place-items-center rounded-md bg-white/[0.07] text-primary transition-transform group-hover:scale-105">
                {isUploading ? <Spinner /> : <Video className="size-4" />}
              </span>
              <span>
                <span className="block text-sm font-semibold">Video</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">Short videos only · max 250 MB · 9:16 ratio</span>
                <span className="block text-[11px] leading-4 text-muted-foreground">Long-form videos aren’t supported yet.</span>
              </span>
            </button>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={(event) => handleMediaUpload(event, "video")}
            className="hidden"
          />
        </div>

        {images.length > 0 && (
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <div key={image.key || index} className="relative size-[76px] shrink-0 overflow-hidden rounded-md border border-white/10">
                <img src={image.url} alt={`Upload ${index + 1}`} className="size-full object-cover" />
                <button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => handleRemoveImage(index)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white transition-colors hover:bg-black">
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <Button size="icon" className="cursor-pointer" variant="ghost" disabled={disabled}>
                  <SmileIcon className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[300px] p-0!">
                <EmojiPicker
                  onEmojiSelect={insertEmoji}
                  className="w-full! rounded-lg bg-popover ring-0!"
                  emojisPerRow={6}
                  emojiSize={36}
                >
                  <EmojiPicker.Header className="border-b border-border pb-2">
                    <EmojiPicker.Input
                      placeholder="Search emoji"
                      autoFocus
                      className="h-8 border border-border! bg-background ring-0!"
                    />
                  </EmojiPicker.Header>
                  <EmojiPicker.Group>
                    <EmojiPicker.List hideStickyHeader containerHeight={320} />
                  </EmojiPicker.Group>
                </EmojiPicker>
              </PopoverContent>
            </Popover>
            <Separator orientation="vertical" className="mx-0 my-1.5" />
            {showAIAssistant && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-7 gap-1.5 text-sm"
                onClick={onAIAssistantClick}
                disabled={disabled}
              >
                <Wand2Icon className="h-3.5 w-3.5" />
                AI Assistant
              </Button>
            )}
          </div>
          {renderToolbarRight && (
            <div className="flex items-center gap-2">{renderToolbarRight}</div>
          )}
        </div>

        {renderContent && <>{renderContent}</>}
      </div>
    </div>
  )
}
export default ContentTextarea
