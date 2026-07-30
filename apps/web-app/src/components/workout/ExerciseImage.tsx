"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

// Renders the exercise's animated GIF (the catalogue serves one animated URL).
// Falls back to a dumbbell placeholder tile on missing/broken images — the web
// analogue of ExercisePlaceholder.
export function ExerciseImage({
  url,
  iconSize = 40,
  className,
  fit = "contain",
}: {
  url?: string | null;
  iconSize?: number;
  className?: string;
  fit?: "contain" | "cover";
}) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className={`flex items-center justify-center bg-surface-low ${className ?? ""}`}>
        <Icon name="dumbbell" size={iconSize} className="text-muted" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      onError={() => setBroken(true)}
      className={className}
      style={{ objectFit: fit, width: "100%", height: "100%" }}
    />
  );
}
