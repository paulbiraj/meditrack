import { useSyncExternalStore } from "react";
import { toDateKey } from "./dates";
import { applyDoseAction, normalizeTimes, syncDoses, undoDoseAction, type ActionResult } from "./schedule";
import type { AppData, DoseAction, Medicine, MedicineInput } from "./types";

const STORAGE_KEY = "meditrack-plus:v1";
const EMPTY: AppData = { medicines: [], doses: [] };

let data: AppData = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

let now = new Date();
const nowListeners = new Set<() => void>();
let clockStarted = false;

function emit() {
  listeners.forEach((l) => l());
}

function readStorage(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
      doses: Array.isArray(parsed.doses) ? parsed.doses : [],
    };
  } catch {
    return EMPTY;
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: keep working in memory.
  }
}

function commit(next: AppData) {
  data = next;
  persist();
  emit();
}

function withSyncedDoses(next: AppData): AppData {
  return { ...next, doses: syncDoses(next.medicines, next.doses, toDateKey(new Date())) };
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const stored = readStorage();
  data = withSyncedDoses(stored);
  if (JSON.stringify(data) !== JSON.stringify(stored)) persist();
}

/** Regenerates today's dose records (e.g. after midnight). Safe to call any time — never duplicates. */
export function syncNow() {
  ensureLoaded();
  const next = withSyncedDoses(data);
  if (JSON.stringify(next.doses) !== JSON.stringify(data.doses)) commit(next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppData(): AppData {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureLoaded();
      return data;
    },
    () => EMPTY,
  );
}

export function useNow(): Date {
  return useSyncExternalStore(
    (l) => {
      nowListeners.add(l);
      return () => nowListeners.delete(l);
    },
    () => now,
    () => now,
  );
}

function tick() {
  now = new Date();
  syncNow();
  nowListeners.forEach((l) => l());
}

/** Keeps "now" fresh so due/overdue labels update, and picks up a new day's doses. */
export function startClock(): () => void {
  if (clockStarted || typeof window === "undefined") return () => {};
  clockStarted = true;
  tick();
  const interval = window.setInterval(tick, 30_000);
  const onVisible = () => document.visibilityState === "visible" && tick();
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    data = withSyncedDoses(readStorage());
    emit();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("storage", onStorage);
  return () => {
    clockStarted = false;
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("storage", onStorage);
  };
}

function cleanInput(input: MedicineInput): MedicineInput {
  return {
    ...input,
    name: input.name.trim(),
    dosage: input.dosage.trim(),
    instructions: input.instructions.trim(),
    times: normalizeTimes(input.times),
    daysOfWeek: input.frequency === "specific_days" ? [...new Set(input.daysOfWeek)].sort() : [],
    endDate: input.endDate || null,
  };
}

export function addMedicine(input: MedicineInput): Medicine {
  ensureLoaded();
  const today = toDateKey(new Date());
  const med: Medicine = {
    ...cleanInput(input),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    scheduleFrom: today,
  };
  commit(withSyncedDoses({ ...data, medicines: [...data.medicines, med] }));
  return med;
}

export function updateMedicine(id: string, input: MedicineInput) {
  ensureLoaded();
  const today = toDateKey(new Date());
  const medicines = data.medicines.map((m) =>
    m.id === id ? { ...m, ...cleanInput(input), scheduleFrom: today } : m,
  );
  commit(withSyncedDoses({ ...data, medicines }));
}

export function deleteMedicine(id: string) {
  ensureLoaded();
  commit(withSyncedDoses({ ...data, medicines: data.medicines.filter((m) => m.id !== id) }));
}

export function recordDose(id: string, action: DoseAction): ActionResult {
  ensureLoaded();
  const result = applyDoseAction(data.doses, id, action, new Date());
  if (result.ok) commit({ ...data, doses: result.doses });
  return result;
}

export function undoDose(id: string) {
  ensureLoaded();
  commit({ ...data, doses: undoDoseAction(data.doses, id) });
}

export function clearAllData() {
  commit({ medicines: [], doses: [] });
}

export function loadSampleMedicines() {
  const today = toDateKey(new Date());
  const samples: MedicineInput[] = [
    {
      name: "Sample: Blood pressure tablet",
      dosage: "1 tablet",
      frequency: "daily",
      daysOfWeek: [],
      times: ["08:00"],
      startDate: today,
      endDate: null,
      instructions: "Example only — follow your own prescription.",
    },
    {
      name: "Sample: Diabetes tablet",
      dosage: "1 tablet",
      frequency: "daily",
      daysOfWeek: [],
      times: ["08:00", "14:00", "20:00"],
      startDate: today,
      endDate: null,
      instructions: "Example only — follow your own prescription.",
    },
    {
      name: "Sample: Vitamin D capsule",
      dosage: "1 capsule",
      frequency: "every_other_day",
      daysOfWeek: [],
      times: ["13:00"],
      startDate: today,
      endDate: null,
      instructions: "Example only — follow your own prescription.",
    },
  ];
  samples.forEach(addMedicine);
}
