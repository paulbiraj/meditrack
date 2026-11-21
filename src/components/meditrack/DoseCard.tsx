import { Check, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  formatActionDateTime,
  formatActionTime,
  formatDateShort,
  formatTime,
  toDateKey,
} from "@/lib/meditrack/dates";
import { deriveState } from "@/lib/meditrack/schedule";
import { recordDose, undoDose } from "@/lib/meditrack/store";
import type { DoseAction, DoseRecord } from "@/lib/meditrack/types";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

export function handleDoseAction(dose: DoseRecord, action: DoseAction) {
  const result = recordDose(dose.id, action);
  if (!result.ok) {
    toast.error(
      result.reason === "already_recorded"
        ? "This dose has already been recorded."
        : "This dose can't be recorded yet.",
    );
    return;
  }
  toast.success(`${dose.medicineName} — ${formatTime(dose.time)} marked as ${action}`, {
    action: { label: "Undo", onClick: () => undoDose(dose.id) },
    duration: 6000,
  });
}

export function DoseCard({
  dose,
  now,
  instructions,
  showDate = false,
  highlight = false,
}: {
  dose: DoseRecord;
  now: Date;
  instructions?: string | undefined;
  showDate?: boolean;
  highlight?: boolean;
}) {
  const state = deriveState(dose, now);
  const isPast = dose.date < toDateKey(now);
  const canAct = dose.status === "pending" && dose.date <= toDateKey(now);

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-card sm:flex-row sm:items-center",
        state === "due" && "border-warning/60",
        state === "overdue" && "border-destructive/30",
        highlight && "ring-[3px] ring-teal/30",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="w-24 shrink-0 rounded-xl bg-surface px-2 py-2.5 text-center">
          <p className="font-display text-xl font-bold leading-tight text-primary">
            {formatTime(dose.time)}
          </p>
          {showDate && (
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              {formatDateShort(dose.date)}
            </p>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold break-words text-foreground">{dose.medicineName}</h3>
            <StatusBadge state={state} missed={isPast} />
          </div>
          <p className="mt-1 text-lg text-foreground/80">{dose.dosage}</p>
          {instructions && <p className="mt-1 text-base text-muted-foreground">{instructions}</p>}
          {dose.actionAt && (
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Recorded{" "}
              {isPast
                ? formatActionDateTime(dose.actionAt)
                : `at ${formatActionTime(dose.actionAt)}`}
            </p>
          )}
        </div>
      </div>

      {canAct ? (
        <div className="grid grid-cols-2 gap-3 sm:flex sm:shrink-0">
          <Button
            variant="success"
            size="lg"
            onClick={() => handleDoseAction(dose, "taken")}
            aria-label={`Mark ${dose.medicineName} at ${formatTime(dose.time)} as taken`}
          >
            <Check aria-hidden /> Taken
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleDoseAction(dose, "skipped")}
            aria-label={`Mark ${dose.medicineName} at ${formatTime(dose.time)} as skipped`}
          >
            <X aria-hidden /> Skipped
          </Button>
        </div>
      ) : dose.status !== "pending" && !isPast ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-muted-foreground sm:self-center"
          onClick={() => undoDose(dose.id)}
        >
          <Undo2 aria-hidden /> Undo
        </Button>
      ) : null}
    </article>
  );
}
