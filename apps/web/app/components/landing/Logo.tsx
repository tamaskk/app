"use client";

import Image from "next/image";

/**
 * Brand mark — white-on-transparent PNG. Sized via prop so the nav can
 * stay compact (20 px) while the footer can render the same artwork at
 * a larger 28 px.
 */
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <Image
      src="/mainlogo.png"
      alt="HEFTOR"
      width={size}
      height={size}
      priority
      className="select-none"
    />
  );
}
