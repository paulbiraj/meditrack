import { addDays, daysBetween, doseDateTime, isValidDateKey, isValidTime, parseDateKey, toDateKey, WEEKDAYS } from "./dates";
import type { DoseAction, DoseRecord, DoseState, Medicine, MedicineInput } from "./types";

/** A pending dose stays "Due now" for this long after its scheduled time, then becomes "Overdue". */
export const DUE_GRACE_MINUTES = 60;
/** Safety cap on how many past days are ever generated in one go (e.g. app not opened for weeks). */
export const MAX_BACKFILL_DAYS = 90;

export function doseId(medicineId: string, date: string, time: string): string {
  return `${medicineId}__${date}__${time}`;
}

export function normalizeTimes(times: string[]): string[] {
  return [...new Set(times.filter(isValidTime))].sort();
}

export function isScheduledOn(med: Medicine, date: string): boolean {
  if (date < med.startDate) return false;
  if (med.endDate && date > med.endDate) return false;
  switch (med.frequency) {
    case "daily":
      return true;
    case "every_other_day":
      return daysBetween(med.startDate, date) % 2 === 0;
    case "specific_days":
      return med.daysOfWeek.includes(parseDateKey(date).getDay());
  }
}

export function isMedicineActive(med: Medicine, today: string): boolean {
  return med.startDate <= today && (!med.endDate || med.endDate >= today);
}

export function medicineStatus(med: Medicine, today: string): "active" | "scheduled" | "ended" {
  if (med.startDate > today) return "scheduled";
  if (med.endDate && med.endDate < today) return "ended";
  return "active";
}

export function describeFrequency(med: Pick<Medicine, "frequency" | "daysOfWeek" | "times">): string {
  const n = med.times.length;
  const perDay = n === 1 ? "once" : n === 2 ? "twice" : `${n} times`;
  switch (med.frequency) {
    case "daily":
      return `Every day, ${perDay} a day`;
    case "every_other_day":
      return `Every other day, ${perDay} a day`;
    case "specific_days":
      return `${[...med.daysOfWeek].sort().map((d) => WEEKDAYS[d]).join(", ")} · ${perDay} a day`;
  }
}

function sortDoses(doses: DoseRecord[]): DoseRecord[] {
  return doses.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.time.localeCompare(b.time) ||
      a.medicineName.localeCompare(b.medicineName),
  );
}

/**
 * Brings stored dose records in line with the medicine schedules, up to and including `today`.
 * - Exactly one record per medicine + date + time (deterministic ids, so refreshing never duplicates).
 * - Taken/skipped records are always kept as history, even if the medicine is later edited or deleted.
 * - Pending records for today that are no longer scheduled are removed; past missed ones stay as history.
 */
export function syncDoses(medicines: Medicine[], doses: DoseRecord[], today: string): DoseRecord[] {
  const medById = new Map(medicines.map((m) => [m.id, m]));
  const expected = new Map<string, DoseRecord>();
  const earliest = addDays(today, -MAX_BACKFILL_DAYS);

  for (const med of medicines) {
    let from = med.startDate > med.scheduleFrom ? med.startDate : med.scheduleFrom;
    if (from < earliest) from = earliest;
    const to = med.endDate && med.endDate < today ? med.endDate : today;
    const times = normalizeTimes(med.times);
    for (let date = from; date <= to; date = addDays(date, 1)) {
      if (!isScheduledOn(med, date)) continue;
      for (const time of times) {
        const id = doseId(med.id, date, time);
        expected.set(id, {
          id,
          medicineId: med.id,
          medicineName: med.name,
          dosage: med.dosage,
          date,
          time,
          status: "pending",
          actionAt: null,
        });
      }
    }
  }

  const result: DoseRecord[] = [];
  const seen = new Set<string>();
  for (const d of doses) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    if (d.status !== "pending") {
      result.push(d);
      continue;
    }
    const med = medById.get(d.medicineId);
    if (!med) continue;
    if (expected.has(d.id)) {
      result.push({ ...d, medicineName: med.name, dosage: med.dosage });
    } else if (d.date < today) {
      result.push(d);
    }
  }
  for (const [id, rec] of expected) {
    if (!seen.has(id)) result.push(rec);
  }
  return sortDoses(result);
}

export function deriveState(dose: DoseRecord, now: Date): DoseState {
  if (dose.status !== "pending") return dose.status;
  const scheduled = doseDateTime(dose.date, dose.time).getTime();
  const t = now.getTime();
  if (t < scheduled) return "upcoming";
  if (t - scheduled <= DUE_GRACE_MINUTES * 60_000) return "due";
  return "overdue";
}

export type ActionResult =
  | { ok: true; doses: DoseRecord[] }
  | { ok: false; reason: "not_found" | "already_recorded" | "future_day" };

/** Records taken/skipped once. A dose that already has a status can't be recorded again. */
export function applyDoseAction(
  doses: DoseRecord[],
  id: string,
  action: DoseAction,
  now: Date,
): ActionResult {
  const idx = doses.findIndex((d) => d.id === id);
  const rec = doses[idx];
  if (idx < 0 || !rec) return { ok: false, reason: "not_found" };
  if (rec.status !== "pending") return { ok: false, reason: "already_recorded" };
  if (rec.date > toDateKey(now)) return { ok: false, reason: "future_day" };
  const next = doses.slice();
  next[idx] = { ...rec, status: action, actionAt: now.toISOString() };
  return { ok: true, doses: next };
}

export function undoDoseAction(doses: DoseRecord[], id: string): DoseRecord[] {
  return doses.map((d) => (d.id === id ? { ...d, status: "pending", actionAt: null } : d));
}

export interface DoseSummary {
  total: number;
  taken: number;
  skipped: number;
  /** Not yet recorded and not overdue (upcoming or due now). */
  pending: number;
  overdue: number;
}

export function summarize(doses: DoseRecord[], now: Date): DoseSummary {
  const s: DoseSummary = { total: 0, taken: 0, skipped: 0, pending: 0, overdue: 0 };
  for (const d of doses) {
    s.total++;
    const state = deriveState(d, now);
    if (state === "taken") s.taken++;
    else if (state === "skipped") s.skipped++;
    else if (state === "overdue") s.overdue++;
    else s.pending++;
  }
  return s;
}

/** Share of a day's scheduled doses that were taken, rounded to a whole percent. */
export function completionPercent(taken: number, total: number): number {
  return total === 0 ? 0 : Math.round((taken / total) * 100);
}

export function dosesOn(doses: DoseRecord[], date: string): DoseRecord[] {
  return doses.filter((d) => d.date === date);
}

export function getNextDose(doses: DoseRecord[], now: Date): DoseRecord | null {
  const today = toDateKey(now);
  const candidates = doses.filter((d) => {
    if (d.date !== today) return false;
    const s = deriveState(d, now);
    return s === "upcoming" || s === "due";
  });
  return sortDoses(candidates)[0] ?? null;
}

export interface DaySeriesPoint extends DoseSummary {
  date: string;
  completion: number;
}

export function dailySeries(doses: DoseRecord[], endDate: string, days: number, now: Date): DaySeriesPoint[] {
  const out: DaySeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i);
    const s = summarize(dosesOn(doses, date), now);
    out.push({ date, ...s, completion: completionPercent(s.taken, s.total) });
  }
  return out;
}

export interface MedicineValidation {
  ok: boolean;
  errors: Partial<Record<"name" | "dosage" | "times" | "startDate" | "endDate" | "daysOfWeek" | "instructions", string>>;
}

export function validateMedicineInput(input: MedicineInput): MedicineValidation {
  const errors: MedicineValidation["errors"] = {};
  if (!input.name.trim()) errors.name = "Please enter the medicine name.";
  else if (input.name.trim().length > 80) errors.name = "Keep the name under 80 characters.";
  if (!input.dosage.trim()) errors.dosage = "Enter the dosage exactly as on your prescription.";
  else if (input.dosage.trim().length > 60) errors.dosage = "Keep the dosage under 60 characters.";
  const validTimes = input.times.filter(isValidTime);
  if (validTimes.length === 0) errors.times = "Add at least one time.";
  else if (validTimes.length !== input.times.length) errors.times = "Please fill in every time or remove it.";
  else if (new Set(validTimes).size !== validTimes.length) errors.times = "Each time should only be added once.";
  if (!isValidDateKey(input.startDate)) errors.startDate = "Choose a start date.";
  if (input.endDate) {
    if (!isValidDateKey(input.endDate)) errors.endDate = "Choose a valid end date.";
    else if (input.endDate < input.startDate) errors.endDate = "End date can't be before the start date.";
  }
  if (input.frequency === "specific_days" && input.daysOfWeek.length === 0)
    errors.daysOfWeek = "Pick at least one day.";
  if (input.instructions.length > 300) errors.instructions = "Keep instructions under 300 characters.";
  return { ok: Object.keys(errors).length === 0, errors };
}
