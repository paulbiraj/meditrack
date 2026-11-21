import { createFileRoute } from "@tanstack/react-router";
import { History as HistoryIcon, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/meditrack/EmptyState";
import { PageHeader } from "@/components/meditrack/PageHeader";
import { StatusBadge } from "@/components/meditrack/StatusBadge";
import { addDays, formatActionDateTime, formatDateLong, formatTime, toDateKey } from "@/lib/meditrack/dates";
import { deriveState } from "@/lib/meditrack/schedule";
import { clearAllData, useAppData, useNow } from "@/lib/meditrack/store";
import type { DoseRecord, DoseState } from "@/lib/meditrack/types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Medication History — MediTrack+" },
      { name: "description", content: "Look back at every recorded dose with its date, medicine, scheduled time and status." },
      { property: "og:title", content: "Medication History — MediTrack+" },
      { property: "og:description", content: "A clear record of every dose taken, skipped or missed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

type RangeFilter = "7" | "30" | "all";
type StatusFilter = "all" | "taken" | "skipped" | "overdue";

const selectClass =
  "h-12 w-full rounded-xl border border-input bg-background px-4 text-base font-semibold text-foreground shadow-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40";

function HistoryPage() {
  const { doses } = useAppData();
  const now = useNow();
  const today = toDateKey(now);
  const [range, setRange] = useState<RangeFilter>("7");
  const [medicine, setMedicine] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const medicineNames = useMemo(() => [...new Set(doses.map((d) => d.medicineName))].sort(), [doses]);

  const groups = useMemo(() => {
    const from = range === "all" ? "" : addDays(today, -(Number(range) - 1));
    const rows: { dose: DoseRecord; state: DoseState }[] = [];
    for (const dose of doses) {
      const state = deriveState(dose, now);
      if (state === "upcoming") continue;
      if (dose.date < from) continue;
      if (medicine !== "all" && dose.medicineName !== medicine) continue;
      if (status !== "all" && state !== status) continue;
      rows.push({ dose, state });
    }
    const byDate = new Map<string, typeof rows>();
    for (const r of rows) byDate.set(r.dose.date, [...(byDate.get(r.dose.date) ?? []), r]);
    return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [doses, now, today, range, medicine, status]);

  return (
    <div className="space-y-8">
      <PageHeader title="Medication History" description="Every dose that was due, with what you recorded and when." />

      <div className="grid gap-4 rounded-2xl border bg-surface p-4 sm:grid-cols-3">
        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-muted-foreground">Period</span>
          <select className={selectClass} value={range} onChange={(e) => setRange(e.target.value as RangeFilter)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-muted-foreground">Medicine</span>
          <select className={selectClass} value={medicine} onChange={(e) => setMedicine(e.target.value)}>
            <option value="all">All medicines</option>
            {medicineNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-semibold text-muted-foreground">Status</span>
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">All statuses</option>
            <option value="taken">Taken</option>
            <option value="skipped">Skipped</option>
            <option value="overdue">Overdue / missed</option>
          </select>
        </label>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={HistoryIcon} title="No records yet" description="Doses appear here once their scheduled time has arrived." />
      ) : (
        <div className="space-y-8">
          {groups.map(([date, rows]) => (
            <section key={date}>
              <h2 className="mb-3 text-xl font-bold">
                {date === today ? "Today" : date === addDays(today, -1) ? "Yesterday" : formatDateLong(date)}
                {date === today || date === addDays(today, -1) ? (
                  <span className="ml-2 text-base font-semibold text-muted-foreground">{formatDateLong(date)}</span>
                ) : null}
              </h2>
              <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
                <div className="hidden grid-cols-[110px_1fr_160px_200px] gap-4 border-b bg-surface px-5 py-3 text-sm font-semibold text-muted-foreground md:grid">
                  <span>Scheduled</span>
                  <span>Medicine</span>
                  <span>Status</span>
                  <span>Recorded at</span>
                </div>
                <ul className="divide-y">
                  {rows.map(({ dose, state }) => (
                    <li key={dose.id} className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[110px_1fr_160px_200px]">
                      <span className="font-display text-lg font-bold text-primary">{formatTime(dose.time)}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold break-words">{dose.medicineName}</span>
                        <span className="block text-muted-foreground">{dose.dosage}</span>
                      </span>
                      <span className="col-start-2 md:col-start-auto">
                        <StatusBadge state={state} missed={date < today} />
                      </span>
                      <span className="col-start-2 text-sm text-muted-foreground md:col-start-auto md:text-base">
                        {dose.actionAt ? formatActionDateTime(dose.actionAt) : "Not recorded"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-dashed p-5">
        <h2 className="text-lg font-bold">Your data stays on this device</h2>
        <p className="mt-1 text-base text-muted-foreground">
          MediTrack+ saves everything in this browser only. Nothing is sent anywhere.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructiveOutline" className="mt-4">
              <Trash2 aria-hidden /> Clear all data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-2xl">Clear all data?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                This permanently removes all medicines and dose history from this device.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel className={buttonVariants({ variant: "outline", size: "lg" })}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive", size: "lg" })}
                onClick={() => {
                  clearAllData();
                  toast.success("All data cleared");
                }}
              >
                Yes, clear everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
