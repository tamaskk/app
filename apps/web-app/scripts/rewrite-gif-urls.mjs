#!/usr/bin/env node
// Rewrite exercise gifUrl values in a MongoDB collection from
// static.exercisedb.dev to your own domain (the web-app /gifs route).
//
// Use this when you're ready to point the ExerciseDB catalogue (the DB behind
// gym-exercise-api, which the mobile app reads) at your self-hosted GIFs.
//
// Setup:
//   npm install mongodb        # if not already available
//   export MONGODB_URI="mongodb+srv://…"
//
// Usage:
//   node rewrite-gif-urls.mjs \
//     --db exercisedb --collection exercises --field gifUrl \
//     --base https://web-app-sepia-two-36.vercel.app
//     [--dry]     # preview only, no writes
//
// It maps  https://static.exercisedb.dev/media/<id>.gif
//      →   <base>/gifs/<id>.gif
// and only touches docs whose field still points at static.exercisedb.dev.

import { MongoClient } from "mongodb";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const DRY = process.argv.includes("--dry");
const URI = process.env.MONGODB_URI;
const DB = arg("db");
const COLL = arg("collection", "exercises");
const FIELD = arg("field", "gifUrl");
const BASE = (arg("base") || "").replace(/\/$/, "");

if (!URI || !DB || !BASE) {
  console.error(
    "Required: MONGODB_URI env, --db, --base.\n" +
      "  export MONGODB_URI=…\n" +
      "  node rewrite-gif-urls.mjs --db exercisedb --collection exercises " +
      "--field gifUrl --base https://web-app-sepia-two-36.vercel.app [--dry]",
  );
  process.exit(1);
}

const SRC = "https://static.exercisedb.dev/media/";
const rewrite = (url) =>
  typeof url === "string" && url.startsWith(SRC)
    ? `${BASE}/gifs/${url.slice(SRC.length)}` // keeps the <id>.gif tail
    : null;

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  try {
    const coll = client.db(DB).collection(COLL);
    const cursor = coll.find({ [FIELD]: { $regex: "^https://static\\.exercisedb\\.dev/media/" } });
    let scanned = 0;
    let updated = 0;
    const ops = [];
    for await (const doc of cursor) {
      scanned++;
      const next = rewrite(doc[FIELD]);
      if (!next) continue;
      if (DRY) {
        if (updated < 5) console.log(`${doc[FIELD]}  →  ${next}`);
      } else {
        ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { [FIELD]: next } } } });
        if (ops.length >= 500) {
          const r = await coll.bulkWrite(ops);
          updated += r.modifiedCount;
          ops.length = 0;
        }
      }
      if (DRY) updated++;
    }
    if (!DRY && ops.length) {
      const r = await coll.bulkWrite(ops);
      updated += r.modifiedCount;
    }
    console.log(
      DRY
        ? `Dry run: ${scanned} docs match, ${updated} would be rewritten (samples above).`
        : `Done. scanned=${scanned} updated=${updated}.`,
    );
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
