import { createRoot, flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { createDraftEdit } from './draft-edit.js';

function setup(value: unknown, result = true) {
  const writes: unknown[] = [];
  const edit = createRoot(() =>
    createDraftEdit({
      value: () => value,
      write: (nextValue) => {
        writes.push(nextValue);
        return result;
      },
    }),
  );
  return { edit, writes };
}

describe('createDraftEdit', () => {
  it('does not write a draft left as it was', () => {
    const { edit, writes } = setup({ kind: 'folder' });
    edit.start();
    flush();
    edit.commit();
    expect(writes).toEqual([]);
  });

  it('writes a changed draft as a parsed value', () => {
    const { edit, writes } = setup(1);
    edit.start();
    edit.setDraft('2');
    flush();
    edit.commit();
    expect(writes).toEqual([2]);
  });

  it('does not write after cancel', () => {
    const { edit, writes } = setup(1);
    edit.start();
    edit.setDraft('2');
    edit.cancel();
    flush();
    edit.commit();
    expect(writes).toEqual([]);
  });

  it('reports a write the app did not take', () => {
    const { edit } = setup(1, false);
    edit.write(2);
    flush();
    expect(edit.failed()).toBe(true);
  });
});
