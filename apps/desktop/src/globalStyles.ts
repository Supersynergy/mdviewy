import { createGlobalStyle } from 'styled-components'

export const GlobalStyles = createGlobalStyle`
  html {
    border-radius: 10px;
    overflow: hidden;
    background-color:  ${(props) => props.theme.bgColor};
  }
  
  body {
    background-color: ${(props) => props.theme.bgColor};
    color: ${(props) => props.theme.primaryFontColor};
    overflow: hidden;
    line-height: 1.55;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-feature-settings: "liga" 1, "calt" 1, "ss01" 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  code, pre, kbd, samp, .mono, [class*="language-"] {
    font-family: "SF Mono", "JetBrains Mono", "Fira Code", "Menlo", "Monaco", Consolas, monospace;
    font-feature-settings: "liga" 1, "calt" 1;
    font-variant-ligatures: contextual;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
    line-height: 1.25;
    font-weight: 650;
  }
  h1 { font-size: 2.25rem; }
  h2 { font-size: 1.75rem; }
  h3 { font-size: 1.375rem; }
  h4 { font-size: 1.125rem; }
  h5 { font-size: 1rem; }
  h6 {
    font-size: 0.9rem;
    color: ${(props) => props.theme.unselectedFontColor};
  }

  * {
    border-color: ${(props) => props.theme.borderColor};
  }

  .icon {
    flex: 0 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 0;
    padding: 0;
    background: transparent;
    color: inherit;
    height: 32px;
    width: 32px;
    font-size: 1rem;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s ease;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    font-feature-settings: "liga" 1, "calt" 1;
    font-display: swap;

    &:hover {
      color: ${(props) => props.theme.accentColor};
      background-color: ${(props) => props.theme.hoverColor};
    }

    &--active {
      color: ${(props) => props.theme.accentColor};
      font-weight: 1000;
    }

    &-unselected {
      color: ${(props) => props.theme.unselectedFontColor};
    }

    &-disabled {
      color: ${(props) => props.theme.disabledFontColor};
      cursor: not-allowed;
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  .icon-small {
    height: 22px;
    width: 22px;
    font-size: 0.85rem;
  }

  .icon-medium {
    height: 32px;
    width: 32px;
    font-size: 1rem;
  }

  .icon-large {
    height: 40px;
    width: 40px;
    font-size: 1.2rem;
  }

  .icon-rounded {
    border-radius: 50%;
  }

  .icon-smooth {
    border-radius: 6px;
  }
  .icon-square {
    border-radius: 0;
  }

  .popover {
    border: 1px solid ${(props) => props.theme.borderColor};
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
    backdrop-filter: saturate(180%) blur(20px);
  }

  pre, pre[class*="language-"] {
    position: relative;
    padding: 14px 16px !important;
    border-radius: 10px !important;
    border: 1px solid ${(props) => props.theme.borderColor};
    box-shadow: 0 1px 0 rgba(255,255,255,0.02) inset;
    overflow: auto;
  }

  pre > code, pre[class*="language-"] > code {
    font-size: 0.85rem;
    line-height: 1.55;
  }

  pre[data-lang]::before {
    content: attr(data-lang);
    position: absolute;
    top: 6px;
    right: 10px;
    font-size: 0.65rem;
    text-transform: uppercase;
    color: ${(props) => props.theme.labelFontColor};
    opacity: 0.7;
    pointer-events: none;
  }

  :not(pre) > code {
    padding: 0.12em 0.4em;
    border-radius: 4px;
    background: ${(props) => props.theme.hoverColor};
    font-size: 0.88em;
  }

  blockquote {
    border-left: 3px solid ${(props) => props.theme.accentColor};
    margin: 0.6em 0;
    padding: 0.2em 1em;
    color: ${(props) => props.theme.labelFontColor};
    background: ${(props) => props.theme.hoverColor};
    border-radius: 0 8px 8px 0;
  }

  hr {
    border: none;
    height: 1px;
    background: ${(props) => props.theme.borderColor};
    margin: 1.6em 0;
  }

  table {
    border-collapse: collapse;
    margin: 0.8em 0;
  }
  th, td {
    border: 1px solid ${(props) => props.theme.borderColor};
    padding: 6px 12px;
  }
  th {
    background: ${(props) => props.theme.hoverColor};
    font-weight: 600;
  }

  .markdown-body {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    overflow-wrap: break-word;
  }

  .markdown-body :where(p, li, blockquote, td, th, figcaption) {
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .markdown-body :where(img, video, canvas, svg) {
    max-width: 100%;
    height: auto;
  }

  .markdown-body table {
    display: block;
    width: max-content;
    max-width: 100%;
    overflow-x: auto;
    white-space: normal;
  }

  .markdown-body a {
    color: inherit !important;
    text-decoration: none !important;
  }

  .markdown-body .mdviewy-page-break {
    display: block;
    height: 0;
    margin: 2rem 0;
    border: 0;
    border-top: 1px dashed ${(props) => props.theme.borderColor};
    break-after: page;
    page-break-after: always;
  }

  @media print {
    body.${'mdviewy-printing'} * {
      visibility: hidden !important;
    }

    body.${'mdviewy-printing'} [data-mdviewy-active-editor='true'],
    body.${'mdviewy-printing'} [data-mdviewy-active-editor='true'] * {
      visibility: visible !important;
    }

    body.${'mdviewy-printing'} [data-mdviewy-active-editor='true'] {
      position: absolute !important;
      inset: 0;
      width: 100% !important;
      max-width: none !important;
      height: auto !important;
      min-height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
    }

    html,
    body {
      overflow: visible;
    }

    .markdown-body {
      max-width: none;
      margin: 0;
      padding: 0;
    }

    .markdown-body .mdviewy-page-break {
      margin: 0;
      border: 0;
      break-after: page;
      page-break-after: always;
    }
  }

  .display-none {
    display: none;
  }

  .cm-render-node-label,
  .cm-render-node-label-icon,
  .cm-render-node:hover .cm-render-node-label,
  .node-enter .cm-render-node-label,
  .markdown-body .cm-render-node-label,
  .rme-block-handler,
  .rme-draggable-handler,
  .rme-block-handler *,
  .rme-draggable-handler *,
  body .rme-block-handler,
  body .rme-draggable-handler,
  body [class*="rme-block-handler"],
  body [class*="rme-draggable-handler"],
  .markdown-body [class*="rme-block-handler"],
  .markdown-body [class*="rme-draggable-handler"],
  .markdown-body .rme-block-handler,
  .markdown-body .rme-draggable-handler,
  .markdown-body .rme-table-body-selector,
  .markdown-body .rme-table-row-selector,
  .markdown-body .rme-table-column-selector {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    width: 0 !important;
    height: 0 !important;
    pointer-events: none !important;
  }

  .file-tree-row .row-actions,
  .heading-row .heading-actions,
  [data-hover-actions] {
    opacity: 0;
    transition: opacity 200ms ease 0ms;
  }
  .file-tree-row:hover .row-actions,
  .heading-row:hover .heading-actions,
  [data-hover-actions]:hover {
    opacity: 1;
    transition-delay: 1.4s;
  }
  .file-tree-row:not(:hover) .row-actions,
  .heading-row:not(:hover) .heading-actions,
  [data-hover-actions]:not(:hover) {
    transition-delay: 0ms;
  }

  /* Styles for scrollbar */

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 8px;
    background: ${(props) => props.theme.scrollbarThumbColor};
    transition: background 160ms ease;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${(props) => props.theme.accentColor};
  }

  ::-webkit-scrollbar-corner {
    background: transparent;
  }
`
