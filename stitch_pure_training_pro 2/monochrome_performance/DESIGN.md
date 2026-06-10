---
name: Monochrome Performance
colors:
  surface: '#141313'
  surface-dim: '#141313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353434'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c8c6c8'
  on-secondary: '#303032'
  secondary-container: '#474649'
  on-secondary-container: '#b6b4b7'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e4e2e4'
  secondary-fixed-dim: '#c8c6c8'
  on-secondary-fixed: '#1b1b1d'
  on-secondary-fixed-variant: '#474649'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#141313'
  on-background: '#e5e2e1'
  surface-variant: '#353434'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  stat-lg:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  margin-mobile: 20px
  gutter: 16px
---

## Brand & Style
The design system is built on a foundation of extreme minimalism and high-contrast functionality. It is designed for focus, removing all visual noise to prioritize biometric data and performance metrics. The aesthetic leans into a "Digital Brutalist" movement—utilizing pure blacks, stark whites, and heavy typographic weighting to create a sense of authority and precision.

The emotional response is one of clarity and discipline. By utilizing a binary color palette, the UI creates a structured environment where information is the primary inhabitant. Tactile feedback is conveyed through sharp contrast transitions rather than complex gradients or shadows.

## Colors
The palette is strictly high-contrast. The default background is a deep, pure black (`#000000`) to ensure maximum power efficiency on OLED displays and total focus. 

- **Primary Canvas:** Pure Black (`#000000`) for the main app background.
- **Surface High:** Pure White (`#FFFFFF`) used for high-importance cards and active state containers. Text on these surfaces must be pure black.
- **Surface Low:** Off-black/Dark Grey (`#1C1C1E`) for secondary containers, providing a subtle lift from the background without breaking the dark aesthetic.
- **Accents:** Reserved only for functional data indicators. A vibrant green (`#34C759`) is used for positive progress (PRs) and a vivid red (`#FF3B30`) for status indicators or specific calendar highlights.

## Typography
Typography is the primary driver of hierarchy. Using **Inter**, the system relies on heavy weight variations (Bold/ExtraBold) for titles and statistical data, while utilizing Medium and Regular weights for labels and metadata.

- **Statistical Dominance:** For timer displays or large numbers (streaks, weight), use the `stat-lg` style with tight letter spacing.
- **Contrast Ratios:** Secondary text and labels should use `#8E8E93` on black backgrounds, or `#636366` on white backgrounds to maintain legibility while de-emphasizing non-critical info.
- **Emphasis:** Italicized bold headers are used for marketing and "hero" moments to inject a sense of motion and speed.

## Layout & Spacing
The layout follows a strict 8px grid system, ensuring precision in every element alignment. 

- **Mobile Constraints:** 20px side margins for all primary content containers.
- **Component Padding:** Elements like list items and buttons utilize 16px horizontal padding and 12px vertical padding.
- **Visual Grouping:** Use 32px vertical spacing between major sections (e.g., between the calendar and the workout cards) and 8px between related elements within a group.
- **Edge cases:** For timer-focused screens, content is centered vertically to emphasize the primary metric.

## Elevation & Depth
This system rejects traditional shadows in favor of **Tonal Layering**. 

- **Level 0:** Pure Black (`#000000`) background.
- **Level 1:** Dark Grey (`#1C1C1E`) surfaces. These appear "sunken" or secondary.
- **Level 2:** Pure White (`#FFFFFF`) surfaces. These are the highest in the hierarchy and appear "closest" to the user.
- **Borders:** In white-on-black contexts, use a subtle `1px` border of `#2C2C2E` to define edges only when necessary. Otherwise, rely on the stark color changes to define boundaries.

## Shapes
The design utilizes a generous roundedness that balances the "harsh" high-contrast colors. 

- **Primary Containers:** Standardized at `24px` (`rounded-xl` in this system) to create a modern, app-centric feel.
- **Buttons & Small UI:** Standardized at `12px` or `16px` depending on size. 
- **Checkboxes:** Utilize a medium rounding (`8px`) to remain distinct from circular icons.

## Components

### Buttons
- **Primary:** Pure White background, Black Inter Bold text, `24px` height (small) or `56px` (large).
- **Secondary:** Dark Grey (`#1C1C1E`) background, White text.
- **Icon Buttons:** Circular or Rounded Square (`12px`) with a soft grey background for secondary actions (e.g., "skip" or "edit").

### Cards
- **High-Contrast Card:** White background, black text. Used for "active" workout sets or summary views.
- **Standard Card:** Dark grey background, white text. Used for backgrounded information or historical data.
- **Layout:** Cards should have `20px` internal padding and `24px` corner radius.

### Input Fields & Controls
- **Checkboxes:** Rounded squares. When active, they fill with Black (on white cards) or White (on black cards) and a checkmark.
- **Progress Bars:** Thick horizontal lines. The "track" is low-opacity grey, the "fill" is pure white or black depending on the container.

### Lists
- Lists should be divider-less, using vertical spacing (`8px` to `12px`) to separate items.
- Chevron icons (`>`) are used to indicate drill-down capability, colored `#8E8E93`.