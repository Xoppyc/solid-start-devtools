import { createRoot, createSignal, DEV, flush, getOwner, runWithOwner } from 'solid-js';

/**
 * Updates a nested property along `path` immutably.
 */
export function updatePath<T>(target: T, path: readonly (string | number)[], value: unknown): T {
  if (path.length === 0) return value as T;
  const [head, ...tail] = path;
  const isArr = Array.isArray(target);
  const next = isArr ? ([...target] as unknown as T) : ({ ...target } as T);
  (next as Record<string | number, unknown>)[head] = updatePath(
    (target as Record<string | number, unknown>)?.[head],
    tail,
    value,
  );
  return next;
}

/**
 * Formats a value for editing in an input field.
 */
export function formatDraftValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return `${value}`;
}

/**
 * Parses user string input into an appropriately typed value.
 */
export function parseValueInput(raw: string, currentValue?: unknown): unknown {
  const trimmed = raw.trim();

  // Guard against accidental [object Object] serialization corrupting objects.
  if (trimmed === '[object Object]' && typeof currentValue === 'object') {
    return currentValue;
  }

  if (typeof currentValue === 'number') {
    const num = Number(trimmed);
    if (!Number.isNaN(num) && trimmed !== '') return num;
  }
  if (typeof currentValue === 'boolean') {
    return trimmed === 'true' || trimmed === '1';
  }
  if (currentValue === null && trimmed === 'null') {
    return null;
  }
  if (typeof currentValue === 'undefined' && trimmed === 'undefined') {
    return undefined;
  }
  if (typeof currentValue === 'string') {
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return raw;
  }

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (trimmed === 'undefined') return undefined;

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Non-parseable JSON falls through as literal string.
    }
  }

  if (!Number.isNaN(Number(trimmed)) && trimmed !== '') {
    return Number(trimmed);
  }

  return raw;
}

/**
 * Bridges external writes into Solid's internal reactivity scheduler.
 *
 * In Solid 2.0, signal writes trigger subscriber notification and queue flush
 * via the internal `setSignal` function bound during `createSignal`. Devtools
 * receives the raw reactive node without its user-space setter. By binding a
 * bridge signal node whose properties are forwarded to the inspected target node,
 * writes route through Solid's native setter and subscriber propagation without
 * requiring private module deep imports or reimplementing the internal heap.
 */
class ReactiveWriter {
  private setter?: (value: unknown) => unknown;
  private bridgeNode?: Record<string, unknown>;

  private ensureBridge(): void {
    if (this.setter && this.bridgeNode) return;
    createRoot(() => {
      const [_, set] = createSignal(0);
      this.setter = set as (value: unknown) => unknown;
      const owner = getOwner();
      const signals = DEV?.getSignals
        ? (DEV.getSignals(owner as never) as Record<string, unknown>[])
        : [];
      this.bridgeNode = signals[0];
    });
  }

  public write(
    target: Record<string, any>,
    path: readonly (string | number)[],
    nextValue: unknown,
  ): boolean {
    if (!target || typeof target !== 'object') return false;

    // Handle direct store proxy references ($TARGET / [Symbol(STORE_PROXY)]).
    if (
      '$TARGET' in target ||
      (typeof Symbol === 'function' && Object.getOwnPropertySymbols(target).length > 0)
    ) {
      const targetShape = target['$TARGET'] ?? target;
      if (targetShape && typeof targetShape === 'object' && 'v' in targetShape && targetShape.v) {
        if (path.length === 0 && typeof nextValue === 'object' && nextValue !== null) {
          Object.assign(targetShape.v, nextValue);
        } else if (path.length > 0) {
          let curr = targetShape.v;
          for (let i = 0; i < path.length - 1; i++) {
            curr = curr[path[i]];
          }
          curr[path[path.length - 1]] = nextValue;
        }
        return true;
      }
    }

    const isStoreSlot = '_host' in target;
    if (isStoreSlot && target._host) {
      const key = target._key;
      if (path.length === 0) {
        if (target._host.v) target._host.v[key] = nextValue;
        if (target._host.pb) target._host.pb[key] = nextValue;
      } else {
        const rootVal = target._host.v ? target._host.v[key] : target._value;
        const updated = updatePath(rootVal, path, nextValue);
        if (target._host.v) target._host.v[key] = updated;
        if (target._host.pb) target._host.pb[key] = updated;
        nextValue = updated;
      }
    } else if (path.length > 0) {
      nextValue = updatePath(target._value, path, nextValue);
    }

    this.ensureBridge();
    if (!this.setter || !this.bridgeNode) {
      target._value = nextValue;
      return true;
    }

    const keys = new Set<string>([
      ...Object.getOwnPropertyNames(this.bridgeNode),
      ...Object.getOwnPropertyNames(target),
      '_config',
      '_firewall',
      '_transition',
      '_x',
      '_pendingValue',
      '_value',
      '_statusFlags',
      '_equals',
      '_name',
      '_fn',
      '_time',
      '_notifiedAt',
      '_subs',
      '_subsTail',
      '_owner',
      '_internal',
      '_host',
      '_key',
    ]);

    for (const key of keys) {
      Object.defineProperty(this.bridgeNode, key, {
        get: () => target[key],
        set: (val: unknown) => {
          target[key] = val;
        },
        configurable: true,
        enumerable: true,
      });
    }

    // External devtools writes run without an owner to bypass owned-scope checks.
    runWithOwner(null, () => {
      this.setter!(nextValue);
    });

    try {
      flush();
    } catch {
      // In browser microtask environments flush may already be pending.
    }

    return true;
  }
}

const writer = new ReactiveWriter();

/**
 * Writes a new value to a reactive signal or store node at the specified path.
 */
export function writeReactiveValue(
  target: object,
  path: readonly (string | number)[],
  nextValue: unknown,
): boolean {
  return writer.write(target as Record<string, any>, path, nextValue);
}
