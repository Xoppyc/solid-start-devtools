import { describe, expect, it } from 'vitest';
import {
  clampDetailWidth,
  DEFAULT_DETAIL_WIDTH,
  MIN_DETAIL_WIDTH,
} from './use-resizable-detail.js';

describe('clampDetailWidth', () => {
  it('keeps width within standard bounds', () => {
    expect(clampDetailWidth(300, 200, 600)).toBe(300);
    expect(clampDetailWidth(150, 200, 600)).toBe(200);
    expect(clampDetailWidth(750, 200, 600)).toBe(600);
  });

  it('rounds non-integer widths', () => {
    expect(clampDetailWidth(300.4, 200, 600)).toBe(300);
    expect(clampDetailWidth(300.6, 200, 600)).toBe(301);
  });

  it('falls back to default min width', () => {
    expect(clampDetailWidth(100)).toBe(MIN_DETAIL_WIDTH);
    expect(DEFAULT_DETAIL_WIDTH).toBeGreaterThanOrEqual(MIN_DETAIL_WIDTH);
  });
});
