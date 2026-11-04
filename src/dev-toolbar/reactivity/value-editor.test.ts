import { describe, expect, it } from 'vitest';
import {
  canUpdatePath,
  formatDraftValue,
  isJsonValue,
  isPlainContainer,
  isTextEditable,
  parseValueInput,
  updatePath,
} from './value-editor.js';

describe('formatDraftValue', () => {
  it('formats primitives correctly', () => {
    expect(formatDraftValue('hello')).toBe('"hello"');
    expect(formatDraftValue(42)).toBe('42');
    expect(formatDraftValue(true)).toBe('true');
    expect(formatDraftValue(null)).toBe('null');
    expect(formatDraftValue(undefined)).toBe('undefined');
    expect(formatDraftValue(5n)).toBe('5n');
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
    // Anything else keeps the old value instead of turning into false.
    expect(parseValueInput('1', false)).toBe(false);
    expect(parseValueInput('yes', true)).toBe(true);
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

  it('keeps a bigint a bigint', () => {
    expect(parseValueInput('42', 1n)).toBe(42n);
    expect(parseValueInput('-7n', 1n)).toBe(-7n);
    expect(parseValueInput('1.5', 1n)).toBe(1n);
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

describe('isPlainContainer', () => {
  it('accepts arrays and plain objects only', () => {
    expect(isPlainContainer([])).toBe(true);
    expect(isPlainContainer({})).toBe(true);
    expect(isPlainContainer(Object.create(null))).toBe(true);
    expect(isPlainContainer(new Map())).toBe(false);
    expect(isPlainContainer(new Set())).toBe(false);
    expect(isPlainContainer(new Uint8Array(1))).toBe(false);
    expect(isPlainContainer(new Date())).toBe(false);
    expect(isPlainContainer(new (class Point {})())).toBe(false);
    expect(isPlainContainer(null)).toBe(false);
  });
});

describe('isJsonValue', () => {
  it('accepts values a JSON round trip gives back equal', () => {
    expect(isJsonValue({ a: [1, 'b', null, { c: true }] })).toBe(true);
  });

  it('rejects values JSON would change', () => {
    expect(isJsonValue({ m: new Map() })).toBe(false);
    expect(isJsonValue({ d: new Date() })).toBe(false);
    expect(isJsonValue({ f: () => 1 })).toBe(false);
    expect(isJsonValue({ u: undefined })).toBe(false);
    expect(isJsonValue({ n: Number.NaN })).toBe(false);
    expect(isJsonValue({ b: 1n })).toBe(false);
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(isJsonValue(cycle)).toBe(false);
  });
});

describe('isTextEditable', () => {
  it('accepts primitives and JSON values', () => {
    expect(isTextEditable('a')).toBe(true);
    expect(isTextEditable(1n)).toBe(true);
    expect(isTextEditable(undefined)).toBe(true);
    expect(isTextEditable([1, 2])).toBe(true);
    expect(isTextEditable(new Set([1]))).toBe(false);
    expect(isTextEditable(Symbol('s'))).toBe(false);
  });
});

describe('canUpdatePath', () => {
  it('allows paths through plain containers only', () => {
    expect(canUpdatePath({ a: [{ b: 1 }] }, ['a', 0, 'b'])).toBe(true);
    expect(canUpdatePath({ m: new Map([['k', 1]]) }, ['m', '"k"'])).toBe(false);
    expect(canUpdatePath(new Set([1]), [0])).toBe(false);
  });
});
