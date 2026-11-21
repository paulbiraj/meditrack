import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock3, Pill, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/meditrack/PageHeader";
import { StatCard } from "@/components/meditrack/StatCard";
import { StatusBadge } from "@/components/meditrack/StatusBadge";
import { SafetyNotice } from "@/components/meditrack/SafetyNotice";
import { Button } from "@/components/ui/button";
import { formatDateShort, formatTime, toDateKey } from "@/lib/meditrack/dates";
import {
  completionPercent,
  deriveState,
  dosesOn,
  medicineStatus,
  summarize,
} from "@/lib/meditrack/schedule";
import { useAppData, useNow } from "@/lib/meditrack/store";

export const Route = createFileRoute("/caregiver")({
  head: () => ({ meta: [{ title: "Caregiver View — MediTrack+" }] }),
  component: CaregiverPage,
});

function CaregiverPage() {
  const { medicines, doses } = useAppData();
  const now = useNow();
  const today = toDateKey(now);
  const todays = dosesOn(doses, today);
  const summary = summarize(todays, now);
  const adherence = completionPercent(summary.taken, summary.total);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Caregiver View"
        description="A read-friendly view of medicines and today's dose activity."
        actions={
          <span className="rounded-full bg-warning-soft px-4 py-2 text-sm font-bold text-warning-foreground">
            Local demonstration mode
          </span>
        }
      />

      <div className="rounded-2xl border border-primary/20 bg-secondary p-5 text-base leading-relaxed">
        <strong>Local demonstration only.</strong> This view uses records stored in this browser. It
        does not provide remote caregiver access or cloud synchronization.
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Adherence overview">
        <StatCard label="Taken today" value={summary.taken} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending" value={summary.pending} icon={Clock3} tone="warning" />
        <StatCard label="Overdue" value={summary.overdue} icon={AlertTriangle} tone="danger" />
        <StatCard label="Adherence today" value={`${adherence}%`} icon={UsersRound} tone="teal" />
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="text-2xl font-bold">Today's doses</h2>
        {todays.length === 0 ? (
          <p className="mt-4 rounded-xl bg-surface p-5 text-base text-muted-foreground">
            No doses are scheduled for today.
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {todays.map((dose) => (
              <li
                key={dose.id}
                className="grid gap-2 py-4 sm:grid-cols-[100px_1fr_auto] sm:items-center"
              >
                <span className="font-display text-lg font-bold text-primary">
                  {formatTime(dose.time)}
                </span>
                <span>
                  <strong className="block text-lg">{dose.medicineName}</strong>
                  <span className="text-base text-muted-foreground">{dose.dosage}</span>
                </span>
                <StatusBadge state={deriveState(dose, now)} missed={dose.date < today} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <h2 className="text-2xl font-bold">Medicine list</h2>
        {medicines.length === 0 ? (
          <div className="mt-4">
            <p className="text-base text-muted-foreground">No medicines have been added.</p>
            <Button className="mt-4" asChild>
              <Link to="/medicines">
                <Pill aria-hidden /> Manage medicines
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {[...medicines]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((medicine) => (
                <li key={medicine.id} className="rounded-xl border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{medicine.name}</h3>
                      <p className="text-base text-muted-foreground">{medicine.dosage}</p>
                    </div>
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      {medicineStatus(medicine, today)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">Times: {medicine.times.map(formatTime).join(", ")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    From {formatDateShort(medicine.startDate)}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </section>

      <SafetyNotice />
    </div>
  );
}
