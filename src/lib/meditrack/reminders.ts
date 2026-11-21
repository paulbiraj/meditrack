import { deriveState } from "./schedule";
import type { DoseRecord } from "./types";

const NOTIFIED_KEY = "meditrack-plus:notified-doses:v1";

function getNotified(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveNotified(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids].slice(-500)));
  } catch {
    // Notifications can still work for this page session if storage is blocked.
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestReminderPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  return Notification.requestPermission();
}

export function notifyDueDoses(doses: DoseRecord[], now: Date) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const notified = getNotified();
  let changed = false;

  for (const dose of doses) {
    const state = deriveState(dose, now);
    if (state !== "due" && state !== "overdue") continue;
    if (notified.has(dose.id)) continue;

    new Notification(dose.medicineName, {
      body: `${dose.dosage} is due at ${dose.time}. Open MediTrack+ to record it.`,
      tag: dose.id,
    });
    notified.add(dose.id);
    changed = true;
  }

  if (changed) saveNotified(notified);
}
