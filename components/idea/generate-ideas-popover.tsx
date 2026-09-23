"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { ArrowUpRight, Sparkles, Check, X, Zap } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Spinner } from "../ui/spinner"
import { Textarea } from "../ui/textarea"
import { toast } from "sonner"
import Link from "next/link"

interface GenerateIdeasPopoverProps {
  onGenerated: (title: string, description: string) => void
  destinationLabel?: string
}

export function GenerateIdeasPopover({ onGenerated, destinationLabel = "board" }: GenerateIdeasPopoverProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)

  const [businessType, setBusinessType] = useState("")
  const [targetAudience, setTargetAudience] = useState("")

  const [generatedIdeas, setGeneratedIdeas] = useState<{
    title: string; description: string
  }[]>([])
  
  const [selectedIdea, setSelectedIdea] = useState(0)
  const { data: billing, isLoading: isBillingLoading } = useQuery({
    queryKey: ["billing-status"],
    queryFn: async () => {
      const response = await fetch("/api/billing/status")
      if (!response.ok) throw new Error("Unable to load billing status")
      return response.json() as Promise<{ canUseAI: boolean }>
    },
  })
  const canUseAI = billing?.canUseAI === true
  

  const generateMutation = useMutation({
    mutationFn: async ({ businessType, targetAudience }: {
      businessType: string; targetAudience: string
    }) => {
      const res = await fetch("/api/idea/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType, targetAudience }),
      })
      const data = await res.json().catch(() => null) as { ideas?: unknown; error?: unknown } | null
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to generate ideas")
      }
      if (!Array.isArray(data?.ideas) || data.ideas.length === 0) {
        throw new Error("AI did not return any usable ideas. Please try again.")
      }
      return { ideas: data.ideas as { title: string; description: string }[] }
    },
    onSuccess: (data) => {
      setGeneratedIdeas(data.ideas || [])
      setStep(2)
    },
    onError: (error: unknown) => {
      console.error("Generation error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate ideas. Please try again.")
    }
  })

  const handleGenerate = () => {
    if (!businessType || !targetAudience) {
      toast.error("Please provide both business type and target audience")
      return
    }
    generateMutation.mutate({
      businessType,
      targetAudience
    })
  }

  const handleUseIdea = () => {
    const idea = generatedIdeas[selectedIdea]
    if (!idea) return
    onGenerated(idea.title, idea.description)
    // Reset state
    setOpen(false)
    setStep(1)
    setGeneratedIdeas([])
    setBusinessType("")
    setTargetAudience("")
    setSelectedIdea(0)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 
        bg-linear-to-r from-[#b0ec9c33] to-[#d1bdff33]">
          <Sparkles className="h-4 w-4" />
          Generate Ideas
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "flex w-[calc(100vw-1rem)] max-w-[400px] flex-col overflow-hidden p-4 shadow-lg",
          step === 2 && "h-[min(560px,var(--radix-popover-content-available-height))]"
        )}
        align="end"
      >
      {!canUseAI && !isBillingLoading && (
         <div className="mb-4 rounded-lg border border-primary/25 bg-primary/[0.07] p-3 text-foreground">
            <div className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary"><Zap className="size-4" /></span>
              <div>
                <p className="text-sm font-semibold">Find your next standout idea</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Try Pro for more AI idea angles, stronger hooks, and ready-to-post drafts.</p>
                <Link href="/billing" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80">
                  Try Pro <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
      )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Generate Content Ideas</h3>
              <p className="text-sm text-muted-foreground">
                Tell us about your business to get personalized content ideas.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Business Type</label>
                <Textarea
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="e.g., fitness brand"
                  disabled={!canUseAI}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Target Audience</label>
                <Textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., busy professionals"
                  disabled={!canUseAI}
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !canUseAI}
              size="lg"
              className="w-full gap-2"
            >
              {generateMutation.isPending ? (
                <>
                  <Spinner />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Ideas
                </>
              )}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="shrink-0">
              <h3 className="font-semibold mb-2">Generated Ideas</h3>
              <p className="text-sm text-muted-foreground">
                Select an idea to add to your {destinationLabel}.
              </p>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {generatedIdeas.map((idea, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedIdea(index)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    selectedIdea === index
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={cn(
                        "mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                        selectedIdea === index
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      )}
                    >
                      {selectedIdea === index && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-sm font-medium">{idea.title}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {idea.description}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStep(1)}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleUseIdea}
                className="flex-1"
                size="lg"

              >
                Use Idea
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
