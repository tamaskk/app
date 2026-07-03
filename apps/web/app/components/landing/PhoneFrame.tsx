"use client";

import Image, { type StaticImageData } from "next/image";
import { ReactNode, useLayoutEffect, useRef, useState } from "react";

/**
 * iPhone-style bezel + screen frame.
 *
 * Two render modes:
 * 1. Mock children (DashboardMock / RankMock): the inner UI is rendered at a
 *    fixed "design size" (320×693) and scaled via CSS transform to match the
 *    actual rendered phone width — keeps absolute Tailwind sizes consistent
 *    when the same frame is dropped into different column widths.
 * 2. `screenshot`: a real iPhone screenshot (1179 × 2556 ≈ 9 / 19.5) is
 *    rendered with `object-cover` to fill the bezel screen. Because the
 *    aspect ratio matches the bezel (9 / 19.5), cover does not crop. The
 *    status bar and dynamic island overlays are skipped — real screenshots
 *    already carry their own chrome and re-overlaying ours would double up.
 */
const DESIGN_WIDTH = 320;
const DESIGN_HEIGHT = 693;

export function PhoneFrame({
  children,
  className = "",
  glow = true,
  screenshot,
  screenshotAlt = "",
}: {
  children?: ReactNode;
  className?: string;
  glow?: boolean;
  screenshot?: StaticImageData;
  screenshotAlt?: string;
}) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Only the mock path needs measurement-driven scaling. In screenshot mode
  // the Image fills the screen via object-cover so no transform is required
  // and the observer would just be dead weight.
  useLayoutEffect(() => {
    if (screenshot) return;
    const el = screenRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setScale(rect.width / DESIGN_WIDTH);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [screenshot]);

  return (
    <div
      className={`relative ${className}`}
      style={{ aspectRatio: "9 / 19.5" }}
    >
      {/* Soft glow behind the device — fades in with the parent on scroll. */}
      {glow && (
        <div
          aria-hidden
          className="absolute -inset-10 -z-10 rounded-[60px] bg-white/[0.04] blur-3xl"
        />
      )}

      {/* Bezel */}
      <div className="absolute inset-0 rounded-[44px] bg-gradient-to-b from-[#1a1a1c] to-[#0a0a0b] p-[10px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.04)]">
        <div className="absolute inset-[6px] rounded-[38px] ring-1 ring-white/5" />

        {/* Screen — measured for scale and used as the transform origin. */}
        <div
          ref={screenRef}
          className="relative h-full w-full overflow-hidden rounded-[36px] bg-black"
        >
          {screenshot ? (
            <Image
              src={screenshot}
              alt={screenshotAlt}
              fill
              sizes="(max-width: 768px) 200px, 320px"
              className="object-cover"
              priority={false}
            />
          ) : (
            <div
              className="absolute left-0 top-0"
              style={{
                width: DESIGN_WIDTH,
                height: DESIGN_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {/* Status bar — time + ear */}
              <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-7 pt-3 text-[10px] font-semibold tracking-tight text-white">
                <span>9:41</span>
                <span className="flex items-center gap-1 text-white/90">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path
                      d="M1 5l2-2 2 2 2-2 2 2 2-2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                    <rect
                      x="0.5"
                      y="0.5"
                      width="13"
                      height="7"
                      rx="1.5"
                      stroke="currentColor"
                    />
                    <rect
                      x="2"
                      y="2"
                      width="10"
                      height="4"
                      fill="currentColor"
                    />
                    <rect
                      x="14.5"
                      y="3"
                      width="1.5"
                      height="2"
                      fill="currentColor"
                    />
                  </svg>
                </span>
              </div>

              {/* Dynamic Island */}
              <div className="absolute left-1/2 top-2 z-20 h-7 w-24 -translate-x-1/2 rounded-full bg-black ring-1 ring-white/[0.06]" />

              {/* Screen content */}
              <div className="h-full w-full pt-10">{children}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
