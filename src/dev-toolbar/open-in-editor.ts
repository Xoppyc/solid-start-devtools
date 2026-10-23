/**
 * Asks the dev server to open the file in the user's IDE.
 * Vite serves this endpoint in development.
 */
export function openInEditor(location: string): void {
  void fetch(`/__open-in-editor?file=${encodeURIComponent(location)}`).catch(() => {});
}
