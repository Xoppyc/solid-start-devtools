import { JSX, Portal } from '@solidjs/web';
import { createEffect, Show } from 'solid-js';
import { createGhostClone } from './clone.js';
import { FADE_OUT_DURATION_MS, UpdateHighlightTracker } from './tracker.js';
import './overlay.css';

export interface HighlightUpdatesOverlayProps {
  active: boolean;
}

export function HighlightUpdatesOverlay(props: HighlightUpdatesOverlayProps): JSX.Element {
  let containerRef: HTMLDivElement | undefined;
  const tracker = new UpdateHighlightTracker();
  const activeClones = new Map<Node, HTMLElement | SVGElement>();

  createEffect(
    () => props.active,
    (active) => {
      if (!active || typeof window === 'undefined') return;

      const unsubscribe = tracker.subscribe((event) => {
        if (!containerRef) return;

        const clone = createGhostClone(event.node, event.count);
        if (!clone) return;

        // Replace any existing active clone for this node
        const previous = activeClones.get(event.node);
        if (previous) {
          previous.remove();
        }
        activeClones.set(event.node, clone);

        containerRef.appendChild(clone);

        const onEnd = () => {
          if (activeClones.get(event.node) === clone) {
            activeClones.delete(event.node);
          }
          clone.remove();
        };

        clone.addEventListener('animationend', onEnd, { once: true });
        setTimeout(onEnd, FADE_OUT_DURATION_MS + 50);
      });

      tracker.start();

      return () => {
        unsubscribe();
        tracker.stop();
        activeClones.clear();
        if (containerRef) {
          containerRef.innerHTML = '';
        }
      };
    },
  );

  return (
    <Show when={props.active}>
      <Portal>
        <div data-solid-highlight-overlay ref={containerRef} aria-hidden="true" />
      </Portal>
    </Show>
  );
}
