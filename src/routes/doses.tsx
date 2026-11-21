import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BellRing, CheckCircle2, ClipboardCheck, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { DoseCard } from "@/components/meditrack/DoseCard";
import { EmptyState } from "@/components/meditrack/EmptyState";
import { PageHeader } from "@/components/meditrack/PageHeader";
import { SafetyNotice } from "@/components/meditrack/SafetyNotice";
import { formatDateLong, toDateKey } from "@/lib/meditrack/dates";
import { deriveState, dosesOn, summarize } from "@/lib/meditrack/schedule";
import { useAppData, useNow } from "@/lib/meditrack/store";
import type { DoseRecord } from "@/lib/meditrack/types";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/doses")({
  head: () => ({
    meta: [
      { title: "Dose Tracker — MediTrack+" },
      { name: "description", content: "Mark each of today's doses as taken or skipped and see what's due, upcoming or overdue." },
      { property: "og:title", content: "Dose Tracker — MediTrack+" },
      { property: "og:description", content: "Tick off every scheduled dose, one at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoseTracker,
});

function Section({ title, icon, count, children }: { title: string; icon: ReactNode; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        {icon} {title} <span className="text-lg font-semibold text-muted-foreground">({count})</span>
      </h2>
      {children}
    </section>
  );
}

function DoseTracker() {
  const { medicines, doses } = useAppData();
  const now = useNow();
  const today = toDateKey(now);
  const todays = dosesOn(doses, today);
  const instructions = new Map(medicines.map((m) => [m.id, m.instructions]));
  const groups: Record<"overdue" | "due" | "upcoming" | "done", DoseRecord[]> = { overdue: [], due: [], upcoming: [], done: [] };
  for (const d of todays) {
    const s = deriveState(d, now);
    if (s === "taken" || s === "skipped") groups.done.push(d);
    else groups[s].push(d);
  }
  const s = summarize(todays, now);
  const render = (list: DoseRecord[]) => (
    <div className="space-y-3">
      {list.map((d) => (
        <DoseCard key={d.id} dose={d} now={now} instructions={instructions.get(d.medicineId)} />
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dose Tracker"
        description={`${formatDateLong(today)} · ${s.taken} taken, ${s.skipped} skipped, ${s.pending + s.overdue} still to record`}
      />

      {todays.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No doses scheduled today"
          description={medicines.length === 0 ? "Add a medicine to start tracking your doses." : "Enjoy your day — nothing is scheduled for today."}
        >
          {medicines.length === 0 && (
            <Button size="lg" asChild>
              <Link to="/medicines">Go to medicines</Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
          <Section title="Overdue" icon={<AlertTriangle className="size-6 text-destructive" aria-hidden />} count={groups.overdue.length}>
            <p className="text-base text-muted-foreground">
              These were due more than an hour ago. Record what happened — never take a double dose to catch up.
            </p>
            {render(groups.overdue)}
          </Section>
          <Section title="Due now" icon={<BellRing className="size-6 text-warning" aria-hidden />} count={groups.due.length}>
            {render(groups.due)}
          </Section>
          <Section title="Upcoming" icon={<Clock className="size-6 text-teal" aria-hidden />} count={groups.upcoming.length}>
            {render(groups.upcoming)}
          </Section>
          <Section title="Recorded today" icon={<CheckCircle2 className="size-6 text-success" aria-hidden />} count={groups.done.length}>
            {render(groups.done)}
          </Section>
        </>
      )}
      <SafetyNotice />
    </div>
  );
}
