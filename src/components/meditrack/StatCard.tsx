import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  navy: "bg-secondary text-primary",
  teal: "bg-teal-soft text-teal",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "navy",
  hint,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-semibold text-muted-foreground">{label}</p>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", TONES[tone])}>
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-display text-4xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
