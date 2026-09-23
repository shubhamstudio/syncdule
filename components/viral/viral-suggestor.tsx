"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, WorkspacePanel } from "@/components/workspace-ui";
import { Spinner } from "@/components/ui/spinner";

type Suggestion = { hooks: string[]; outline: string[]; hashtags: string[]; rationale: string };
const supportedPlatforms = ["Instagram", "YouTube", "Facebook", "LinkedIn"] as const;
const supportedFormats = ["Reel/Short", "Carousel", "Long-form", "Static post"] as const;

export function ViralSuggestor() {
  const client = useQueryClient();
  const [form, setForm] = useState({ platform: "Instagram", niche: "", format: "Reel/Short", tone: "Educational", audience: "", trend: "", surprise: false });
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/viral-suggestor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json() as { error?: string; suggestion?: Suggestion };
      if (!response.ok || !body.suggestion) throw new Error(body.error || "Unable to generate a suggestion");
      return body.suggestion;
    },
    onSuccess: (result) => { setSuggestion(result); void client.invalidateQueries({ queryKey: ["billing-status"] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to generate a suggestion"),
  });

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
    <PageHeader eyebrow="AI strategy lab" title="Viral Content Suggestor" description="Find a platform-native angle, then make it your own. Results are informed hypotheses—not promises of reach." />
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <WorkspacePanel className="p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Platform"><Select value={form.platform} onValueChange={(platform) => setForm({ ...form, platform })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{supportedPlatforms.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Content format"><Select value={form.format} onValueChange={(format) => setForm({ ...form, format })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{supportedFormats.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Niche or industry"><Input value={form.niche} onChange={(event) => setForm({ ...form, niche: event.target.value })} placeholder="e.g. personal finance" /></Field>
          <Field label="Tone"><Select value={form.tone} onValueChange={(tone) => setForm({ ...form, tone })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Funny", "Educational", "Inspirational", "Opinionated", "Conversational"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Target audience" className="sm:col-span-2"><Textarea value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} placeholder="Who should stop scrolling for this?" className="min-h-20" /></Field>
          <Field label="Topic to explore (optional)" className="sm:col-span-2"><Input value={form.trend} onChange={(event) => setForm({ ...form, trend: event.target.value })} disabled={form.surprise} placeholder="A trend, conversation, or campaign theme" /></Field>
        </div>
        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted-foreground"><input type="checkbox" checked={form.surprise} onChange={(event) => setForm({ ...form, surprise: event.target.checked })} className="size-4 accent-primary" /> Surprise me with a fresh angle</label>
        <Button className="mt-5 w-full" size="lg" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? <Spinner /> : <Zap className="size-4" />}{mutation.isPending ? "Finding an angle…" : "Generate suggestion"}</Button>
      </WorkspacePanel>
      <WorkspacePanel className="min-h-80 p-4 sm:p-6">
        {!suggestion ? <div className="flex h-full min-h-64 flex-col items-center justify-center text-center"><Lightbulb className="size-8 text-primary" /><p className="mt-4 font-medium">Your next angle starts here</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">Choose the audience and platform constraints to get hooks, a practical outline, and tags.</p></div> : <div className="space-y-5"><section><p className="text-xs font-semibold uppercase tracking-wider text-primary">Hooks to test</p><ul className="mt-2 space-y-2">{suggestion.hooks.map((hook, index) => <li key={hook} className="rounded-md border border-white/10 bg-white/[0.025] p-3 text-sm"><span className="mr-2 text-primary">{index + 1}.</span>{hook}</li>)}</ul></section><section><p className="text-xs font-semibold uppercase tracking-wider text-primary">Content outline</p><ol className="mt-2 space-y-2 text-sm text-muted-foreground">{suggestion.outline.map((step, index) => <li key={step}>{index + 1}. {step}</li>)}</ol></section><section><p className="text-xs font-semibold uppercase tracking-wider text-primary">Suggested hashtags</p><p className="mt-2 text-sm text-muted-foreground">{suggestion.hashtags.join(" ")}</p></section><section className="rounded-md border border-primary/20 bg-primary/5 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Why this angle may work</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{suggestion.rationale}</p></section></div>}
      </WorkspacePanel>
    </div>
  </div>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="mb-2 block text-sm">{label}</Label>{children}</div>;
}
