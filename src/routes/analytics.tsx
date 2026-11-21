import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, CheckCircle2, MinusCircle, Target } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/meditrack/EmptyState";
import { PageHeader } from "@/components/meditrack/PageHeader";
import { StatCard } from "@/components/meditrack/StatCard";
import { addDays, formatDateShort, toDateKey } from "@/lib/meditrack/dates";
import { completionPercent, dailySeries, dosesOn, summarize } from "@/lib/meditrack/schedule";
import { useAppData, useNow } from "@/lib/meditrack/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — MediTrack+" },
      { name: "description", content: "Doses taken, skipped and overdue, with your daily completion percentage — calculated from your own records." },
      { property: "og:title", content: "Analytics — MediTrack+" },
      { property: "og:description", content: "See how consistently you're following your medicine schedule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = [7, 14, 30] as const;

function AnalyticsPage() {
  const { doses } = useAppData();
  const now = useNow();
  const today = toDateKey(now);
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);

  const from = addDays(today, -(days - 1));
  const inRange = doses.filter((d) => d.date >= from && d.date <= today);
  const totals = summarize(inRange, now);
  const todayStats = summarize(dosesOn(doses, today), now);
  const series = dailySeries(doses, today, days, now);

  const perMedicine = new Map<string, { name: string; taken: number; skipped: number; overdue: number; total: number }>();
  for (const d of inRange) {
    const row = perMedicine.get(d.medicineId) ?? { name: d.medicineName, taken: 0, skipped: 0, overdue: 0, total: 0 };
    const s = summarize([d], now);
    row.taken += s.taken;
    row.skipped += s.skipped;
    row.overdue += s.overdue;
    row.total += 1;
    perMedicine.set(d.medicineId, row);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Calculated from the doses you've recorded. Completion = doses taken ÷ doses scheduled."
        actions={
          <div className="flex rounded-xl bg-secondary p-1" role="group" aria-label="Time period">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={days === r}
                onClick={() => setDays(r)}
                className={cn(
                  "h-11 rounded-lg px-4 text-base font-semibold transition-colors",
                  days === r ? "bg-background text-primary shadow-card" : "text-muted-foreground hover:text-primary",
                )}
              >
                {r} days
              </button>
            ))}
          </div>
        }
      />

      {doses.length === 0 ? (
        <EmptyState icon={BarChart3} title="No data yet" description="Add medicines and record doses to see your statistics here." />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Doses taken" value={totals.taken} icon={CheckCircle2} tone="success" hint={`Last ${days} days`} />
            <StatCard label="Doses skipped" value={totals.skipped} icon={MinusCircle} tone="muted" hint={`Last ${days} days`} />
            <StatCard label="Overdue / missed" value={totals.overdue} icon={AlertTriangle} tone="danger" hint="Not recorded in time" />
            <StatCard
              label="Today's completion"
              value={`${completionPercent(todayStats.taken, todayStats.total)}%`}
              icon={Target}
              tone="teal"
              hint={`${todayStats.taken} of ${todayStats.total} doses taken`}
            />
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-card">
            <h2 className="text-2xl font-bold">Daily completion</h2>
            <p className="mt-1 text-base text-muted-foreground">
              Overall for this period: <strong className="text-foreground">{completionPercent(totals.taken, totals.total)}%</strong> ({totals.taken} of {totals.total} scheduled doses taken)
            </p>
            <div className="mt-6 overflow-x-auto">
              <div className="flex h-64 min-w-fit items-end gap-2 border-b pb-0" role="list" aria-label="Completion per day">
                {series.map((p) => (
                  <div key={p.date} role="listitem" className="flex h-full w-10 shrink-0 flex-col items-center justify-end gap-1 sm:w-14" aria-label={`${formatDateShort(p.date)}: ${p.total ? `${p.completion}%` : "no doses"}`}>
                    <span className="text-xs font-bold text-foreground">{p.total ? `${p.completion}%` : "–"}</span>
                    <div className="flex w-full flex-1 items-end rounded-t-lg bg-surface">
                      <div
                        className={cn("w-full rounded-t-lg transition-all duration-500", p.date === today ? "bg-primary" : "bg-teal")}
                        style={{ height: `${p.total ? Math.max(p.completion, 2) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex min-w-fit gap-2 pt-2">
                {series.map((p) => (
                  <span key={p.date} className="w-10 shrink-0 text-center text-xs font-semibold text-muted-foreground sm:w-14">
                    {p.date === today ? "Today" : formatDateShort(p.date).split(",")[0]}
                    <span className="block">{p.date.slice(8)}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-card">
            <h2 className="text-2xl font-bold">By medicine</h2>
            {perMedicine.size === 0 ? (
              <p className="mt-3 text-lg text-muted-foreground">No doses in this period.</p>
            ) : (
              <ul className="mt-4 divide-y">
                {[...perMedicine.values()].map((m) => {
                  const pct = completionPercent(m.taken, m.total);
                  return (
                    <li key={m.name} className="py-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-lg font-semibold">{m.name}</span>
                        <span className="text-base text-muted-foreground">
                          {m.taken} taken · {m.skipped} skipped · {m.overdue} overdue · <strong className="text-foreground">{pct}%</strong>
                        </span>
                      </div>
                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
