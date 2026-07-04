import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest_all.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;
import '../i18n/app_strings.dart';
import '../models/auth.dart';

/// Thin wrapper around `flutter_local_notifications` so the screen code only
/// has to call [reschedule] with the latest preferences. Re-entrant — re-runs
/// always start from a clean slate (cancelAll → schedule).
///
/// PLATFORM SETUP — see NOTIFICATIONS_SETUP.md for iOS Info.plist + Android
/// AndroidManifest.xml requirements. The first call to [requestPermission]
/// triggers the system prompt.
class NotificationService {
  NotificationService._();
  static final NotificationService instance = NotificationService._();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _initialised = false;

  /// IDs 100..106 are dedicated to the weekly reminder (one per ISO weekday).
  /// Using a fixed range makes cancellation deterministic.
  static const _baseId = 100;

  Future<void> initialise() async {
    if (_initialised) return;
    tz_data.initializeTimeZones();
    try {
      final localName = await FlutterTimezone.getLocalTimezone();
      tz.setLocalLocation(tz.getLocation(localName));
    } catch (_) {
      // Fallback to UTC — better than crashing.
    }
    const init = InitializationSettings(
      iOS: DarwinInitializationSettings(),
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    );
    await _plugin.initialize(init);
    _initialised = true;
  }

  /// Show the OS-level permission prompt (or no-op if already granted).
  /// Returns true when the user grants the request.
  Future<bool> requestPermission() async {
    await initialise();
    try {
      final ios = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      if (ios != null) {
        final ok = await ios.requestPermissions(alert: true, sound: true);
        return ok ?? false;
      }
      final android = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      if (android != null) {
        final ok = await android.requestNotificationsPermission();
        return ok ?? true;
      }
    } catch (e) {
      if (kDebugMode) debugPrint('Notification permission error: $e');
    }
    return true;
  }

  /// Cancel any previously scheduled reminders and re-schedule based on
  /// [prefs]. Safe to call repeatedly — every save runs through this path.
  Future<void> reschedule(ReminderPrefs prefs) async {
    await initialise();
    await _plugin.cancelAll();
    if (!prefs.enabled || prefs.days.isEmpty) return;

    final parts = prefs.time.split(':');
    if (parts.length != 2) return;
    final hour = int.tryParse(parts[0]) ?? 18;
    final minute = int.tryParse(parts[1]) ?? 0;

    final details = NotificationDetails(
      iOS: const DarwinNotificationDetails(),
      android: AndroidNotificationDetails(
        'training_reminders',
        t('notif.channel_name'),
        channelDescription: t('notif.channel_desc'),
        importance: Importance.high,
        priority: Priority.high,
      ),
    );

    for (final iso in prefs.days) {
      if (iso < 1 || iso > 7) continue;
      try {
        await _plugin.zonedSchedule(
          _baseId + iso,
          t('notif.reminder_title'),
          t('notif.reminder_body'),
          _nextInstanceOfWeekday(iso, hour, minute),
          details,
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          // We anchor to the user's wall-clock — they expect 18:00 local
          // even if travelling. Some plugin versions still require the
          // legacy "absolute" interpretation flag.
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          matchDateTimeComponents: DateTimeComponents.dayOfWeekAndTime,
        );
      } catch (e) {
        if (kDebugMode) debugPrint('Schedule failed for ISO $iso: $e');
      }
    }
  }

  /// Next occurrence of [isoWeekday] at the given local time. We compute in
  /// local TZ so the user's "18:00" means their 18:00 even when travelling.
  tz.TZDateTime _nextInstanceOfWeekday(
      int isoWeekday, int hour, int minute) {
    final now = tz.TZDateTime.now(tz.local);
    var scheduled = tz.TZDateTime(
        tz.local, now.year, now.month, now.day, hour, minute);
    while (scheduled.weekday != isoWeekday || !scheduled.isAfter(now)) {
      scheduled = scheduled.add(const Duration(days: 1));
    }
    return scheduled;
  }
}
