import type { ComponentProps, ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground", className)}>{children}</p>;
}

export function PageHeader({ eyebrow, title, description, actions, className }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 border-b border-white/10 px-4 py-5 sm:px-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function WorkspacePanel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-[10px] border border-white/10 bg-[#101012]", className)} {...props} />;
}

export function StatusChip({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "success" | "warning" | "danger"; className?: string }) {
  const toneClass = {
    default: "border-white/12 bg-white/[0.04] text-muted-foreground",
    success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    warning: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    danger: "border-rose-400/25 bg-rose-400/10 text-rose-200",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em]", toneClass, className)}>{children}</span>;
}

export function MetricTile({ label, value, detail, icon: Icon, className }: { label: string; value: ReactNode; detail?: ReactNode; icon?: LucideIcon; className?: string }) {
  return <WorkspacePanel className={cn("relative overflow-hidden p-4", className)}>
    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent" />
    <div className="flex items-start justify-between gap-3">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      {Icon ? <Icon className="size-4 text-primary" /> : null}
    </div>
    <p className="mt-5 text-3xl font-semibold tracking-[-0.045em]">{value}</p>
    {detail ? <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
  </WorkspacePanel>;
}

export function EmptyState({ title, description, action, icon: Icon = Inbox, className }: { title: string; description: string; action?: ReactNode; icon?: LucideIcon; className?: string }) {
  return <div className={cn("flex min-h-72 flex-col items-center justify-center rounded-[10px] border border-dashed border-white/15 bg-white/[0.018] px-6 py-10 text-center", className)}>
    <div className="grid size-11 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-primary"><Icon className="size-5" /></div>
    <h2 className="mt-4 text-base font-semibold">{title}</h2>
    <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>;
}
