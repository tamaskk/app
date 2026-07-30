"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import * as api from "@/lib/api";
import type { ExerciseDto } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Skeleton";
import { ExerciseImage } from "@/components/workout/ExerciseImage";
import { titleCase } from "@/lib/format";

/**
 * Reusable ExerciseDB catalogue picker — search field + result list. The
 * catalogue filters aren't reliable, so it's search + cursor-paginated browse
 * (no filter chips). `mode: "multi"` toggles a selection set (create screen);
 * `mode: "single"` calls onPick per row (change-exercise). GIF thumbnails come
 * from our own /gifs/<id> URL.
 */
export function ExercisePicker({
  mode,
  selectedIds,
  onToggle,
  onPick,
}: {
  mode: "multi" | "single";
  selectedIds?: Set<string>;
  onToggle?: (ex: ExerciseDto) => void;
  onPick?: (ex: ExerciseDto) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ExerciseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const reqRef = useRef(0);

  const searching = query.trim().length >= 2;

  const load = useCallback(
    async (reset: boolean) => {
      const req = ++reqRef.current;
      if (reset) {
        setLoading(true);
        cursorRef.current = null;
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        if (searching) {
          const rows = await api.searchExercises(query.trim());
          if (req !== reqRef.current) return;
          setItems(rows);
          setHasMore(false);
        } else {
          const { items: rows, nextCursor } = await api.browseExercises({
            cursor: reset ? null : cursorRef.current,
          });
          if (req !== reqRef.current) return;
          cursorRef.current = nextCursor;
          setHasMore(nextCursor != null);
          setItems((prev) => (reset ? rows : [...prev, ...rows]));
        }
      } catch {
        if (req === reqRef.current) setError(t("create.server_unreachable"));
      } finally {
        if (req === reqRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query, searching, t],
  );

  useEffect(() => {
    const id = setTimeout(() => load(true), query ? 350 : 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <Icon name="search" size={18} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("create.search_exercises")}
          className="h-12 w-full rounded-[14px] border border-outline bg-transparent pl-10 pr-3 text-base text-on-surface outline-none placeholder:text-muted focus:border-on-surface"
        />
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size={24} className="text-muted" />
          </div>
        ) : error && items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 px-8 text-center">
            <Icon name="cloud_off" size={40} className="text-muted" />
            <p className="text-sm text-muted">{error}</p>
            <button onClick={() => load(true)} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-background">
              {t("common.retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="flex h-40 items-center justify-center text-muted">{t("common.no_results")}</p>
        ) : (
          <>
            {items.map((ex, i) => {
              const selected = selectedIds?.has(ex.exerciseId) ?? false;
              return (
                <button
                  key={ex.exerciseId + i}
                  onClick={() => (mode === "multi" ? onToggle?.(ex) : onPick?.(ex))}
                  className={`flex w-full items-center gap-3 py-3 text-left ${i > 0 ? "border-t border-outline" : ""}`}
                >
                  <span className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[10px] bg-surface-high">
                    <ExerciseImage url={ex.gifUrl} iconSize={20} className="h-full w-full" fit="cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-on-surface">{titleCase(ex.name)}</span>
                    {ex.targetMuscles?.length > 0 && (
                      <span className="mt-0.5 block truncate text-[12px] text-muted">
                        {ex.targetMuscles.map(titleCase).join(", ")}
                      </span>
                    )}
                  </span>
                  {mode === "multi" ? (
                    <Icon
                      name={selected ? "check_circle" : "add_circle"}
                      size={24}
                      className={selected ? "text-on-surface" : "text-muted"}
                    />
                  ) : (
                    <Icon name="swap" size={20} className="text-muted" />
                  )}
                </button>
              );
            })}
            {hasMore && (
              <div className="flex justify-center py-5">
                {loadingMore ? (
                  <Spinner size={22} className="text-muted" />
                ) : (
                  <button
                    onClick={() => load(false)}
                    aria-label="Load more"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-low text-muted"
                  >
                    <Icon name="chevron_down" size={20} />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
