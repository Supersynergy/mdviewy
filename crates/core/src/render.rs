//! comrak + syntect SSR md → HTML.
//!
//! Caches `SyntaxSet`/`ThemeSet` in `OnceLock`. Builds TOC alongside HTML by
//! re-walking the AST. Reference pattern: `cybericius/MarkRight`.

use std::sync::OnceLock;

use comrak::{
    markdown_to_html_with_plugins, plugins::syntect::SyntectAdapter, ComrakPlugins, Options,
};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct RenderOutput {
    pub html: String,
    pub toc: Vec<TocEntry>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TocEntry {
    pub level: u8,
    pub text: String,
    pub anchor: String,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct RenderOpts {
    pub theme: Option<&'static str>,
}

static SYNTECT_ADAPTER_LIGHT: OnceLock<SyntectAdapter> = OnceLock::new();
static SYNTECT_ADAPTER_DARK: OnceLock<SyntectAdapter> = OnceLock::new();

fn adapter(theme: &str) -> &'static SyntectAdapter {
    if theme.contains("dark") {
        SYNTECT_ADAPTER_DARK.get_or_init(|| SyntectAdapter::new(Some("base16-ocean.dark")))
    } else {
        SYNTECT_ADAPTER_LIGHT.get_or_init(|| SyntectAdapter::new(Some("InspiredGitHub")))
    }
}

fn build_options() -> Options {
    let mut o = Options::default();
    o.extension.strikethrough = true;
    o.extension.tagfilter = false;
    o.extension.table = true;
    o.extension.autolink = true;
    o.extension.tasklist = true;
    o.extension.superscript = true;
    o.extension.header_ids = Some("h-".to_string());
    o.extension.footnotes = true;
    o.extension.front_matter_delimiter = Some("---".to_string());
    o.parse.smart = true;
    o.render.unsafe_ = false;
    o.render.escape = false;
    o.render.hardbreaks = false;
    o
}

pub fn render(md: &str, opts: RenderOpts) -> RenderOutput {
    let theme = opts.theme.unwrap_or("light");
    let syntect = adapter(theme);
    let mut plugins = ComrakPlugins::default();
    plugins.render.codefence_syntax_highlighter = Some(syntect);

    let options = build_options();
    let html = markdown_to_html_with_plugins(md, &options, &plugins);
    let toc = extract_toc(md);
    RenderOutput { html, toc }
}

fn extract_toc(md: &str) -> Vec<TocEntry> {
    let mut toc = Vec::new();
    let mut in_fence = false;
    let mut anchor_seen: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    for raw in md.lines() {
        let line = raw.trim_end();
        if line.starts_with("```") || line.starts_with("~~~") {
            in_fence = !in_fence;
            continue;
        }
        if in_fence {
            continue;
        }
        let mut level: u8 = 0;
        for c in line.chars() {
            if c == '#' && level < 6 {
                level += 1;
            } else {
                break;
            }
        }
        if level == 0 {
            continue;
        }
        let rest = line[level as usize..].trim();
        if rest.is_empty() {
            continue;
        }
        let base = slugify(rest);
        let n = anchor_seen.entry(base.clone()).or_insert(0);
        let anchor = if *n == 0 {
            base.clone()
        } else {
            format!("{base}-{n}")
        };
        *n += 1;
        toc.push(TocEntry {
            level,
            text: rest.to_string(),
            anchor,
        });
    }
    toc
}

fn slugify(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut prev_dash = false;
    for c in s.chars() {
        let lc = c.to_ascii_lowercase();
        if lc.is_ascii_alphanumeric() {
            out.push(lc);
            prev_dash = false;
        } else if !prev_dash && !out.is_empty() {
            out.push('-');
            prev_dash = true;
        }
    }
    while out.ends_with('-') {
        out.pop();
    }
    format!("h-{out}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_with_toc() {
        let out = render(
            "# Hello\n\n## World\n\n```rust\nfn x(){}\n```\n",
            RenderOpts::default(),
        );
        assert!(out.html.contains("<h1"));
        assert!(out.html.contains("<h2"));
        assert_eq!(out.toc.len(), 2);
        assert_eq!(out.toc[0].level, 1);
        assert_eq!(out.toc[0].anchor, "h-hello");
    }
}
