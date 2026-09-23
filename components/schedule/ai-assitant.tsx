
"use client"
import * as React from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowUpRight, Repeat, Minus, Plus, Wand2Icon, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "../ui/spinner"
import Link from "next/link"

const QUICK_ACTIONS = [
  { icon: Repeat, label: "Rephrase" },
  { icon: Minus, label: "Shorten" },
  { icon: Plus, label: "Expand" },
]

interface AIAssistantProps {
  onGenerate?: (content: GeneratedPostCopy) => void
  className?: string
  content?: string 
  channelId?: string
  structured?: boolean
}

export type GeneratedPostCopy = {
  content: string
  title?: string
  description?: string
}

export function AIAssistant({ className, content, channelId, structured = false, onGenerate }: AIAssistantProps) {
  const [prompt, setPrompt] = React.useState("")
  const { data: billing, isLoading } = useQuery({
    queryKey: ["billing-status"],
    queryFn: async () => {
      const response = await fetch("/api/billing/status")
      if (!response.ok) throw new Error("Unable to load billing status")
      return response.json() as Promise<{ canUseAI: boolean }>
    },
  })
  const canUseAI = billing?.canUseAI === true

  const generateMutation = useMutation({
    mutationFn: async ({ action, promptText }: { action: string; promptText?: string }) => {
      const res = await fetch("/api/post/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          prompt: promptText,
          content,
          channelId,
          structured: structured && action === "generate",
        }),
      })
      const data = await res.json().catch(() => null) as { content?: unknown; title?: unknown; description?: unknown; error?: unknown } | null
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to generate post")
      }
      if (typeof data?.content !== "string" || !data.content.trim()) {
        throw new Error("AI returned an empty response. Please try again.")
      }
      return {
        content: data.content,
        title: typeof data.title === "string" ? data.title : undefined,
        description: typeof data.description === "string" ? data.description : undefined,
      }
    },
    onSuccess: (data) => {
      // setGeneratedContent(data.content)
      onGenerate?.(data)
      setPrompt("")
    },
    onError: (error: unknown) => {
      console.error("Generation error:", error)
      const message = error instanceof Error ? error.message : "Failed to generate post. Please try again."
      toast.error(message)
    },
  })

  const handleQuickAction = (label: string) => {
    generateMutation.mutate({
      action: label.toLowerCase()
    })
  }

  const handleGenerate = () => {
    if (prompt.trim()) {
      generateMutation.mutate({
        action: "generate",
        promptText: prompt.trim()
      })
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-lg border border-border bg-background p-4",
        className
      )}
    >

      {!canUseAI && !isLoading && (
         <div className="mb-4 rounded-lg border border-primary/25 bg-primary/[0.07] p-3 text-foreground">
            <div className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary"><Zap className="size-4" /></span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Make every post stronger</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Try Pro for sharper hooks, on-brand captions, and more content ideas.</p>
                <Link href="/billing" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80">
                  Try Pro <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
      )}
      
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 ">
          <Wand2Icon className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-semibold bg-linear-to-r from-purple-500
           to-blue-500 bg-clip-text text-transparent">
            AI Assistant
          </span>
        </div>
      </div>

      <p className="mb-3 text-sm font-medium">
        How can I help with this post?
      </p>

      {/* Textarea for custom prompt */}
      <div className="flex flex-col gap-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Eg. Promote my photography course to get new signups. Registration closes in 3 days."
          className="w-full min-h-[130px] resize-none"
          disabled={!canUseAI}
        />

        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={!prompt.trim() || generateMutation.isPending || !canUseAI}
          className="w-full gap-2 bg-linear-to-r
           from-purple-500 from-50%  to-blue-500 text-white"
        >
          {generateMutation.isPending && generateMutation.variables?.action === "generate" ? (
            <Spinner />
          ) : (
            <Wand2Icon className="h-4 w-4" />
          )}
          Generate
        </Button>
      </div>

      {content && content.trim() && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted-foreground">Quick actions:</p>
          <div className="flex flex-col gap-2">
            {QUICK_ACTIONS.map(({ icon: Icon, label }) => (
              <Button
                key={label}
                variant="outline"
                className="justify-start gap-2 text-sm font-normal h-9"
                onClick={() => handleQuickAction(label)}
                disabled={generateMutation.isPending || !canUseAI}
              >
                {generateMutation.isPending && generateMutation.variables?.action === label.toLowerCase() ? (
                  <Spinner className="h-4 w-4 text-purple-500" />
                ) : (
                  <Icon className="h-4 w-4 text-purple-500" />
                )}
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="mt-auto pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          Pro tips: Add context for better results
        </span>
      </p>
    </div>
  )
}
