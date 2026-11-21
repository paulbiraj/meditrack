import { Link, Outlet, useHydrated } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardCheck,
  HeartPulse,
  History,
  LayoutDashboard,
  Pill,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useEffect } from "react";
import { useAccessibilitySettings, useReminderSettings } from "@/lib/meditrack/preferences";
import { notifyDueDoses } from "@/lib/meditrack/reminders";
import { startClock, useAppData } from "@/lib/meditrack/store";

const NAV = [
  { to: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/doses", label: "Dose Tracker", short: "Doses", icon: ClipboardCheck },
  { to: "/medicines", label: "Medicines", short: "Medicines", icon: Pill },
  { to: "/history", label: "History", short: "History", icon: History },
  { to: "/analytics", label: "Analytics", short: "Analytics", icon: BarChart3 },
  { to: "/caregiver", label: "Caregiver View", short: "Caregiver", icon: UsersRound },
  { to: "/settings", label: "Settings", short: "Settings", icon: Settings },
] as const;

function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span
        className={
          onDark
            ? "grid size-11 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"
            : "grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"
        }
      >
        <HeartPulse className="size-6" aria-hidden />
      </span>
      <span className="font-display text-xl font-bold tracking-tight">
        MediTrack<span className={onDark ? "text-sidebar-primary" : "text-teal"}>+</span>
      </span>
    </Link>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your medicines">
      <div className="h-36 animate-pulse rounded-2xl bg-surface" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}

export function AppShell() {
  const hydrated = useHydrated();
  const accessibility = useAccessibilitySettings();
  const reminders = useReminderSettings();
  const { doses } = useAppData();

  useEffect(() => {
    return startClock();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("large-text", accessibility.largeText);
    root.classList.toggle("high-contrast", accessibility.highContrast);
    root.classList.toggle("large-buttons", accessibility.largeButtons);
    root.classList.toggle("simple-interface", accessibility.simpleInterface);
  }, [accessibility]);

  useEffect(() => {
    if (!reminders.enabled) return;
    const scan = () => notifyDueDoses(doses, new Date());
    scan();
    const interval = window.setInterval(scan, 30_000);
    return () => window.clearInterval(interval);
  }, [doses, reminders.enabled]);

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-sidebar p-6 text-sidebar-foreground lg:flex">
        <Logo onDark />
        <nav className="mt-10 flex flex-col gap-1.5" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground shadow-card",
              }}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-sidebar-accent p-4 text-sm leading-relaxed">
          <ShieldCheck className="mb-2 size-5 text-sidebar-primary" aria-hidden />
          Always take medicines exactly as prescribed. MediTrack+ is a reminder tool and does not
          give medical advice.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur lg:hidden">
          <Logo />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {hydrated ? <Outlet /> : <PageSkeleton />}
        </main>

        <footer className="hidden border-t px-10 py-5 text-sm text-muted-foreground lg:block">
          MediTrack+ stores your data only on this device. It does not prescribe medicines or change
          doses — always follow your doctor's or pharmacist's instructions.
        </footer>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t bg-background/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {NAV.map(({ to, short, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex min-h-[68px] flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground"
            activeProps={{ className: "text-teal" }}
          >
            <Icon className="size-6" aria-hidden />
            {short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
