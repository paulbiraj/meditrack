import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toDateKey, WEEKDAYS } from "@/lib/meditrack/dates";
import { validateMedicineInput, type MedicineValidation } from "@/lib/meditrack/schedule";
import { addMedicine, updateMedicine } from "@/lib/meditrack/store";
import type { Frequency, Medicine, MedicineInput } from "@/lib/meditrack/types";
import { cn } from "@/lib/utils";

const FREQUENCIES: { value: Frequency; label: string; hint: string }[] = [
  { value: "daily", label: "Every day", hint: "Same times daily" },
  { value: "every_other_day", label: "Every other day", hint: "Starting from the start date" },
  { value: "specific_days", label: "Specific days", hint: "Choose weekdays" },
];

const SUGGESTED_TIMES = ["08:00", "14:00", "20:00", "12:00", "18:00", "22:00"];

function emptyInput(): MedicineInput {
  return {
    name: "",
    dosage: "",
    frequency: "daily",
    daysOfWeek: [],
    times: ["08:00"],
    startDate: toDateKey(new Date()),
    endDate: null,
    instructions: "",
  };
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base font-semibold text-foreground">
        {label}
      </Label>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {children}
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function MedicineForm({ initial, onDone }: { initial?: Medicine; onDone: () => void }) {
  const [form, setForm] = useState<MedicineInput>(() =>
    initial
      ? {
          name: initial.name,
          dosage: initial.dosage,
          frequency: initial.frequency,
          daysOfWeek: initial.daysOfWeek,
          times: initial.times,
          startDate: initial.startDate,
          endDate: initial.endDate,
          instructions: initial.instructions,
        }
      : emptyInput(),
  );
  const [errors, setErrors] = useState<MedicineValidation["errors"]>({});

  const set = <K extends keyof MedicineInput>(key: K, value: MedicineInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addTime = () => {
    const next = SUGGESTED_TIMES.find((t) => !form.times.includes(t)) ?? "09:00";
    set("times", [...form.times, next]);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = validateMedicineInput(form);
    setErrors(v.errors);
    if (!v.ok) return;
    if (initial) {
      updateMedicine(initial.id, form);
      toast.success(`${form.name.trim()} updated`);
    } else {
      addMedicine(form);
      toast.success(`${form.name.trim()} added — today's doses are ready in the tracker`);
    }
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Field id="med-name" label="Medicine name" error={errors.name}>
        <Input
          id="med-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="As written on the label"
          autoComplete="off"
          maxLength={80}
        />
      </Field>

      <Field
        id="med-dosage"
        label="Dosage"
        hint="Enter it exactly as your prescription says, e.g. “1 tablet (500 mg)”."
        error={errors.dosage}
      >
        <Input
          id="med-dosage"
          value={form.dosage}
          onChange={(e) => set("dosage", e.target.value)}
          placeholder="e.g. 1 tablet"
          autoComplete="off"
          maxLength={60}
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-base font-semibold text-foreground">How often</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={form.frequency === f.value}
              onClick={() => set("frequency", f.value)}
              className={cn(
                "rounded-xl border-2 px-4 py-3 text-left transition-colors",
                form.frequency === f.value
                  ? "border-teal bg-teal-soft text-accent-foreground"
                  : "border-border bg-background hover:border-teal/50",
              )}
            >
              <span className="block font-semibold">{f.label}</span>
              <span className="block text-sm text-muted-foreground">{f.hint}</span>
            </button>
          ))}
        </div>
        {form.frequency === "specific_days" && (
          <div className="pt-2">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Days of the week">
              {WEEKDAYS.map((day, i) => {
                const on = form.daysOfWeek.includes(i);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set("daysOfWeek", on ? form.daysOfWeek.filter((d) => d !== i) : [...form.daysOfWeek, i])
                    }
                    className={cn(
                      "h-12 min-w-14 rounded-xl border-2 px-3 font-semibold transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {errors.daysOfWeek && <p role="alert" className="mt-2 text-sm font-semibold text-destructive">{errors.daysOfWeek}</p>}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-base font-semibold text-foreground">Times to take it</legend>
        <p className="text-sm text-muted-foreground">Each time becomes its own dose you can tick off.</p>
        <div className="space-y-2">
          {form.times.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="time"
                aria-label={`Time ${i + 1}`}
                value={t}
                onChange={(e) => set("times", form.times.map((x, j) => (j === i ? e.target.value : x)))}
                className="max-w-48"
              />
              {form.times.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove time ${i + 1}`}
                  onClick={() => set("times", form.times.filter((_, j) => j !== i))}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="soft" onClick={addTime} disabled={form.times.length >= 8}>
          <Plus aria-hidden /> Add another time
        </Button>
        {errors.times && <p role="alert" className="text-sm font-semibold text-destructive">{errors.times}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="med-start" label="Start date" error={errors.startDate}>
          <Input id="med-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field id="med-end" label="End date (optional)" error={errors.endDate}>
          <Input
            id="med-end"
            type="date"
            value={form.endDate ?? ""}
            min={form.startDate}
            onChange={(e) => set("endDate", e.target.value || null)}
          />
        </Field>
      </div>

      <Field id="med-instructions" label="Instructions (optional)" hint="Copy them from your prescription or label." error={errors.instructions}>
        <Textarea
          id="med-instructions"
          value={form.instructions}
          onChange={(e) => set("instructions", e.target.value)}
          placeholder="e.g. Take after breakfast with water"
          maxLength={300}
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="lg">
          {initial ? "Save changes" : "Add medicine"}
        </Button>
      </div>
    </form>
  );
}

export function MedicineDialog({
  open,
  onOpenChange,
  medicine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine?: Medicine;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{medicine ? "Edit medicine" : "Add a medicine"}</DialogTitle>
          <DialogDescription className="text-base">
            Enter the details exactly as they appear on your prescription.
          </DialogDescription>
        </DialogHeader>
        {open && <MedicineForm key={medicine?.id ?? "new"} initial={medicine} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
