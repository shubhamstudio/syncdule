"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Lightbulb, Zap, BookmarkPlus, SendHorizonal,
  TrendingUp, Hash, ChevronRight, X, Check,
  Flame, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, WorkspacePanel } from "@/components/workspace-ui";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import CreatePostDialog from "@/components/schedule/create-post-dialog";

type Suggestion = { title: string; description: string; hooks: string[]; outline: string[]; hashtags: string[]; rationale: string };

type TrendItem = {
  topic: string;
  angle: string;
  format: string;
  hashtags: string[];
  why: string;
};

const supportedPlatforms = ["Instagram", "YouTube", "Facebook", "LinkedIn"] as const;
const supportedFormats = ["Reel/Short", "Carousel", "Long-form", "Static post"] as const;

export function ViralSuggestor() {
  const client = useQueryClient();
  const [form, setForm] = useState({
    platform: "Instagram",
    niche: "",
    format: "Reel/Short",
    tone: "Educational",
    audience: "",
    trend: "",
    surprise: false,
  });
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [savedHooks, setSavedHooks] = useState<Set<number>>(new Set());
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [postContent, setPostContent] = useState("");

  // Trending state
  const [trends, setTrends] = useState<TrendItem[] | null>(null);
  const [trendPanelOpen, setTrendPanelOpen] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);

  // --- Generate suggestion ---
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/viral-suggestor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json() as { error?: string; suggestion?: Suggestion };
      if (!response.ok || !body.suggestion) throw new Error(body.error || "Unable to generate a suggestion");
      return body.suggestion;
    },
    onSuccess: (result) => {
      setSuggestion(result);
      setSavedHooks(new Set());
      setSelectedTrend(null);
      void client.invalidateQueries({ queryKey: ["billing-status"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to generate a suggestion"),
  });

  // --- Trending finder ---
  const trendMutation = useMutation({
    mutationFn: async () => {
      if (!form.niche.trim()) throw new Error("Add a niche or industry first");
      const response = await fetch("/api/trending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: form.niche, platform: form.platform, audience: form.audience }),
      });
      const body = await response.json() as { error?: string; result?: { trends: TrendItem[] } };
      if (!response.ok || !body.result) throw new Error(body.error || "Unable to find trends");
      return body.result.trends;
    },
    onSuccess: (result) => {
      setTrends(result);
      setTrendPanelOpen(true);
      void client.invalidateQueries({ queryKey: ["billing-status"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to find trends"),
  });

  // --- Save idea ---
  const saveIdeaMutation = useMutation({
    mutationFn: async ({ title, description, hookIndex }: { title: string; description: string; hookIndex?: number }) => {
      // Get default "To Do" group id
      const groupsRes = await fetch("/api/idea");
      const groupsData = await groupsRes.json();
      const todoGroup = groupsData?.groups?.find((g: any) => g.title === "To Do");
      if (!todoGroup) throw new Error("Could not find the To Do board column");

      const res = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, groupId: todoGroup.id, sortOrder: 0 }),
      });
      if (!res.ok) throw new Error("Failed to save idea");
      return { hookIndex };
    },
    onSuccess: ({ hookIndex }) => {
      toast.success("Idea saved to your board!");
      if (hookIndex !== undefined) setSavedHooks((prev) => new Set([...prev, hookIndex]));
      void client.invalidateQueries({ queryKey: ["ideas"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save idea"),
  });

  // --- Post this ---
  const handlePostThis = (content: string) => {
    setPostContent(content);
    setCreatePostOpen(true);
  };

  // Apply a trending topic to the form
  const applyTrend = (trend: TrendItem) => {
    setForm((prev) => ({
      ...prev,
      trend: trend.topic,
      format: supportedFormats.includes(trend.format as (typeof supportedFormats)[number])
        ? (trend.format as typeof prev.format)
        : prev.format,
      surprise: false,
    }));
    setSelectedTrend(trend);
    setTrendPanelOpen(false);
    toast.success(`Applied "${trend.topic}" — click Generate to build content around it`);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        eyebrow="AI strategy lab"
        title="Viral Content Suggestor"
        description="Find a platform-native angle, then make it your own. Results are informed hypotheses—not promises of reach."
      />

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* ── Left: form ── */}
        <WorkspacePanel className="p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Platform">
              <Select value={form.platform} onValueChange={(platform) => setForm({ ...form, platform })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{supportedPlatforms.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Content format">
              <Select value={form.format} onValueChange={(format) => setForm({ ...form, format })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{supportedFormats.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Niche or industry">
              <Input
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
                placeholder="e.g. personal finance"
              />
            </Field>

            <Field label="Tone">
              <Select value={form.tone} onValueChange={(tone) => setForm({ ...form, tone })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Funny", "Educational", "Inspirational", "Opinionated", "Conversational"].map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Target audience" className="sm:col-span-2">
              <Textarea
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                placeholder="Who should stop scrolling for this?"
                className="min-h-20"
              />
            </Field>

            <Field label="Topic to explore (optional)" className="sm:col-span-2">
              <div className="relative">
                <Input
                  value={form.trend}
                  onChange={(e) => setForm({ ...form, trend: e.target.value })}
                  disabled={form.surprise}
                  placeholder="A trend, conversation, or campaign theme"
                  className={cn(selectedTrend && "border-primary/50 bg-primary/[0.04] pr-8")}
                />
                {selectedTrend && (
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setSelectedTrend(null); setForm((p) => ({ ...p, trend: "" })); }}
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </Field>
          </div>

          <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={form.surprise}
              onChange={(e) => setForm({ ...form, surprise: e.target.checked })}
              className="size-4 accent-primary"
            />
            Surprise me with a fresh angle
          </label>

          {/* Action buttons */}
          <div className="mt-5 flex flex-col gap-2">
            <Button className="w-full" size="lg" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? <Spinner /> : <Zap className="size-4" />}
              {mutation.isPending ? "Finding an angle…" : "Generate suggestion"}
            </Button>

            {/* Trending Finder */}
            <Button
              variant="outline"
              className="w-full gap-2"
              size="lg"
              disabled={trendMutation.isPending || !form.niche.trim()}
              onClick={() => {
                if (trendPanelOpen && trends) { setTrendPanelOpen(false); return; }
                trendMutation.mutate();
              }}
            >
              {trendMutation.isPending ? <Spinner /> : <Flame className="size-4 text-orange-400" />}
              {trendMutation.isPending
                ? "Scanning trends…"
                : trendPanelOpen
                  ? "Hide trends"
                  : "Find Trending Topics"}
            </Button>
          </div>

          {/* Trending panel */}
          {trendPanelOpen && trends && (
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <TrendingUp className="size-3.5" />
                  Trending in {form.niche} · {form.platform}
                </p>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  onClick={() => trendMutation.mutate()}
                >
                  <RefreshCw className="size-3" /> Refresh
                </button>
              </div>
              {trends.map((trend, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTrend(trend)}
                  className="w-full text-left rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary/[0.04] group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{trend.topic}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{trend.angle}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary mt-0.5 transition-colors" />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {trend.hashtags.slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-muted-foreground">
                        <Hash className="size-2.5" />{tag.replace("#", "")}
                      </span>
                    ))}
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{trend.format}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </WorkspacePanel>

        {/* ── Right: results ── */}
        <WorkspacePanel className="min-h-80 p-4 sm:p-6">
          {!suggestion ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
              <Lightbulb className="size-8 text-primary" />
              <p className="mt-4 font-medium">Your next angle starts here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Choose the audience and platform constraints to get hooks, a practical outline, and tags.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Title & Description */}
              {(suggestion.title || suggestion.description) && (
                <section className="space-y-2 rounded-md border border-white/5 bg-white/[0.015] p-4">
                  {suggestion.title && <h3 className="text-base font-semibold">{suggestion.title}</h3>}
                  {suggestion.description && <p className="text-sm text-muted-foreground">{suggestion.description}</p>}
                </section>
              )}

              {/* Hooks */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Hooks to test</p>
                <ul className="mt-2 space-y-2">
                  {suggestion.hooks.map((hook, index) => (
                    <li key={hook} className="group rounded-md border border-white/10 bg-white/[0.025] p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 text-primary">{index + 1}.</span>
                        <span className="flex-1">{hook}</span>
                        {/* Hook actions */}
                        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            title="Save this hook as an idea"
                            disabled={saveIdeaMutation.isPending || savedHooks.has(index)}
                            onClick={() => saveIdeaMutation.mutate({
                              title: suggestion.title || hook,
                              description: `${hook}\n\n${suggestion.description || ""}\n\n${suggestion.outline.join("\n")}`,
                              hookIndex: index,
                            })}
                          >
                            {savedHooks.has(index)
                              ? <Check className="size-3.5 text-emerald-400" />
                              : <BookmarkPlus className="size-3.5" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            title="Create a post from this hook"
                            onClick={() => handlePostThis(
                              `${hook}\n\n${suggestion.description ? suggestion.description + "\n\n" : ""}${suggestion.outline.join("\n")}\n\n${suggestion.hashtags.join(" ")}`
                            )}
                          >
                            <SendHorizonal className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Outline */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Content outline</p>
                <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {suggestion.outline.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}
                </ol>
              </section>

              {/* Hashtags */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Suggested hashtags</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {suggestion.hashtags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-muted-foreground">
                      <Hash className="size-3" />{tag.replace("#", "")}
                    </span>
                  ))}
                </div>
              </section>

              {/* Rationale */}
              <section className="rounded-md border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Why this angle may work</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{suggestion.rationale}</p>
              </section>

              {/* Footer actions */}
              <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={saveIdeaMutation.isPending}
                  onClick={() => saveIdeaMutation.mutate({
                    title: suggestion.title || suggestion.hooks[0] || "Viral content idea",
                    description: `${suggestion.description ? suggestion.description + "\n\n" : ""}${suggestion.outline.join("\n")}\n\n${suggestion.hashtags.join(" ")}`,
                  })}
                >
                  <BookmarkPlus className="size-4" />
                  Save as Idea
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => handlePostThis(
                    `${suggestion.hooks[0]}\n\n${suggestion.description ? suggestion.description + "\n\n" : ""}${suggestion.outline.join("\n")}\n\n${suggestion.hashtags.join(" ")}`
                  )}
                >
                  <SendHorizonal className="size-4" />
                  Post This
                </Button>
              </div>
            </div>
          )}
        </WorkspacePanel>
      </div>

      {/* Create Post Dialog pre-filled with viral content */}
      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        initialContent={postContent}
      />
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="mb-2 block text-sm">{label}</Label>{children}</div>;
}
