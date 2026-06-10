# Daily training-reminder notifications

The app uses `flutter_local_notifications` to fire a local notification on
the days the user marked as training days. No server is needed — once the
package is installed and the platforms are configured, scheduling is purely
device-local.

## 1. Install packages

```bash
cd apps/mobile
flutter pub get
```

The relevant packages:

- `flutter_local_notifications`
- `timezone`
- `flutter_timezone`

## 2. iOS configuration

1. In Xcode, open `apps/mobile/ios/Runner/Info.plist` and add:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>fetch</string>
  <string>processing</string>
  <string>remote-notification</string>
</array>
```

2. The first time `NotificationService.requestPermission()` runs, iOS shows
   the system prompt. The user must allow it for reminders to fire.

3. Notifications fire even when the app is closed — no extra entitlements
   needed beyond the default app capabilities.

## 3. Android configuration

In `apps/mobile/android/app/src/main/AndroidManifest.xml`, add the
following INSIDE `<manifest>` but OUTSIDE `<application>`:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

INSIDE `<application>`, add the receivers used by the plugin:

```xml
<receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationReceiver" />
<receiver android:exported="false" android:name="com.dexterous.flutterlocalnotifications.ScheduledNotificationBootReceiver">
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED"/>
        <action android:name="android.intent.action.MY_PACKAGE_REPLACED"/>
        <action android:name="android.intent.action.QUICKBOOT_POWERON" />
        <action android:name="com.htc.intent.action.QUICKBOOT_POWERON"/>
    </intent-filter>
</receiver>
```

The Android 13+ permission prompt is triggered by `requestPermission()`.

## 4. Smoke test

In the app: open the dashboard → tap **HETI TERV** → toggle
**Napi emlékeztető** on → pick a time and days → save.

A notification should fire at the chosen time on each chosen day. The
notification title is `HEFTOR` and the body is `Ma edzésnap. Indítsd a workoutot.`

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| iOS prompt never appears | App was previously denied | Settings → HEFTOR → Notifications |
| Android: nothing fires | Battery optimisation killing the alarm | Settings → Apps → HEFTOR → Battery → Unrestricted |
| Notification arrives next day | Scheduled time was in the past today | Time is converted to "next occurrence at that ISO weekday" |
