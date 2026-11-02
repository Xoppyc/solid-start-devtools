import { createSignal, onSettled } from 'solid-js';

const STORAGE_KEY = 'solid-start-devtools:detail-width';
export const DEFAULT_DETAIL_WIDTH = 320;
export const MIN_DETAIL_WIDTH = 240;

function readSavedWidth(key: string): number | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function writeSavedWidth(key: string, width: number): void {
  try {
    localStorage.setItem(key, String(width));
  } catch {
    // Storage can be blocked.
  }
}

export function clampDetailWidth(
  width: number,
  min = MIN_DETAIL_WIDTH,
  max = typeof window !== 'undefined' ? window.innerWidth * 0.7 : 800,
): number {
  return Math.round(Math.min(Math.max(width, min), max));
}

export interface UseResizableDetailOptions {
  storageKey?: string;
  defaultWidth?: number;
  minWidth?: number;
}

export interface ResizableDetail {
  width: () => number;
  setWidth: (width: number) => void;
  onResizeDelta: (deltaX: number) => void;
  onResizeEnd: () => void;
  reset: () => void;
}

export function useResizableDetail(options: UseResizableDetailOptions = {}): ResizableDetail {
  const key = options.storageKey ?? STORAGE_KEY;
  const initial = options.defaultWidth ?? DEFAULT_DETAIL_WIDTH;
  const min = options.minWidth ?? MIN_DETAIL_WIDTH;

  const [width, setWidthState] = createSignal(initial);

  onSettled(() => {
    const saved = readSavedWidth(key);
    if (typeof saved === 'number') {
      setWidthState(clampDetailWidth(saved, min));
    }
  });

  function setWidth(next: number): void {
    setWidthState(clampDetailWidth(next, min));
  }

  function onResizeDelta(deltaX: number): void {
    setWidthState((current) => clampDetailWidth(current + deltaX, min));
  }

  function onResizeEnd(): void {
    writeSavedWidth(key, width());
  }

  function reset(): void {
    setWidthState(initial);
    writeSavedWidth(key, initial);
  }

  return {
    width,
    setWidth,
    onResizeDelta,
    onResizeEnd,
    reset,
  };
}
