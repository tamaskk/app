// Ported 1:1 from apps/mobile/lib/services/notification_service.dart.
//
// Reimplemented on expo-notifications (managed Expo, SDK 57). The Flutter
// original wrapped `flutter_local_notifications` + the `timezone` package; here
// each weekly reminder becomes one `WEEKLY` calendar trigger. The public
// surface is preserved: initialise(), requestPermission(), reschedule(prefs).
// Re-entrant — every reschedule starts from a clean slate (cancelAll → schedule).
//
// PLATFORM SETUP: the first requestPermission() triggers the system prompt.
// expo-notifications needs no timezone bootstrap — the WEEKLY trigger fires in
// the device's local wall-clock time, matching the Flutter behaviour where the
// user's "18:00" means their 18:00.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { t } from "../i18n";
import { ReminderPrefs } from "../models/auth";

// Android channel the reminders post to. Mirrors the Flutter original's
// 'training_reminders' AndroidNotificationDetails channel.
const ANDROID_CHANNEL_ID = "training_reminders";

class NotificationServiceImpl {
  private initialised = false;

  async initialise(): Promise<void> {
    if (this.initialised) return;
    // On Android, create the high-importance channel the reminders post to.
    // (iOS has no channels; the WEEKLY trigger carries the schedule directly.)
    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
          name: t("notif.channel_name"),
          description: t("notif.channel_desc"),
          importance: Notifications.AndroidImportance.HIGH,
        });
      } catch {
        // Channel setup is best-effort — never block startup.
      }
    }
    this.initialised = true;
  }

  /// Show the OS-level permission prompt (or no-op if already granted).
  /// Returns true when the user grants (or the platform auto-grants) the request.
  async requestPermission(): Promise<boolean> {
    await this.initialise();
    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      const req = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true },
      });
      return req.granted;
    } catch (e) {
      if (__DEV__) console.warn("Notification permission error:", e);
    }
    return true;
  }

  /// Cancel any previously scheduled reminders and re-schedule based on [prefs].
  /// Safe to call repeatedly — every save runs through this path.
  async reschedule(prefs: ReminderPrefs): Promise<void> {
    await this.initialise();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!prefs.enabled || prefs.days.length === 0) return;

    const parts = prefs.time.split(":");
    if (parts.length !== 2) return;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const hour = Number.isNaN(h) ? 18 : h;
    const minute = Number.isNaN(m) ? 0 : m;

    for (const iso of prefs.days) {
      if (iso < 1 || iso > 7) continue;
      try {
        const trigger: Notifications.WeeklyTriggerInput = {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          // Flutter used ISO weekdays (1=Mon … 7=Sun). expo-notifications'
          // WEEKLY weekday is 1=Sun … 7=Sat, so remap: (iso % 7) + 1
          // (ISO Mon→2, … ISO Sat→7, ISO Sun→1).
          weekday: (iso % 7) + 1,
          hour,
          minute,
        };
        if (Platform.OS === "android") trigger.channelId = ANDROID_CHANNEL_ID;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: t("notif.reminder_title"),
            body: t("notif.reminder_body"),
          },
          trigger,
        });
      } catch (e) {
        if (__DEV__) console.warn(`Schedule failed for ISO ${iso}:`, e);
      }
    }
  }
}

/// Singleton — mirrors NotificationService.instance in the Dart original.
export const notificationService = new NotificationServiceImpl();
