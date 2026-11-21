import { useSyncExternalStore } from "react";

export interface AccessibilitySettings {
  largeText: boolean;
  highContrast: boolean;
  largeButtons: boolean;
  simpleInterface: boolean;
}

export interface ReminderSettings {
  enabled: boolean;
}

const ACCESSIBILITY_KEY = "meditrack-plus:accessibility:v1";
const REMINDER_KEY = "meditrack-plus:reminders:v1";

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  largeText: false,
  highContrast: false,
  largeButtons: false,
  simpleInterface: false,
};

let accessibilitySettings = DEFAULT_ACCESSIBILITY;
let reminderSettings: ReminderSettings = { enabled: false };
let loaded = false;
const listeners = new Set<() => void>();

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return { ...fallback, ...JSON.parse(window.localStorage.getItem(key) ?? "{}") } as T;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Preferences remain available in memory if browser storage is blocked.
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  accessibilitySettings = readJson(ACCESSIBILITY_KEY, DEFAULT_ACCESSIBILITY);
  reminderSettings = readJson(REMINDER_KEY, { enabled: false });
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccessibilitySettings(): AccessibilitySettings {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureLoaded();
      return accessibilitySettings;
    },
    () => DEFAULT_ACCESSIBILITY,
  );
}

export function updateAccessibilitySettings(update: Partial<AccessibilitySettings>) {
  ensureLoaded();
  accessibilitySettings = { ...accessibilitySettings, ...update };
  persist(ACCESSIBILITY_KEY, accessibilitySettings);
  emit();
}

export function useReminderSettings(): ReminderSettings {
  return useSyncExternalStore(
    subscribe,
    () => {
      ensureLoaded();
      return reminderSettings;
    },
    () => ({ enabled: false }),
  );
}

export function updateReminderSettings(update: Partial<ReminderSettings>) {
  ensureLoaded();
  reminderSettings = { ...reminderSettings, ...update };
  persist(REMINDER_KEY, reminderSettings);
  emit();
}
