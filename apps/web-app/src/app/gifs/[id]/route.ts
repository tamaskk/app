// Serves an exercise GIF from our own domain: /gifs/<exerciseId>.gif
//
// Redirects to the background-removed GIF in Vercel Blob when BLOB_BASE is set
// (after running scripts/upload-gifs-to-blob.mjs), otherwise falls back to the
// ExerciseDB CDN so the URL still works before the upload is done. Either way
// the app references a stable own-domain URL instead of static.exercisedb.dev.

export const runtime = "nodejs";

// e.g. https://<store-id>.public.blob.vercel-storage.com  (set after upload)
const BLOB_BASE = process.env.BLOB_BASE;
const CDN_FALLBACK = "https://static.exercisedb.dev/media";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const clean = id.replace(/\.gif$/i, "").replace(/[^a-zA-Z0-9_-]/g, "");
  const target = BLOB_BASE
    ? `${BLOB_BASE}/gifs/${clean}.gif`
    : `${CDN_FALLBACK}/${clean}.gif`;
  return Response.redirect(target, 307);
}
