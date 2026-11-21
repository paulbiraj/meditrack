import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, ListChecks, Pill, Plus, Sparkles, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DoseCard } from "@/components/meditrack/DoseCard";
import { EmptyState } from "@/components/meditrack/EmptyState";
import { MedicineDialog } from "@/components/meditrack/MedicineDialog";
import { ProgressRing } from "@/components/meditrack/ProgressRing";
import { SafetyNotice } from "@/components/meditrack/SafetyNotice";
import { StatCard } from "@/components/meditrack/StatCard";
import { formatDateLong, formatTime, toDateKey } from "@/lib/meditrack/dates";
import { completionPercent, deriveState, dosesOn, getNextDose, isMedicineActive, summarize } from "@/lib/meditrack/schedule";
import { loadSampleMedicines, useAppData, useNow } from "@/lib/meditrack/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MediTrack+" },
      { name: "description", content: "See today's medicines at a glance: doses taken, pending, overdue and what's next." },
      { property: "og:title", content: "MediTrack+ Dashboard" },
      { property: "og:description", content: "Never miss a medicine. Today's doses at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { medicines, doses } = useAppData();
  const now = useNow();
  const [adding, setAdding] = useState(false);
  const today = toDateKey(now);
  const todays = dosesOn(doses, today);
  const s = summarize(todays, now);
  const completion = completionPercent(s.taken, s.total);
  const activeCount = medicines.filter((m) => isMedicineActive(m, today)).length;
  const next = getNextDose(doses, now);
  const instructions = new Map(medicines.map((m) => [m.id, m.instructions]));

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground shadow-lift sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-lg font-semibold opacity-85">{formatDateLong(today)}</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{greeting(now.getHours())}</h1>
          <p className="mt-3 max-w-lg text-lg opacity-90">
            {s.total === 0
              ? "No doses scheduled for today."
              : `You've taken ${s.taken} of ${s.total} doses today.`}
            {next && ` Next: ${next.medicineName} at ${formatTime(next.time)}.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="hero" size="lg" asChild>
              <Link to="/doses">
                <ListChecks aria-hidden /> Open dose tracker
              </Link>
            </Button>
            <Button variant="heroOutline" size="lg" onClick={() => setAdding(true)}>
              <Plus aria-hidden /> Add medicine
            </Button>
          </div>
        </div>
        <ProgressRing value={completion} label="Today's completion" />
      </section>

      {medicines.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="Add your first medicine"
          description="Enter a medicine from your prescription and MediTrack+ will create a dose for every time you need to take it."
        >
          <Button size="lg" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add medicine
          </Button>
          <Button size="lg" variant="soft" onClick={loadSampleMedicines}>
            <Sparkles aria-hidden /> Try with sample medicines
          </Button>
        </EmptyState>
      ) : (
        <>
          <section aria-label="Today's summary" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Active medicines" value={activeCount} icon={Pill} tone="navy" />
            <StatCard label="Today's doses" value={s.total} icon={CalendarClock} tone="teal" />
            <StatCard label="Taken" value={s.taken} icon={CheckCircle2} tone="success" />
            <StatCard label="Pending" value={s.pending} icon={Clock} tone="warning" />
            <StatCard label="Overdue" value={s.overdue} icon={AlertTriangle} tone="danger" />
          </section>

          {s.overdue > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-danger-soft p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-3 text-lg text-destructive">
                <AlertTriangle className="mt-1 size-6 shrink-0" aria-hidden />
                <span>
                  <strong>{s.overdue} overdue {s.overdue === 1 ? "dose" : "doses"}.</strong> Record whether you took or
                  skipped {s.overdue === 1 ? "it" : "them"}. Don't take extra to catch up.
                </span>
              </p>
              <Button variant="destructive" size="lg" asChild>
                <Link to="/doses">Review now</Link>
              </Button>
            </div>
          )}

          <section>
            <h2 className="mb-4 text-2xl font-bold">Next scheduled dose</h2>
            {next ? (
              <DoseCard dose={next} now={now} instructions={instructions.get(next.medicineId)} highlight />
            ) : (
              <div className="flex items-center gap-4 rounded-2xl border bg-success-soft p-5 text-lg text-success">
                <PartyPopper className="size-7 shrink-0" aria-hidden />
                {s.total === 0 ? "Nothing scheduled for the rest of today." : "No more doses scheduled for today."}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="text-2xl font-bold">Today's timeline</h2>
              <Link to="/doses" className="text-base font-semibold text-teal underline-offset-4 hover:underline">
                Manage doses
              </Link>
            </div>
            {todays.length === 0 ? (
              <p className="rounded-2xl bg-surface p-6 text-lg text-muted-foreground">No doses scheduled today.</p>
            ) : (
              <ol className="relative space-y-3 border-l-2 border-border pl-6 sm:pl-8">
                {todays.map((d) => {
                  const state = deriveState(d, now);
                  return (
                    <li key={d.id} className="relative">
                      <span
                        aria-hidden
                        className={
                          "absolute -left-[33px] top-8 size-4 rounded-full border-4 border-background sm:-left-[41px] " +
                          (state === "taken"
                            ? "bg-success"
                            : state === "skipped"
                              ? "bg-muted-foreground"
                              : state === "overdue"
                                ? "bg-destructive"
                                : state === "due"
                                  ? "bg-warning"
                                  : "bg-teal")
                        }
                      />
                      <DoseCard dose={d} now={now} instructions={instructions.get(d.medicineId)} />
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}

      <SafetyNotice />
      <MedicineDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}
