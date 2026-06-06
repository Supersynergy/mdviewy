//! mdviewy core — rust-side hot path.
//!
//! Modules:
//! - `watcher`  — notify+ignore incremental folder watcher (Phase-1, default)
//! - `render`   — comrak+syntect SSR md→HTML (Phase-2, feature `render`)
//! - `frontmatter` — pulldown-cmark + gray_matter + rayon batch (Phase-2)
//! - `fts`      — tantivy embedded index (Phase-2)

#[cfg(feature = "watcher")]
pub mod watcher;

#[cfg(feature = "render")]
pub mod render;

#[cfg(feature = "frontmatter")]
pub mod frontmatter;

#[cfg(feature = "fts")]
pub mod fts;
