---
'@solidjs/start-devtools': minor
---

Add live state and store editing to the dev toolbar.

Signals and stores can now be inspected and edited live on-the-fly directly from the devtools:

- In the Reactivity Graph detail pane, primitive values and nested properties of selected signals and store slots can be edited inline.
- In the Ownership Tree detail pane, component signals feature inline editing with immediate updates to dependent memos, effects, and DOM elements.
- Boolean values support 1-click toggling, while strings, numbers, null, undefined, and JSON objects/arrays are parsed and written through Solid's internal reactivity scheduler.
