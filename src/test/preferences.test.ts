import { beforeEach, describe, expect, it } from "vitest";
import { updateAccessibilitySettings, updateReminderSettings } from "@/lib/meditrack/preferences";
import { notificationsSupported } from "@/lib/meditrack/reminders";

describe("persisted preferences", () => {
  beforeEach(() => window.localStorage.clear());

  it("persists accessibility settings", () => {
    updateAccessibilitySettings({ largeText: true, highContrast: true });
    const saved = JSON.parse(
      window.localStorage.getItem("meditrack-plus:accessibility:v1") ?? "{}",
    );
    expect(saved.largeText).toBe(true);
    expect(saved.highContrast).toBe(true);
  });

  it("persists reminder enablement", () => {
    updateReminderSettings({ enabled: true });
    const saved = JSON.parse(window.localStorage.getItem("meditrack-plus:reminders:v1") ?? "{}");
    expect(saved.enabled).toBe(true);
  });

  it("handles an environment without notification support", () => {
    expect(typeof notificationsSupported()).toBe("boolean");
  });
});
