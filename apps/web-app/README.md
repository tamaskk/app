# HEFTOR — Web (`apps/web-app`)

A Next.js reproduction of the Flutter mobile app (`apps/mobile`).

- **Mobile view (≤ 480px)** is a 1:1 copy of the phone app — same layout, colours,
  Inter type ramp, bottom nav, sheets and flows.
- **Desktop view (≥ 1024px)** swaps the bottom nav for a left sidebar and lays the
  content out in a wide, multi-column grid with larger type and comfortable spacing.

Built mobile-first; desktop is layered on with Tailwind `lg:` utilities.

## Run

```bash
npm run dev:webapp      # from the repo root  →  http://localhost:3001
# or
cd apps/web-app && npm run dev
```

The app talks to the same backend as the mobile app. `/api/*` is proxied to the
HEFTOR backend by a Next rewrite (see `next.config.ts`) so the browser calls this
app's own origin and avoids CORS. Point it elsewhere with `API_ORIGIN`
(server, for the rewrite) or `NEXT_PUBLIC_API_BASE_URL` (client, to call a backend
directly).

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 (CSS-first `@theme`).

## What's included

Auth (welcome / login / register / onboarding), dashboard, workouts list (with
edit/delete), the active-workout screen (timer, sets, rest timer, calorie estimate,
finish), the post-workout summary (with rank-up), and the four remaining tabs:
**HYROX** (create a 12-week plan / browse it by week+phase), **Progress**
(History + Exercises tabs with per-session and per-exercise detail, including an
SVG 1RM/volume trend chart) and **Calendar** (month grid, streak hero, day detail).
Design tokens in `src/app/globals.css` mirror
`apps/mobile/lib/theme/app_theme.dart`. The i18n dictionary in
`src/lib/strings.gen.ts` is extracted verbatim from the app's `app_strings.dart`
(654 keys, EN + HU; default EN, toggle in the sidebar/account).

## Not ported

Creating and generating workouts still happens in the mobile app — on the web you
can run and log your existing plans, and the create/generate buttons say so. A few
secondary Calendar/Progress widgets (observations, muscle-volume chart, yearly
heatmap, standalone rank card) are also left out.
