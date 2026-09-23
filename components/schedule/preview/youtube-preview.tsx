"use client"

import { useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ThumbsUp, ThumbsDown, MessageSquare, Share2, Pause, Play } from "lucide-react"
import { DEFAULT_SOCIAL_HANDLE } from "@/constants/app"
import { VideoObject } from "@/types/post.type"

interface YoutubePreviewProps {
  title?: string
  text: string
  images?: string[]
  video?: VideoObject | null
}

export function YoutubePreview({ title, text, images, video }: YoutubePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlayback = async () => {
    const player = videoRef.current
    if (!player) return

    if (player.paused) {
      try {
        await player.play()
      } catch {
        setIsPlaying(false)
      }
      return
    }

    player.pause()
  }

  return (
    <Card className="overflow-hidden border-none! shadow-none bg-transparent">
      <CardContent className="p-0">
        {/* Main Shorts Container - 9:16 Aspect Ratio */}
        <div className="relative aspect-[9/16] w-full max-w-[340px] mx-auto bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl">
          {/* Video Placeholder / First Image */}
          {video?.url ? (
            <video
              ref={videoRef}
              key={video.url}
              src={video.url}
              poster={images?.[0]}
              className="h-full w-full object-cover"
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
          ) : images && images.length > 0 ? (
            <img
              src={images[0]}
              alt="Shorts Preview"
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="bg-white/10 p-4 rounded-full">
                <Play className="size-10 text-white fill-white" />
              </div>
            </div>
          )}

          {/* Centered Play Button Overlay */}
          {!video?.url && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="rounded-lg bg-black/20 p-4 backdrop-blur-sm">
                <svg viewBox="0 0 24 24" className="size-12 text-white fill-white"><path d="M8 5v14l11-7z"/></svg>
             </div>
          </div>}

          {/* Right Side Interactions */}
          <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4 text-white">
            <div className="flex flex-col items-center">
              <div className="bg-white/10 p-2.5 rounded-full backdrop-blur-md">
                <ThumbsUp className="size-6 -scale-x-100" />
              </div>
              <span className="text-[12px] mt-1 font-medium">Like</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="bg-white/10 p-2.5 rounded-full backdrop-blur-md">
                <ThumbsDown className="size-6" />
              </div>
              <span className="text-[12px] mt-1 font-medium">Dislike</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-white/10 p-2.5 rounded-full backdrop-blur-md">
                <MessageSquare className="size-6" />
              </div>
              <span className="text-[12px] mt-1 font-medium">Comment</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="bg-white/10 p-2.5 rounded-full backdrop-blur-md">
                <Share2 className="size-6" />
              </div>
              <span className="text-[12px] mt-1 font-medium">Share</span>
            </div>
          </div>

          {/* Bottom Info Overlay */}
          {text.trim() && (
            <p className="absolute right-4 bottom-17 left-4 line-clamp-2 text-[13px] leading-snug text-white drop-shadow-md">
              {text}
            </p>
          )}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="size-9 border-2 border-white/20">
                <AvatarImage src="./images/avatar.webp" />
                <AvatarFallback>LM</AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-white">
                <p className="truncate text-[14px] font-bold">{title || `@${DEFAULT_SOCIAL_HANDLE}`}</p>
                {title && <p className="text-[11px]">@{DEFAULT_SOCIAL_HANDLE}</p>}
              </div>
              <button className="ml-1 bg-white text-black text-[12px] font-bold px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors">
                Subscribe
              </button>
            </div>
            
            {/* Music/Audio Thumbnail Placeholder */}
            <div className="size-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white/30 overflow-hidden shadow-lg animate-pulse">
                <Avatar className="size-full rounded-none">
                    <AvatarImage src="./images/avatar.webp" />
                </Avatar>
            </div>
          </div>
          </div>
          {video?.url && (
            <div className="mx-auto mt-3 flex w-full max-w-[340px] justify-center">
              <button
                type="button"
                onClick={togglePlayback}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-white/[0.12]"
                aria-label={isPlaying ? "Pause video preview" : "Play video preview"}
              >
                {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
                {isPlaying ? "Pause preview" : "Play preview"}
              </button>
            </div>
          )}
      </CardContent>
    </Card>
  )
} 
