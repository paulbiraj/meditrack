import { format } from "date-fns";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar date as "YYYY-MM-DD" (never UTC, so late-evening doses stay on the right day). */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = parseDateKey(key);
  return toDateKey(d) === key;
}

export function isValidTime(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [h, m] = time.split(":").map(Number);
  return h !== undefined && m !== undefined && h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Local midnight for a date key. */
export function parseDateKey(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Whole calendar days from a to b (DST-safe). */
export function daysBetween(a: string, b: string): number {
  const [ay = 0, am = 1, ad = 1] = a.split("-").map(Number);
  const [by = 0, bm = 1, bd = 1] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Local Date for a dose scheduled on dateKey at "HH:MM". */
export function doseDateTime(dateKey: string, time: string): Date {
  const d = parseDateKey(dateKey);
  const [h = 0, m = 0] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export function formatTime(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(m)} ${suffix}`;
}

export function formatDateLong(key: string): string {
  return format(parseDateKey(key), "EEEE, d MMMM yyyy");
}

export function formatDateShort(key: string): string {
  return format(parseDateKey(key), "EEE, d MMM");
}

export function formatActionTime(iso: string): string {
  return format(new Date(iso), "h:mm a");
}

export function formatActionDateTime(iso: string): string {
  return format(new Date(iso), "d MMM, h:mm a");
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
