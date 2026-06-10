# OAuth (Apple + Google) Sign-In setup

This app supports Apple and Google sign-in via the `sign_in_with_apple` and
`google_sign_in` packages. The Flutter code is wired end-to-end; what's left
is provisioning credentials and configuring the native platforms.

## 1. Install packages

```bash
cd apps/mobile
flutter pub get
```

## 2. Backend env vars

Add to `apps/web/.env.local`:

```bash
# Apple — typically your iOS bundle id (e.g. "io.blcks.eronlet").
# If you use Sign in with Apple on the web too, comma-separate the Service ID.
APPLE_CLIENT_ID=io.blcks.eronlet

# Google — comma-separated OAuth 2.0 Web client IDs.
# Use the WEB client id (not the iOS / Android client id) — google_sign_in's
# id token is issued for the Web client by default. See:
# https://developers.google.com/identity/sign-in/web/backend-auth
GOOGLE_CLIENT_IDS=123456789-abc.apps.googleusercontent.com

# Public URL of the web app — used in the password-reset email links.
APP_URL=https://eronlet.app

# Email provider for forgot-password. Leave unset (defaults to "console")
# while developing — the reset link will appear in the Next.js dev log.
# When ready: set to "resend" / "sendgrid" / etc. and wire it in lib/mailer.ts.
# MAIL_PROVIDER=resend
# RESEND_API_KEY=re_...
```

## 3. Apple — iOS configuration

1. Apple Developer portal → Identifiers → your App ID → enable
   **Sign In with Apple** capability.
2. In Xcode: open `apps/mobile/ios/Runner.xcworkspace`, select Runner target →
   Signing & Capabilities → **+ Capability** → Sign In with Apple.
3. Make sure the bundle id in Xcode matches `APPLE_CLIENT_ID` above.

Apple is **required** if you ship any other third-party login on iOS — the
button is only rendered on iOS/macOS in `oauth_buttons.dart`.

## 4. Google — iOS configuration

1. Google Cloud Console → APIs & Services → Credentials → Create Credentials
   → OAuth client ID → **iOS** with your iOS bundle id.
2. Download `GoogleService-Info.plist` and place it in
   `apps/mobile/ios/Runner/`.
3. In `apps/mobile/ios/Runner/Info.plist` add the reversed client id as a
   URL scheme (the Google plugin docs walk through this).

## 5. Google — Android configuration

1. Google Cloud Console → same project → Create Credentials → OAuth client ID
   → **Android** with your package name and the SHA-1 of your signing key
   (`./gradlew signingReport` from `apps/mobile/android`).
2. No file to download — Google identifies the app from the package name +
   signing fingerprint.
3. ALSO create a **Web** OAuth client ID. That's the audience the ID token
   will be issued for; put it in `GOOGLE_CLIENT_IDS` on the backend.

## 6. Smoke test

```bash
# Backend
cd apps/web && npm run dev

# Mobile
cd apps/mobile && flutter run
```

In the app, tap **Folytatás Apple-lel** or **Folytatás Google-lel** on the
welcome / login screen. On success you should land on the dashboard. On
failure the snackbar shows the backend's `detail` field — that's the
fastest path to debug a misconfigured audience or issuer.

## 7. Common errors

| Error | Cause | Fix |
|------|-------|-----|
| `APPLE_CLIENT_ID not configured` | Env var missing | Set in `.env.local`, restart dev server |
| `Unexpected audience: ...` | `aud` claim doesn't match | Add the missing client id to env (comma-separated) |
| `Provider did not return an email` | Apple, sometimes — user opted out, no email on record | Ask them to use email/password instead, or prompt for email after sign-in |
| `Signing key not found in JWKS` | JWKS cache is stale (1h TTL) | Restart the Next.js server to force a refetch |
