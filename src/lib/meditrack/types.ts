export type Frequency = "daily" | "every_other_day" | "specific_days";

export interface Medicine {
  id: string;
  name: string;
  /** Dosage exactly as written on the prescription, e.g. "1 tablet (500 mg)". */
  dosage: string;
  frequency: Frequency;
  /** 0 = Sunday … 6 = Saturday. Only used when frequency is "specific_days". */
  daysOfWeek: number[];
  /** Local times in 24h "HH:MM" format. */
  times: string[];
  /** Local date key "YYYY-MM-DD". */
  startDate: string;
  endDate: string | null;
  instructions: string;
  createdAt: string;
  /**
   * First local date for which new dose records may be generated.
   * Set to "today" when a medicine is added or its schedule edited, so past days are never back-filled.
   */
  scheduleFrom: string;
}

export type MedicineInput = Omit<Medicine, "id" | "createdAt" | "scheduleFrom">;

export type DoseAction = "taken" | "skipped";

export interface DoseRecord {
  /** Deterministic: medicineId + date + time — guarantees one record per scheduled dose. */
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  date: string;
  time: string;
  status: "pending" | DoseAction;
  /** ISO timestamp of when the user recorded the action. */
  actionAt: string | null;
}

export type DoseState = "taken" | "skipped" | "upcoming" | "due" | "overdue";

export interface AppData {
  medicines: Medicine[];
  doses: DoseRecord[];
}
