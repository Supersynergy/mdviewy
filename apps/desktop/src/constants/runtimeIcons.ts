/**
 * Icons that RME injects at runtime (code-block copy button, drag handles,
 * slash menu, toolbars). They never appear in this app's JSX, so
 * `scripts/generate-remixicon-subset.mjs` would drop them from the subset and
 * the glyph would render as nothing — the copy button looked like it vanished
 * after a successful copy, which uses `ri-check-line`.
 *
 * Source: `grep -o 'ri-[a-z0-9-]*' node_modules/rme/dist/index.mjs`.
 */
export const RME_RUNTIME_ICONS = [
  'ri-arrow-go-back-fill',
  'ri-arrow-go-forward-fill',
  'ri-bard-line',
  'ri-bold',
  'ri-check-line',
  'ri-code-box-line',
  'ri-code-line',
  'ri-command-line',
  'ri-delete-bin-line',
  'ri-double-quotes-l',
  'ri-double-quotes-r',
  'ri-draggable',
  'ri-equalizer-line',
  'ri-expand-left-right-line',
  'ri-file-copy-line',
  'ri-flow-chart',
  'ri-formula',
  'ri-h-1',
  'ri-h-2',
  'ri-h-3',
  'ri-h-4',
  'ri-h-5',
  'ri-h-6',
  'ri-heading',
  'ri-html5-line',
  'ri-italic',
  'ri-list-check-3',
  'ri-list-ordered',
  'ri-list-unordered',
  'ri-loader-4-line',
  'ri-paragraph',
  'ri-separator',
  'ri-stop-line',
  'ri-table-line',
  'ri-text',
] as const
