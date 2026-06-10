---
name: project-eronlet
description: HEFTOR workout tracking app — monorepo with Next.js web + Flutter mobile, Monochrome Performance design system
metadata:
  type: project
---

HEFTOR is a workout tracking monorepo at `/Users/mac/Desktop/Developer/workoutapp`.

**Why:** User wants to build a full-stack workout app based on Stitch UI designs.

**Structure:**
- `apps/web` — Next.js 14 App Router + Tailwind (TypeScript)
- `apps/mobile` — Flutter (iOS + Android), package: `com.eronlet`
- Root: Turborepo + npm workspaces

**Design System:** "Monochrome Performance" — pure black OLED bg, white cards, Inter font, 8px grid. Colors defined as Tailwind theme tokens: `bg-surface-low`, `bg-surface-mid`, `bg-surface-high`, `text-muted`, `bg-outline`, `text-accent-red`, `text-accent-green`.

**Screens implemented:**
1. Dashboard — streak, week strip, today hero card, stats grid
2. Workout — active session with rest timer, set tracking with checkboxes
3. Progress — radial metrics (Progress/Consistency/Intensity/Volume), monthly bar chart, 1RM line chart
4. Calendar — 49-week streak, dot calendar, workout summary card

**How to apply:** When adding features, respect the Monochrome Performance design tokens (no raw hex values in Tailwind classes). Flutter uses `AppColors` constants from `lib/theme/app_theme.dart`.
