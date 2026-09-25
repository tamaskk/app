// Device-persistent plate-calculator settings (bar weight + owned plates).
// Ported from services/plate_settings.dart — a singleton store with listeners
// (subscribe via usePlateSettings) backed by AsyncStorage.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultBarWeight, defaultPlates } from "../utils/plates";

const BAR_KEY = "plate_bar_weight";
const PLATES_KEY = "plate_available";

class PlateSettingsStore {
  private _barWeight = defaultBarWeight;
  private _availablePlates: number[] = [...defaultPlates];
  private listeners = new Set<() => void>();

  get barWeight(): number {
    return this._barWeight;
  }
  get availablePlates(): number[] {
    return [...this._availablePlates];
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  /** Load persisted values. Never throws — falls back to defaults. */
  async load(): Promise<void> {
    try {
      const [barRaw, platesRaw] = await Promise.all([
        AsyncStorage.getItem(BAR_KEY),
        AsyncStorage.getItem(PLATES_KEY),
      ]);
      const bar = barRaw != null ? Number(barRaw) : null;
      if (bar != null && bar > 0) this._barWeight = bar;
      if (platesRaw != null) {
        const parsed = (JSON.parse(platesRaw) as unknown[])
          .map((p) => Number(p))
          .filter((p) => Number.isFinite(p) && p > 0)
          .sort((a, b) => b - a);
        if (parsed.length > 0) this._availablePlates = parsed;
      }
    } catch {
      // keep defaults
    }
    this.emit();
  }

  /** Update + persist. Best-effort persistence; in-memory always succeeds. */
  async update(opts: { barWeight?: number; availablePlates?: number[] }): Promise<void> {
    if (opts.barWeight != null && opts.barWeight > 0) this._barWeight = opts.barWeight;
    if (opts.availablePlates != null) {
      const cleaned = Array.from(new Set(opts.availablePlates.filter((p) => p > 0))).sort((a, b) => b - a);
      if (cleaned.length > 0) this._availablePlates = cleaned;
    }
    this.emit();
    try {
      await AsyncStorage.setItem(BAR_KEY, String(this._barWeight));
      await AsyncStorage.setItem(PLATES_KEY, JSON.stringify(this._availablePlates));
    } catch {
      // values still live for this session
    }
  }

  resetToDefaults(): Promise<void> {
    return this.update({ barWeight: defaultBarWeight, availablePlates: [...defaultPlates] });
  }
}

export const plateSettings = new PlateSettingsStore();
