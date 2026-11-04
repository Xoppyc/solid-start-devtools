import type { JSX } from '@solidjs/web';
import type { DraftEdit } from './draft-edit.js';

/**
 * The text input of an inline value editor. It takes focus when it appears.
 */
export function DraftInput(props: {
  edit: DraftEdit;
  /** The data attribute the input carries, such as `data-solid-value-input`. */
  marker: string;
}): JSX.Element {
  return (
    <input
      {...{ [props.marker]: '' }}
      type="text"
      value={props.edit.draft()}
      onInput={(event) => props.edit.setDraft(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') props.edit.commit();
        if (event.key === 'Escape') props.edit.cancel();
      }}
      onBlur={() => props.edit.commit()}
      ref={(element) => {
        queueMicrotask(() => {
          element.focus();
          element.select();
        });
      }}
    />
  );
}
