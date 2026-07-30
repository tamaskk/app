// Shimmer block — mirrors the app's `Skeleton`/`Shimmer` (surfaceLow base,
// sliding gradient). Uses the `.skeleton` keyframes from globals.css.

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton rounded-xl ${className ?? ""}`} style={style} />;
}

export function Spinner({
  size = 20,
  stroke = 2,
  className,
}: {
  size?: number;
  stroke?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`animate-spin ${className ?? ""}`}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth={stroke}
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  );
}
