import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock, Pencil, Pill, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/meditrack/EmptyState";
import { MedicineDialog } from "@/components/meditrack/MedicineDialog";
import { PageHeader } from "@/components/meditrack/PageHeader";
import { SafetyNotice } from "@/components/meditrack/SafetyNotice";
import { formatDateShort, formatTime, toDateKey } from "@/lib/meditrack/dates";
import { describeFrequency, medicineStatus } from "@/lib/meditrack/schedule";
import { deleteMedicine, loadSampleMedicines, useAppData, useNow } from "@/lib/meditrack/store";
import type { Medicine } from "@/lib/meditrack/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/medicines")({
  head: () => ({
    meta: [
      { title: "Medicines — MediTrack+" },
      { name: "description", content: "Add, edit and remove your medicines with dosage, times, dates and instructions from your prescription." },
      { property: "og:title", content: "Medicines — MediTrack+" },
      { property: "og:description", content: "Keep every medicine and its schedule organised in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MedicinesPage,
});

const STATUS_STYLE = {
  active: { label: "Active", className: "bg-success-soft text-success" },
  scheduled: { label: "Starts later", className: "bg-secondary text-primary" },
  ended: { label: "Ended", className: "bg-muted text-muted-foreground" },
} as const;

function MedicineCard({ med, today, onEdit, onDelete }: { med: Medicine; today: string; onEdit: () => void; onDelete: () => void }) {
  const status = STATUS_STYLE[medicineStatus(med, today)];
  return (
    <article className="flex flex-col rounded-2xl border bg-card p-6 shadow-card">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-teal-soft text-teal">
          <Pill className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold break-words">{med.name}</h2>
            <span className={cn("rounded-full px-3 py-0.5 text-sm font-semibold", status.className)}>{status.label}</span>
          </div>
          <p className="mt-1 text-lg text-foreground/80">{med.dosage}</p>
        </div>
      </div>

      <dl className="mt-5 space-y-3 text-base">
        <div className="flex items-start gap-3">
          <dt className="sr-only">Schedule</dt>
          <Clock className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <dd>
            <p className="font-semibold">{describeFrequency(med)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {med.times.map((t) => (
                <span key={t} className="rounded-lg bg-secondary px-3 py-1 font-semibold text-primary">
                  {formatTime(t)}
                </span>
              ))}
            </div>
          </dd>
        </div>
        <div className="flex items-start gap-3">
          <dt className="sr-only">Dates</dt>
          <CalendarDays className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <dd>
            From {formatDateShort(med.startDate)}
            {med.endDate ? ` to ${formatDateShort(med.endDate)}` : " · no end date"}
          </dd>
        </div>
        {med.instructions && (
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-sm font-semibold text-muted-foreground">Instructions</dt>
            <dd className="mt-0.5">{med.instructions}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-6">
        <Button variant="soft" onClick={onEdit}>
          <Pencil aria-hidden /> Edit
        </Button>
        <Button variant="destructiveOutline" onClick={onDelete}>
          <Trash2 aria-hidden /> Delete
        </Button>
      </div>
    </article>
  );
}

function MedicinesPage() {
  const { medicines } = useAppData();
  const now = useNow();
  const today = toDateKey(now);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | undefined>();
  const [deleting, setDeleting] = useState<Medicine | null>(null);

  const openAdd = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const sorted = [...medicines].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Medicines"
        description="Your medicines and when to take them. Every scheduled time becomes its own dose in the tracker."
        actions={
          medicines.length > 0 && (
            <Button size="lg" onClick={openAdd}>
              <Plus aria-hidden /> Add medicine
            </Button>
          )
        }
      />

      {medicines.length === 0 ? (
        <EmptyState icon={Pill} title="No medicines yet" description="Add your first medicine using the details on your prescription.">
          <Button size="lg" onClick={openAdd}>
            <Plus aria-hidden /> Add medicine
          </Button>
          <Button size="lg" variant="soft" onClick={loadSampleMedicines}>
            <Sparkles aria-hidden /> Try with sample medicines
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {sorted.map((m) => (
            <MedicineCard
              key={m.id}
              med={m}
              today={today}
              onEdit={() => {
                setEditing(m);
                setDialogOpen(true);
              }}
              onDelete={() => setDeleting(m)}
            />
          ))}
        </div>
      )}

      <SafetyNotice />

      <MedicineDialog open={dialogOpen} onOpenChange={setDialogOpen} medicine={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Its upcoming doses will be removed. Doses you already recorded stay in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className={buttonVariants({ variant: "outline", size: "lg" })}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive", size: "lg" })}
              onClick={() => {
                if (!deleting) return;
                deleteMedicine(deleting.id);
                toast.success(`${deleting.name} deleted`);
                setDeleting(null);
              }}
            >
              Delete medicine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
