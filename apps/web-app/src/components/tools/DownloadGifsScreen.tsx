"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Skeleton";

// Downloads every exercise's animated GIF from the ExerciseDB catalogue
// (static.exercisedb.dev) as one ZIP, built in the browser. Neither the API
// nor the CDN sends CORS headers, so both are proxied same-origin via Next
// rewrites (/exapi, /exmedia — see next.config.ts). Enumeration (60 slow
// cursor pages) overlaps downloading so the bar moves right away. The same set
// is available as a folder via scripts/download-exercise-gifs.mjs.

type Phase = "idle" | "running" | "zipping" | "done" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DownloadGifsScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [known, setKnown] = useState(0);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const [producing, setProducing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  async function run() {
    if (phase === "running" || phase === "zipping") return;
    cancelRef.current = false;
    setError(null);
    setDone(0);
    setFailed(0);
    setKnown(0);
    setProducing(true);
    setPhase("running");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const queue: { id: string; url: string }[] = [];
      const seen = new Set<string>();
      let stillProducing = true;
      let ok = 0;
      let fail = 0;

      // Producer — cursor-paginate the ExerciseDB catalogue (limit hard-capped
      // at 25) and push each GIF job as it's discovered.
      const produce = async () => {
        let after: string | null = null;
        for (;;) {
          if (cancelRef.current) break;
          const url = new URL("/exapi/api/v1/exercises", window.location.origin);
          url.searchParams.set("limit", "25");
          if (after) url.searchParams.set("after", after);
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`Listing failed: HTTP ${res.status}`);
          const json = (await res.json()) as {
            data?: { exerciseId: string; gifUrl?: string }[];
            meta?: { hasNextPage?: boolean; nextCursor?: string | null };
          };
          for (const ex of json.data ?? []) {
            if (!ex?.exerciseId || seen.has(ex.exerciseId) || !ex.gifUrl) continue;
            seen.add(ex.exerciseId);
            queue.push({ id: ex.exerciseId, url: ex.gifUrl });
          }
          setKnown(seen.size);
          const meta = json.meta ?? {};
          if (!meta.hasNextPage || !meta.nextCursor || meta.nextCursor === after) break;
          after = meta.nextCursor;
        }
        stillProducing = false;
        setProducing(false);
      };

      // Consumers — fetch each GIF through the /exmedia proxy and add to the zip.
      const consume = async () => {
        for (;;) {
          if (cancelRef.current) return;
          const job = queue.shift();
          if (!job) {
            if (!stillProducing) return;
            await sleep(60);
            continue;
          }
          try {
            const proxied = job.url.replace(/^https?:\/\/static\.exercisedb\.dev\/media\//, "/exmedia/");
            const res = await fetch(proxied);
            if (!res.ok) throw new Error(String(res.status));
            const blob = await res.blob();
            const base = (job.url.split("/").pop() || `${job.id}.gif`).split("?")[0];
            zip.file(base, blob);
            ok++;
          } catch {
            fail++;
          }
          setDone(ok + fail);
          setFailed(fail);
        }
      };

      await Promise.all([produce(), ...Array.from({ length: 12 }, consume)]);

      if (cancelRef.current) {
        setPhase("idle");
        return;
      }

      setPhase("zipping");
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "heftor-exercise-gifs.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
      setPhase("error");
    }
  }

  const busy = phase === "running" || phase === "zipping";
  // While still enumerating we don't know the final total, so gate the bar on
  // the known count so far (it fills, then holds near the end as producing ends).
  const pct = known > 0 ? Math.round((done / known) * 100) : 0;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px] px-6 pb-10">
      <header className="flex items-center gap-2 py-3">
        <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-low text-on-surface">
          <Icon name="chevron_left" size={22} />
        </button>
        <span className="flex-1 text-base font-bold text-on-surface">Exercise GIFs</span>
      </header>

      <div className="mt-6">
        <h1 className="text-[28px] font-extrabold tracking-[-0.03em] text-on-surface">
          Download all exercise GIFs
        </h1>
        <p className="mt-2 text-[15px] leading-[1.5] text-muted">
          Fetches every exercise&apos;s animated GIF from the ExerciseDB catalogue
          (static.exercisedb.dev) and packs them into one ZIP. Runs entirely in
          your browser — no upload. ~1,500 GIFs (~120&nbsp;MB); best on desktop.
        </p>

        <button
          onClick={run}
          disabled={busy}
          className={`mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-base font-bold ${
            busy ? "bg-surface-high text-background" : "bg-primary text-background"
          }`}
        >
          {busy ? <Spinner size={20} className="text-background" /> : <Icon name="arrow_downward" size={20} />}
          {phase === "running"
            ? `Downloading… ${pct}%`
            : phase === "zipping"
              ? "Zipping…"
              : "Download ZIP"}
        </button>

        {busy && (
          <button onClick={() => (cancelRef.current = true)} className="mt-2 w-full py-2 text-sm font-semibold text-muted">
            Cancel
          </button>
        )}

        {/* progress */}
        {(busy || phase === "done") && (
          <div className="mt-6">
            <div className="h-2 overflow-hidden rounded-full bg-surface-high">
              <div className="h-full rounded-full bg-on-surface transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-[13px] text-muted">
              {known > 0 ? `${done}/${known}${producing ? "+" : ""} GIFs` : "counting…"}
              {failed > 0 && ` · ${failed} missing`}
            </p>
          </div>
        )}

        {phase === "done" && (
          <p className="mt-4 flex items-center gap-2 text-[15px] font-semibold text-accent-green">
            <Icon name="check_circle" size={20} /> ZIP ready — check your downloads.
          </p>
        )}
        {phase === "error" && error && (
          <p className="mt-4 text-[15px] font-semibold text-accent-red">{error}</p>
        )}

        <div className="mt-10 rounded-2xl border border-outline p-4">
          <p className="text-[13px] font-bold tracking-[0.08em] text-muted">PREFER A FOLDER?</p>
          <p className="mt-2 text-[14px] leading-[1.5] text-muted">
            Download the GIFs straight into a folder (resumable, zero deps, Node 18+):
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-low p-3 text-[12.5px] text-on-surface">
            <code>npm run download:gifs -- ./exercise-gifs</code>
          </pre>
          <p className="mt-4 text-[14px] leading-[1.5] text-muted">
            Then strip the backgrounds (Python + Pillow only) — writes transparent
            GIFs to <span className="text-on-surface">./nobg</span>:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-low p-3 text-[12.5px] text-on-surface">
            <code>pip install pillow && python3 scripts/remove-gif-bg.py exercise-gifs</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
