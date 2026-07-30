import type { NextConfig } from "next";
import path from "path";
import { existsSync } from "fs";

// The HEFTOR backend (apps/web). Same default as the mobile config; override
// with API_ORIGIN when pointing at a local/staging backend.
const API_ORIGIN =
  process.env.API_ORIGIN ?? "https://app-web-nu-eight.vercel.app";

// When built inside the monorepo (local dev, or a Vercel deploy whose root
// directory is this folder), pin the file-tracing / turbopack root to the repo
// root so Next stops guessing between the multiple lockfiles. When the folder
// is deployed standalone (tarball with no parent), that path doesn't exist —
// skip it, otherwise Next hard-errors ("files outside the project directory").
const repoRoot = path.join(__dirname, "../..");
const inMonorepo = existsSync(path.join(repoRoot, "package.json"));

const nextConfig: NextConfig = {
  ...(inMonorepo
    ? { outputFileTracingRoot: repoRoot, turbopack: { root: repoRoot } }
    : {}),
  images: {
    // Exercise GIFs are served from the ExerciseDB CDN and the backend.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Proxy every /api/* call to the real backend so the browser talks to this
  // app's own origin (no CORS). Next forwards headers, incl. Authorization.
  // /exapi + /exmedia proxy the ExerciseDB catalogue + its GIF CDN (neither
  // sends CORS headers), used by the bulk-GIF download button.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
      { source: "/exapi/:path*", destination: "https://gym-exercise-api-nu.vercel.app/:path*" },
      { source: "/exmedia/:path*", destination: "https://static.exercisedb.dev/media/:path*" },
    ];
  },
};

export default nextConfig;
