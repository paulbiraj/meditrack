import { AlertTriangle, Check, Clock, MinusCircle, BellRing } from "lucide-react";
import type { DoseState } from "@/lib/meditrack/types";
import { cn } from "@/lib/utils";

const CONFIG: Record<DoseState, { label: string; className: string; icon: typeof Check }> = {
  taken: { label: "Taken", className: "bg-success-soft text-success", icon: Check },
  skipped: { label: "Skipped", className: "bg-muted text-muted-foreground", icon: MinusCircle },
  upcoming: { label: "Upcoming", className: "bg-secondary text-primary", icon: Clock },
  due: { label: "Due now", className: "bg-warning-soft text-warning-foreground", icon: BellRing },
  overdue: { label: "Overdue", className: "bg-danger-soft text-destructive", icon: AlertTriangle },
};

export function StatusBadge({ state, missed = false, className }: { state: DoseState; missed?: boolean; className?: string }) {
  const c = CONFIG[state];
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap",
        c.className,
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
      {state === "overdue" && missed ? "Missed" : c.label}
    </span>
  );
}
