import { describe, expect, it } from "vitest";
import {
  applyDoseAction,
  completionPercent,
  deriveState,
  getNextDose,
  summarize,
  syncDoses,
  validateMedicineInput,
} from "./schedule";
import type { Medicine, MedicineInput } from "./types";

const med = (over: Partial<Medicine> = {}): Medicine => ({
  id: "m1",
  name: "Test tablet",
  dosage: "1 tablet",
  frequency: "daily",
  daysOfWeek: [],
  times: ["08:00", "14:00", "20:00"],
  startDate: "2026-11-01",
  endDate: null,
  instructions: "",
  createdAt: "2026-11-01T00:00:00.000Z",
  scheduleFrom: "2026-11-20",
  ...over,
});

describe("dose generation", () => {
  it("creates a separate record for each scheduled time (8 AM, 2 PM, 8 PM → 3 records)", () => {
    const doses = syncDoses([med({ scheduleFrom: "2026-11-21" })], [], "2026-11-21");
    expect(doses.map((d) => d.time)).toEqual(["08:00", "14:00", "20:00"]);
  });

  it("does not duplicate records when synced again (e.g. after a refresh)", () => {
    const meds = [med({ scheduleFrom: "2026-11-21" })];
    const first = syncDoses(meds, [], "2026-11-21");
    const second = syncDoses(meds, first, "2026-11-21");
    const third = syncDoses(meds, [...second, ...second], "2026-11-21");
    expect(second).toHaveLength(3);
    expect(third).toHaveLength(3);
  });

  it("never back-fills days before the medicine was added", () => {
    const doses = syncDoses([med({ scheduleFrom: "2026-11-21" })], [], "2026-11-21");
    expect(doses.every((d) => d.date === "2026-11-21")).toBe(true);
  });

  it("schedules every other day counted from the start date", () => {
    const m = med({ frequency: "every_other_day", times: ["09:00"], startDate: "2026-11-18", scheduleFrom: "2026-11-18" });
    const dates = syncDoses([m], [], "2026-11-22").map((d) => d.date);
    expect(dates).toEqual(["2026-11-18", "2026-11-20", "2026-11-22"]);
  });

  it("stops after the end date", () => {
    const m = med({ times: ["09:00"], endDate: "2026-11-20", scheduleFrom: "2026-11-19" });
    const dates = syncDoses([m], [], "2026-11-22").map((d) => d.date);
    expect(dates).toEqual(["2026-11-19", "2026-11-20"]);
  });

  it("keeps taken history when a medicine is deleted but removes its pending doses", () => {
    const meds = [med({ scheduleFrom: "2026-11-21" })];
    const doses = syncDoses(meds, [], "2026-11-21");
    const taken = applyDoseAction(doses, doses[0]!.id, "taken", new Date(2026, 10, 21, 8, 5));
    if (!taken.ok) throw new Error("expected ok");
    const after = syncDoses([], taken.doses, "2026-11-21");
    expect(after).toHaveLength(1);
    expect(after[0]?.status).toBe("taken");
  });
});

describe("dose actions", () => {
  const doses = syncDoses([med({ scheduleFrom: "2026-11-21" })], [], "2026-11-21");
  const at = new Date(2026, 10, 21, 8, 10);

  it("records the actual action time", () => {
    const r = applyDoseAction(doses, doses[0]!.id, "taken", at);
    expect(r.ok && r.doses[0]?.actionAt).toBe(at.toISOString());
  });

  it("prevents recording the same dose twice", () => {
    const r1 = applyDoseAction(doses, doses[0]!.id, "taken", at);
    if (!r1.ok) throw new Error("expected ok");
    const r2 = applyDoseAction(r1.doses, doses[0]!.id, "skipped", at);
    expect(r2).toEqual({ ok: false, reason: "already_recorded" });
  });
});

describe("statuses and stats", () => {
  const doses = syncDoses([med({ scheduleFrom: "2026-11-21" })], [], "2026-11-21");

  it("marks a dose overdue more than 60 minutes after its time", () => {
    expect(deriveState(doses[0]!, new Date(2026, 10, 21, 7, 59))).toBe("upcoming");
    expect(deriveState(doses[0]!, new Date(2026, 10, 21, 9, 0))).toBe("due");
    expect(deriveState(doses[0]!, new Date(2026, 10, 21, 9, 1))).toBe("overdue");
  });

  it("counts taken, skipped, pending and overdue from real records", () => {
    const now = new Date(2026, 10, 21, 15, 30);
    const r = applyDoseAction(doses, doses[1]!.id, "skipped", now);
    if (!r.ok) throw new Error("expected ok");
    expect(summarize(r.doses, now)).toEqual({ total: 3, taken: 0, skipped: 1, pending: 1, overdue: 1 });
  });

  it("computes daily completion as taken ÷ scheduled", () => {
    expect(completionPercent(2, 3)).toBe(67);
    expect(completionPercent(0, 0)).toBe(0);
  });

  it("finds the next upcoming dose", () => {
    expect(getNextDose(doses, new Date(2026, 10, 21, 10, 0))?.time).toBe("14:00");
  });
});

describe("medicine form validation", () => {
  const base: MedicineInput = {
    name: "Tablet",
    dosage: "1 tablet",
    frequency: "daily",
    daysOfWeek: [],
    times: ["08:00"],
    startDate: "2026-11-21",
    endDate: null,
    instructions: "",
  };
  it("accepts a valid medicine", () => expect(validateMedicineInput(base).ok).toBe(true));
  it("rejects an end date before the start date", () =>
    expect(validateMedicineInput({ ...base, endDate: "2026-11-20" }).errors.endDate).toBeDefined());
  it("rejects duplicate times", () =>
    expect(validateMedicineInput({ ...base, times: ["08:00", "08:00"] }).errors.times).toBeDefined());
});
