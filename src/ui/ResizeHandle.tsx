import type { JSX } from '@solidjs/web';
import { createSignal } from 'solid-js';
import './ResizeHandle.css';

export interface ResizeHandleProps {
  onResize: (deltaX: number) => void;
  onResizeEnd?: () => void;
  onReset?: () => void;
  title?: string;
}

export function ResizeHandle(props: ResizeHandleProps): JSX.Element {
  const [dragging, setDragging] = createSignal(false);

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    setDragging(true);

    let startX = event.clientX;

    const onPointerMove = (next: PointerEvent): void => {
      const deltaX = startX - next.clientX;
      startX = next.clientX;
      props.onResize(deltaX);
    };

    const onPointerUp = (): void => {
      setDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      props.onResizeEnd?.();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      data-solid-resize-handle
      data-dragging={dragging() ? '' : undefined}
      title={props.title ?? 'Drag to resize, double-click to reset'}
      onPointerDown={onPointerDown}
      onDblClick={() => props.onReset?.()}
    />
  );
}
