// Inline SVG icon set — a self-contained stand-in for the Material icons the
// Flutter app uses. `fill="currentColor"` so `color`/`text-*` classes tint them,
// matching how the app colours its `Icon`s. 24px grid.

export type IconName =
  | "home"
  | "home_filled"
  | "dumbbell"
  | "dumbbell_filled"
  | "sports_score"
  | "sports_score_filled"
  | "trending_up"
  | "calendar"
  | "calendar_filled"
  | "add"
  | "close"
  | "check"
  | "check_circle"
  | "radio_unchecked"
  | "chevron_right"
  | "chevron_left"
  | "chevron_down"
  | "more_horiz"
  | "arrow_forward"
  | "arrow_upward"
  | "arrow_downward"
  | "fire"
  | "fire_outline"
  | "medal"
  | "person"
  | "trophy"
  | "sparkles"
  | "tune"
  | "play_circle"
  | "play_circle_outline"
  | "menu"
  | "timer"
  | "pause"
  | "info"
  | "swap"
  | "remove"
  | "remove_circle"
  | "add_circle"
  | "search"
  | "run"
  | "delete"
  | "edit"
  | "cloud_off"
  | "error"
  | "apple"
  | "google"
  | "logout"
  | "globe"
  | "settings";

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <path d="M12 3 3 10v11h6v-6h6v6h6V10z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  ),
  home_filled: <path d="M12 3 3 10v11h6v-6h6v6h6V10z" />,
  dumbbell: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6.5 6.5v11M3 9v6M17.5 6.5v11M21 9v6M6.5 12h11" />
    </g>
  ),
  dumbbell_filled: (
    <g fill="currentColor">
      <rect x="5" y="5" width="3" height="14" rx="1" />
      <rect x="2" y="8" width="2.4" height="8" rx="1" />
      <rect x="16" y="5" width="3" height="14" rx="1" />
      <rect x="19.6" y="8" width="2.4" height="8" rx="1" />
      <rect x="7" y="11" width="10" height="2" />
    </g>
  ),
  sports_score: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 3v18" />
      <path d="M5 4h14l-3 4 3 4H5" fill="currentColor" stroke="none" opacity="0.9" />
    </g>
  ),
  sports_score_filled: (
    <g fill="currentColor">
      <rect x="4" y="3" width="2" height="18" rx="1" />
      <path d="M6 4h13l-3 4 3 4H6z" />
    </g>
  ),
  trending_up: (
    <path d="M3 17l6-6 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  calendar: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 9h17M8 3v4M16 3v4" strokeLinecap="round" />
    </g>
  ),
  calendar_filled: (
    <g fill="currentColor">
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <rect x="3.5" y="5" width="17" height="4" opacity="0.5" />
    </g>
  ),
  add: <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  close: <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  check: <path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  check_circle: (
    <g>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9" fill="none" stroke="var(--color-background)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  radio_unchecked: <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />,
  chevron_right: <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  chevron_left: <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  chevron_down: <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  more_horiz: (
    <g fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </g>
  ),
  arrow_forward: <path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  arrow_upward: <path d="M12 20V5m-6 6 6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  arrow_downward: <path d="M12 4v15m6-6-6 6-6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  fire: (
    <path d="M12 2c1 3-1 4-2 6-1 1.8-.3 3.3.8 4 .5-.8.4-1.7 1.2-2.4.6 1.4 2 2 2 3.9A4 4 0 0 1 8 17.5C8 13 12 12 12 2z" fill="currentColor" />
  ),
  fire_outline: (
    <path d="M12 3c.8 2.6-1 3.6-1.9 5.4C9 10.5 9.6 12 10.9 12.8c.4-.8.3-1.7 1-2.5.7 1.4 2.1 2 2.1 4a4 4 0 1 1-8 0C6 9 11 8 12 3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  ),
  medal: (
    <g fill="currentColor">
      <path d="M8 2h8l-2.5 6h-3z" opacity="0.85" />
      <circle cx="12" cy="15" r="6" />
      <circle cx="12" cy="15" r="3.2" fill="var(--color-background)" />
    </g>
  ),
  person: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
    </g>
  ),
  trophy: (
    <g fill="currentColor">
      <path d="M7 4h10v3a5 5 0 0 1-10 0z" />
      <path d="M5 5H3v2a3 3 0 0 0 3 3V8H5zM19 5h2v2a3 3 0 0 1-3 3V8h1z" />
      <rect x="10.5" y="11" width="3" height="4" />
      <rect x="8" y="18" width="8" height="2.5" rx="1" />
      <rect x="9.5" y="15" width="5" height="3" />
    </g>
  ),
  sparkles: (
    <g fill="currentColor">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" opacity="0.8" />
    </g>
  ),
  tune: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" fill="var(--color-background)" />
      <circle cx="10" cy="12" r="2" fill="var(--color-background)" />
      <circle cx="18" cy="18" r="2" fill="var(--color-background)" />
    </g>
  ),
  play_circle: (
    <g fill="currentColor">
      <circle cx="12" cy="12" r="10" />
      <path d="M10 8.5l6 3.5-6 3.5z" fill="var(--color-background)" />
    </g>
  ),
  play_circle_outline: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none" />
    </g>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  timer: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V9M9 2h6" strokeLinecap="round" />
    </g>
  ),
  pause: (
    <g fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </g>
  ),
  info: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
    </g>
  ),
  swap: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </g>
  ),
  remove: <path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  remove_circle: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" strokeLinecap="round" />
    </g>
  ),
  add_circle: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </g>
  ),
  search: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </g>
  ),
  run: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="4.5" r="2" fill="currentColor" stroke="none" />
      <path d="M12 8l-3 3 3 2 1 5M12 11l4 1 3-2M9 11l-3 1-1 4M13 16l-3 4" />
    </g>
  ),
  delete: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </g>
  ),
  edit: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="M13.5 6.5l4 4" />
    </g>
  ),
  cloud_off: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M7 17a4 4 0 0 1-.6-7.95M9 6a5 5 0 0 1 9 3 3.5 3.5 0 0 1 2 6.3" />
    </g>
  ),
  error: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
    </g>
  ),
  apple: (
    <path d="M16 2c.1 1-.3 2-1 2.7-.7.8-1.8 1.4-2.9 1.3-.1-1 .4-2 1-2.7C13.9 2.5 15 2 16 2zm2.7 15c-.5 1.2-.8 1.7-1.5 2.7-1 1.4-2.3 3.2-4 3.2s-2-1.1-3.7-1.1-2.2 1.1-3.7 1.1S6 21 5 19.6C2.4 16 2.2 11.6 3.8 9.3c1-1.6 2.8-2.6 4.4-2.6 1.6 0 2.7 1.1 3.8 1.1s2.6-1.4 4.5-1.2c.8 0 3 .3 4.4 2.4-3.7 2-3.1 7 .8 8z" fill="currentColor" />
  ),
  google: (
    <g>
      <path d="M21.6 12.2c0-.6-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853" />
      <path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" fill="#FBBC05" />
      <path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z" fill="#EA4335" />
    </g>
  ),
  logout: (
    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 8l-4 4 4 4M6 12h9" />
    </g>
  ),
  globe: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </g>
  ),
  settings: (
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" strokeLinecap="round" />
    </g>
  ),
};

export function Icon({
  name,
  size = 24,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
