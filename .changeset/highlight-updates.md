---
'@solidjs/start-devtools': minor
---

Add fine-grained reactive update highlighter with frequency color progression:

- Toggle via `Alt+Shift+H` shortcut or the highlight icon in the dock toolbar, with state persisted in local storage.
- Flashes fine-grained DOM mutations in real time, visualizing surgical reactivity where only updating text nodes and SVG icons flash without coarse component bounding boxes.
- Frequency-based color progression within an 800ms window: Light Blue (1), Purple (2-3), Pink (4-7), and Red (8+).
- Pixel-perfect ghost overlay using deep DOM node cloning in a dedicated portal layer, preserving typography, line-height, text transforms, and SVG stroke/fill colors.
