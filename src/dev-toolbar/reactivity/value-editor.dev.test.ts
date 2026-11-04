import { createMemo, createRoot, createSignal, createStore, DEV, flush, getOwner } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeReactiveValue } from './value-editor.js';

// These tests run against the browser dev build of solid-js (see
// vitest.config.ts), so the nodes are the ones the panels hand to the editor.

interface Probe<T> {
  read: () => T;
  /** The nodes the memo read, as the reactivity graph lists them. */
  sources: () => Record<string, unknown>[];
}

/** A memo over `fn`, with access to the nodes it read. */
function probe<T>(fn: () => T): Probe<T> {
  let node: unknown;
  const read = createMemo(() => {
    node = getOwner();
    return fn();
  });
  read();
  flush();
  return {
    read,
    sources: () => DEV!.getSources(node as never) as unknown as Record<string, unknown>[],
  };
}

function sourceNamed(probe: Probe<unknown>, name: string): object {
  for (const source of probe.sources()) {
    if (source._name === name) return source;
  }
  throw new Error(`no source named ${name}`);
}

function slotFor(probe: Probe<unknown>, key: string): object {
  for (const source of probe.sources()) {
    if ('_host' in source && source._key === key) return source;
  }
  throw new Error(`no store slot for ${key}`);
}

describe('writeReactiveValue', () => {
  it('returns false for null or undefined target', () => {
    expect(writeReactiveValue(null as never, [], 10)).toBe(false);
    expect(writeReactiveValue(undefined as never, [], 10)).toBe(false);
  });

  it('writes a signal and updates a dependent memo', () => {
    createRoot((dispose) => {
      const [count] = createSignal(10, { name: 'count' });
      const double = probe(() => count() * 2);
      expect(double.read()).toBe(20);

      expect(writeReactiveValue(sourceNamed(double, 'count'), [], 25)).toBe(true);
      expect(count()).toBe(25);
      expect(double.read()).toBe(50);
      dispose();
    });
  });

  it('writes a nested path of an object signal', () => {
    createRoot((dispose) => {
      const [user] = createSignal({ name: 'Alice', active: false }, { name: 'user' });
      const label = probe(() => `${user().name} ${user().active}`);

      expect(writeReactiveValue(sourceNamed(label, 'user'), ['active'], true)).toBe(true);
      expect(label.read()).toBe('Alice true');
      dispose();
    });
  });

  it('writes a store key and a nested store path', () => {
    createRoot((dispose) => {
      const [store] = createStore({ title: 'Old', todos: [{ done: false }] });
      const summary = probe(() => `${store.title} ${store.todos[0].done}`);

      expect(writeReactiveValue(slotFor(summary, 'title'), [], 'New')).toBe(true);
      expect(store.title).toBe('New');
      expect(summary.read()).toBe('New false');

      expect(writeReactiveValue(slotFor(summary, 'todos'), [0, 'done'], true)).toBe(true);
      expect(store.todos[0].done).toBe(true);
      expect(summary.read()).toBe('New true');
      dispose();
    });
  });

  it('refuses a path through a Map and leaves the value alone', () => {
    createRoot((dispose) => {
      const map = new Map([['k', 1]]);
      const [data] = createSignal({ m: map }, { name: 'data' });
      const read = probe(() => data().m);

      expect(writeReactiveValue(sourceNamed(read, 'data'), ['m', '"k"'], 2)).toBe(false);
      expect(data().m).toBe(map);
      dispose();
    });
  });

  describe('with a DEV.setSignal hook', () => {
    const dev = DEV as unknown as { setSignal?: (node: object, value: unknown) => void };

    afterEach(() => {
      delete dev.setSignal;
    });

    it('writes through the hook and not the bridge', () => {
      createRoot((dispose) => {
        const [user] = createSignal({ name: 'Alice', active: false }, { name: 'user' });
        const label = probe(() => `${user().name} ${user().active}`);
        const node = sourceNamed(label, 'user');
        const setSignal = vi.fn();
        dev.setSignal = setSignal;

        expect(writeReactiveValue(node, ['active'], true)).toBe(true);
        expect(setSignal).toHaveBeenCalledWith(node, { name: 'Alice', active: true });
        expect(label.read()).toBe('Alice false');
        dispose();
      });
    });

    it('passes a store slot the new value of its key', () => {
      createRoot((dispose) => {
        const [store] = createStore({ todos: [{ done: false }] });
        const summary = probe(() => store.todos[0].done);
        const slot = slotFor(summary, 'todos');
        const setSignal = vi.fn();
        dev.setSignal = setSignal;

        expect(writeReactiveValue(slot, [0, 'done'], true)).toBe(true);
        expect(setSignal).toHaveBeenCalledWith(slot, [{ done: true }]);
        expect(store.todos[0].done).toBe(false);
        dispose();
      });
    });
  });
});
