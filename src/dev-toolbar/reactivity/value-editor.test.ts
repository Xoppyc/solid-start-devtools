import { createMemo, createRoot, createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';
import {
  formatDraftValue,
  parseValueInput,
  updatePath,
  writeReactiveValue,
} from './value-editor.js';

describe('formatDraftValue', () => {
  it('formats primitives correctly', () => {
    expect(formatDraftValue('hello')).toBe('"hello"');
    expect(formatDraftValue(42)).toBe('42');
    expect(formatDraftValue(true)).toBe('true');
    expect(formatDraftValue(null)).toBe('null');
    expect(formatDraftValue(undefined)).toBe('undefined');
  });

  it('formats objects and arrays as JSON', () => {
    expect(formatDraftValue({ kind: 'folder', name: 'app' })).toBe(
      '{"kind":"folder","name":"app"}',
    );
    expect(formatDraftValue([1, 2])).toBe('[1,2]');
  });
});

describe('parseValueInput', () => {
  it('guards against [object Object] corrupting object values', () => {
    const existingObj = { kind: 'folder', name: 'app' };
    expect(parseValueInput('[object Object]', existingObj)).toBe(existingObj);
  });
  it('parses numeric values correctly', () => {
    expect(parseValueInput('42', 10)).toBe(42);
    expect(parseValueInput('-3.14', 0)).toBe(-3.14);
    expect(parseValueInput('100')).toBe(100);
    expect(parseValueInput('0', 5)).toBe(0);
  });

  it('parses boolean values correctly', () => {
    expect(parseValueInput('true', false)).toBe(true);
    expect(parseValueInput('false', true)).toBe(false);
    expect(parseValueInput('1', false)).toBe(true);
    expect(parseValueInput('true')).toBe(true);
    expect(parseValueInput('false')).toBe(false);
  });

  it('parses null and undefined literals', () => {
    expect(parseValueInput('null', null)).toBe(null);
    expect(parseValueInput('undefined', undefined)).toBe(undefined);
    expect(parseValueInput('null')).toBe(null);
    expect(parseValueInput('undefined')).toBe(undefined);
  });

  it('parses strings and strips surrounding quotes', () => {
    expect(parseValueInput('"hello world"', 'old')).toBe('hello world');
    expect(parseValueInput("'single quotes'", 'old')).toBe('single quotes');
    expect(parseValueInput('plain text', 'old')).toBe('plain text');
  });

  it('parses JSON objects and arrays', () => {
    expect(parseValueInput('{"a": 1, "b": "test"}')).toEqual({ a: 1, b: 'test' });
    expect(parseValueInput('[1, 2, 3]')).toEqual([1, 2, 3]);
    expect(parseValueInput('{invalid json}')).toBe('{invalid json}');
  });
});

describe('updatePath', () => {
  it('returns next value for empty path', () => {
    expect(updatePath({ a: 1 }, [], { a: 2 })).toEqual({ a: 2 });
  });

  it('updates shallow property on object', () => {
    const original = { name: 'Ada', age: 36 };
    const updated = updatePath(original, ['name'], 'Augusta');
    expect(updated).toEqual({ name: 'Augusta', age: 36 });
    expect(original.name).toBe('Ada');
  });

  it('updates nested property', () => {
    const original = { user: { profile: { theme: 'dark' } }, count: 0 };
    const updated = updatePath(original, ['user', 'profile', 'theme'], 'light');
    expect(updated.user.profile.theme).toBe('light');
    expect(original.user.profile.theme).toBe('dark');
  });

  it('updates array element', () => {
    const original = [10, 20, 30];
    const updated = updatePath(original, [1], 99);
    expect(updated).toEqual([10, 99, 30]);
    expect(original[1]).toBe(20);
  });
});

describe('writeReactiveValue', () => {
  it('returns false for null or undefined target', () => {
    expect(writeReactiveValue(null as any, [], 10)).toBe(false);
    expect(writeReactiveValue(undefined as any, [], 10)).toBe(false);
  });

  it('updates plain signal node value and notifies observers', () => {
    createRoot((dispose) => {
      const [count] = createSignal(10);
      const double = createMemo(() => count() * 2);

      expect(count()).toBe(10);
      expect(double()).toBe(20);

      const node: any = {
        _value: 10,
        _subs: null,
      };

      writeReactiveValue(node, [], 25);
      expect(node._value).toBe(25);

      dispose();
    });
  });

  it('updates nested object signal at path', () => {
    const node: any = {
      _value: { user: { name: 'Alice', active: false } },
      _subs: null,
    };

    writeReactiveValue(node, ['user', 'active'], true);
    expect(node._value.user.active).toBe(true);
    expect(node._value.user.name).toBe('Alice');
  });

  it('updates store slot node backing data', () => {
    const host = {
      v: { title: 'Old Title', completed: false },
      pb: null as any,
    };
    const slotNode: any = {
      _host: host,
      _key: 'title',
      _value: 'Old Title',
      _subs: null,
    };

    writeReactiveValue(slotNode, [], 'New Title');
    expect(host.v.title).toBe('New Title');
    expect(slotNode._value).toBe('New Title');
  });
});
