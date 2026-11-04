import { createSignal } from 'solid-js';
import { formatDraftValue, parseValueInput } from './value-editor.js';

export interface DraftEditOptions {
  value: () => unknown;
  /** Writes the parsed draft. Returns false when the app did not take it. */
  write: (nextValue: unknown) => boolean;
}

export interface DraftEdit {
  editing: () => boolean;
  draft: () => string;
  setDraft: (draft: string) => void;
  /** Set when the last write did not reach the app. */
  failed: () => boolean;
  start: () => void;
  commit: () => void;
  cancel: () => void;
  /** Writes a value without going through the draft, as a toggle does. */
  write: (nextValue: unknown) => void;
}

/**
 * The draft, commit and cancel steps of an inline value editor.
 */
export function createDraftEdit(options: DraftEditOptions): DraftEdit {
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal('');
  const [failed, setFailed] = createSignal(false);
  let initial = '';

  function start(): void {
    initial = formatDraftValue(options.value());
    setDraft(initial);
    setEditing(true);
  }

  function write(nextValue: unknown): void {
    setFailed(!options.write(nextValue));
  }

  function commit(): void {
    if (!editing()) return;
    setEditing(false);
    // A draft left as it was is not an edit. Parsing it would still give a new
    // object for an object value, and writing that would replace the value.
    if (draft() === initial) return;
    const current = options.value();
    const parsed = parseValueInput(draft(), current);
    if (parsed !== current) write(parsed);
  }

  function cancel(): void {
    setEditing(false);
  }

  return { editing, draft, setDraft, failed, start, commit, cancel, write };
}
