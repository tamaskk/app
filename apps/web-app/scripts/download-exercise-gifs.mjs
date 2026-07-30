#!/usr/bin/env node
// Download every exercise's animated GIF from the ExerciseDB catalogue
// (static.exercisedb.dev/media/<id>.gif) into a folder. Zero dependencies —
// needs Node 18+ (global fetch).
//
// Usage:
//   node download-exercise-gifs.mjs [outDir]
//
// Runs from any folder; by default it writes to ./exercise-gifs in the current
// working directory, one .gif per exercise. Re-running skips files that already
// exist (resumable).
//
// Env overrides:
//   EX_API       catalogue API base (default https://gym-exercise-api-nu.vercel.app)
//   CONCURRENCY  parallel downloads  (default 8)

import { mkdir, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";

const EX_API = process.env.EX_API || process.env.API_BASE || "https://gym-exercise-api-nu.vercel.app";
const OUT = process.argv[2] || process.env.OUT || "./exercise-gifs";
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);

async function fetchPage(after) {
  const url = new URL(`${EX_API}/api/v1/exercises`);
  url.searchParams.set("limit", "25"); // API hard-caps limit at 25
  if (after) url.searchParams.set("after", after);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Listing failed: HTTP ${res.status}`);
  return res.json();
}

function fileFor(id, url) {
  const base = (url.split("/").pop() || `${id}.gif`).split("?")[0];
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return join(OUT, safe);
}

const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

async function downloadOne(id, url, stats) {
  const path = fileFor(id, url);
  if (await exists(path)) {
    stats.skipped++;
    return;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buf);
    stats.ok++;
  } catch (e) {
    stats.failed.push(`${url} (${e.message})`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Source: ${EX_API}`);
  // Producer/consumer: enumeration (60 slow sequential pages) runs alongside
  // the downloads, so downloading starts on the first page instead of waiting
  // for the whole catalogue to be listed.
  const queue = [];
  const seen = new Set();
  const stats = { ok: 0, skipped: 0, failed: [] };
  let producing = true;
  let known = 0;
  let done = 0;

  const tick = () => {
    if (done % 25 === 0 || (!producing && queue.length === 0)) {
      process.stdout.write(
        `\r[${done}/${known}${producing ? "+" : ""}] ok=${stats.ok} skipped=${stats.skipped} failed=${stats.failed.length}`,
      );
    }
  };

  const produce = async () => {
    let after = null;
    for (;;) {
      const json = await fetchPage(after);
      for (const ex of json?.data ?? []) {
        if (!ex?.exerciseId || seen.has(ex.exerciseId)) continue;
        seen.add(ex.exerciseId);
        if (ex.gifUrl) {
          queue.push({ id: ex.exerciseId, url: ex.gifUrl });
          known++;
        }
      }
      const meta = json?.meta ?? {};
      if (!meta.hasNextPage || !meta.nextCursor || meta.nextCursor === after) break;
      after = meta.nextCursor;
    }
    producing = false;
  };

  const consume = async () => {
    for (;;) {
      const job = queue.shift();
      if (job) {
        await downloadOne(job.id, job.url, stats);
        done++;
        tick();
      } else if (!producing) {
        return;
      } else {
        await sleep(50);
      }
    }
  };

  console.log(`Downloading GIFs → ${OUT}`);
  await Promise.all([produce(), ...Array.from({ length: Math.max(1, CONCURRENCY) }, consume)]);
  process.stdout.write("\n");
  console.log(`Done. ${known} exercises · ok=${stats.ok} skipped=${stats.skipped} failed=${stats.failed.length}`);
  if (stats.failed.length) {
    console.log("First failures:\n  " + stats.failed.slice(0, 20).join("\n  "));
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
