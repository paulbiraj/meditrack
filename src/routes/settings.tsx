import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BellRing, Contrast, TextCursorInput, MousePointerClick, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/meditrack/PageHeader";
import { SafetyNotice } from "@/components/meditrack/SafetyNotice";
import {
  useAccessibilitySettings,
  useReminderSettings,
  updateAccessibilitySettings,
  updateReminderSettings,
  type AccessibilitySettings,
} from "@/lib/meditrack/preferences";
import { notificationsSupported, requestReminderPermission } from "@/lib/meditrack/reminders";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — MediTrack+" }] }),
  component: SettingsPage,
});

const options: Array<{
  key: keyof AccessibilitySettings;
  title: string;
  description: string;
  icon: typeof TextCursorInput;
}> = [
  {
    key: "largeText",
    title: "Large text",
    description: "Increase text size throughout the app.",
    icon: TextCursorInput,
  },
  {
    key: "highContrast",
    title: "High contrast",
    description: "Strengthen text and control contrast.",
    icon: Contrast,
  },
  {
    key: "largeButtons",
    title: "Larger buttons",
    description: "Increase buttons and touch targets.",
    icon: MousePointerClick,
  },
  {
    key: "simpleInterface",
    title: "Simple interface",
    description: "Reduce visual extras and secondary details.",
    icon: Rows3,
  },
];

function SettingsPage() {
  const accessibility = useAccessibilitySettings();
  const reminders = useReminderSettings();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  useEffect(() => {
    setPermission(notificationsSupported() ? Notification.permission : "unsupported");
  }, []);

  const toggleReminders = async (enabled: boolean) => {
    if (!enabled) {
      updateReminderSettings({ enabled: false });
      toast.success("Reminders disabled");
      return;
    }

    const result = await requestReminderPermission();
    setPermission(result);
    if (result === "granted") {
      updateReminderSettings({ enabled: true });
      toast.success("Reminders enabled while MediTrack+ is open");
    } else if (result === "denied") {
      updateReminderSettings({ enabled: false });
      toast.error("Notifications were denied. Allow them in browser settings to enable reminders.");
    } else {
      updateReminderSettings({ enabled: false });
      toast.error("Browser notifications are not supported here.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Personalize MediTrack+ and control in-app reminder behaviour."
      />

      <section className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <div className="border-b p-6">
          <h2 className="text-2xl font-bold">Accessibility</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Changes are saved on this device and remain after refresh.
          </p>
        </div>
        <ul className="divide-y">
          {options.map(({ key, title, description, icon: Icon }) => (
            <li key={key} className="flex items-center gap-4 p-5 sm:p-6">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-teal-soft text-teal">
                <Icon className="size-6" aria-hidden />
              </span>
              <label htmlFor={`setting-${key}`} className="min-w-0 flex-1 cursor-pointer">
                <span className="block text-lg font-bold">{title}</span>
                <span className="block text-base text-muted-foreground">{description}</span>
              </label>
              <Switch
                id={`setting-${key}`}
                checked={accessibility[key]}
                onCheckedChange={(checked) => updateAccessibilitySettings({ [key]: checked })}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <BellRing className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Dose reminders</h2>
                <p className="mt-1 text-base text-muted-foreground">
                  Browser notifications for due doses while this app is open.
                </p>
              </div>
              <Switch
                checked={reminders.enabled}
                onCheckedChange={toggleReminders}
                aria-label="Enable dose reminders"
              />
            </div>
            <p
              className="mt-4 rounded-xl bg-surface p-4 text-sm leading-relaxed text-muted-foreground"
              role="status"
            >
              {permission === "denied"
                ? "Notifications are blocked. Change the browser's notification permission for this site to try again."
                : permission === "unsupported"
                  ? "This browser does not support Notifications API."
                  : permission === "granted"
                    ? "Permission granted. Notifications appear while MediTrack+ is open; closed-app background push is not implemented."
                    : "Notification permission has not been granted. Enable reminders to request it explicitly."}
            </p>
          </div>
        </div>
      </section>

      <SafetyNotice />
    </div>
  );
}
