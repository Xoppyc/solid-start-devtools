---
'@solidjs/start-devtools': minor
---

Make side detail panels in Ownership and Reactivity resizable.

- Added `ResizeHandle` and `useResizableDetail` primitives in `src/ui`.
- Detail panes in both the Ownership Tree and Reactivity Graph now feature a draggable left edge handle with a generous 12px hitbox and visual feedback.
- Panel width persists in `localStorage` across page reloads.
- Double-clicking the resize handle resets the panel back to its default width (320px).
