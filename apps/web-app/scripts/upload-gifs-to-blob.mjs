#!/usr/bin/env node
// Upload background-removed GIFs to Vercel Blob so they're served from your own
// domain (via the web-app /gifs/<id> route). Run it against the folder that
// holds the transparent GIFs (e.g. the ./nobg produced by remove-gif-bg.py).
//
// Setup:
//   1. Vercel dashboard → your project → Storage → create a Blob store.
//   2. Copy its read-write token.
//   3. export BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
//
// Usage:
//   cd exercise-gifs/nobg
//   node /path/to/upload-gifs-to-blob.mjs .
//
//   BLOB_READ_WRITE_TOKEN   required
//   CONCURRENCY             parallel uploads (default 8)
//
// Each file is uploaded to pathname `gifs/<id>.gif` (no random suffix), so its
// public URL is  <BLOB_BASE>/gifs/<id>.gif.  At the end the script prints the
// BLOB_BASE — set that as the web-app's BLOB_BASE env var and redeploy, then
// /gifs/<id>.gif serves the transparent GIFs.

import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { put } from "@vercel/blob";

const DIR = process.argv[2] || ".";
const CONCURRENCY = Number(process.env.CONCURRENCY || 8);
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!TOKEN) {
  console.error(
    "BLOB_READ_WRITE_TOKEN is required.\n" +
      "  Vercel dashboard → project → Storage → Blob → copy the token, then:\n" +
      "  export BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx",
  );
  process.exit(1);
}

async function main() {
  const files = (await readdir(DIR)).filter((f) => extname(f).toLowerCase() === ".gif");
  if (!files.length) {
    console.error(`No .gif files in ${DIR}`);
    process.exit(1);
  }
  console.log(`Uploading ${files.length} GIFs to Vercel Blob…`);

  const stats = { ok: 0, failed: [] };
  let base = null;
  let i = 0;
  let done = 0;

  const worker = async () => {
    while (i < files.length) {
      const file = files[i++];
      const id = basename(file, extname(file));
      try {
        const data = await readFile(join(DIR, file));
        const res = await put(`gifs/${id}.gif`, data, {
          access: "public",
          addRandomSuffix: false,
          contentType: "image/gif",
          token: TOKEN,
          allowOverwrite: true,
        });
        if (!base) base = res.url.replace(/\/gifs\/.*$/, ""); // store origin
        stats.ok++;
      } catch (e) {
        stats.failed.push(`${id} (${e.message})`);
      }
      done++;
      if (done % 25 === 0 || done === files.length) {
        process.stdout.write(`\r[${done}/${files.length}] ok=${stats.ok} failed=${stats.failed.length}`);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));
  process.stdout.write("\n");
  console.log(`Done. ok=${stats.ok} failed=${stats.failed.length}`);
  if (stats.failed.length) console.log("Failures:\n  " + stats.failed.slice(0, 20).join("\n  "));
  if (base) {
    console.log("\n────────────────────────────────────────────────────────");
    console.log("BLOB_BASE =", base);
    console.log("Set it on the web-app project and redeploy:");
    console.log(`  vercel env add BLOB_BASE production   # paste: ${base}`);
    console.log("Then /gifs/<id>.gif serves your transparent GIFs.");
    console.log("────────────────────────────────────────────────────────");
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
