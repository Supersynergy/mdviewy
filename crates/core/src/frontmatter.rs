//! Rayon-parallel frontmatter + heading extractor.

use std::path::{Path, PathBuf};

use gray_matter::engine::YAML;
use gray_matter::Matter;
use pulldown_cmark::{Event, HeadingLevel, Options, Parser, Tag, TagEnd};
use rayon::prelude::*;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct FileMeta {
    pub path: PathBuf,
    pub title: Option<String>,
    pub tags: Vec<String>,
    pub headings: Vec<Heading>,
    pub body_preview: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Heading {
    pub level: u8,
    pub text: String,
}

pub fn extract_one(path: &Path) -> Option<FileMeta> {
    let raw = std::fs::read_to_string(path).ok()?;
    Some(parse(path.to_path_buf(), &raw))
}

pub fn extract_batch(paths: &[PathBuf]) -> Vec<FileMeta> {
    paths.par_iter().filter_map(|p| extract_one(p)).collect()
}

fn parse(path: PathBuf, raw: &str) -> FileMeta {
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse(raw);

    let mut title: Option<String> = None;
    let mut tags: Vec<String> = Vec::new();

    if let Some(data) = parsed.data.as_ref().and_then(|p| p.as_hashmap().ok()) {
        if let Some(v) = data.get("title").and_then(|p| p.as_string().ok()) {
            title = Some(v);
        }
        if let Some(arr) = data.get("tags").and_then(|p| p.as_vec().ok()) {
            for t in arr {
                if let Ok(s) = t.as_string() {
                    tags.push(s);
                }
            }
        } else if let Some(s) = data.get("tags").and_then(|p| p.as_string().ok()) {
            tags = s
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
        }
    }

    let body = &parsed.content;
    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_FOOTNOTES);
    opts.insert(Options::ENABLE_STRIKETHROUGH);
    opts.insert(Options::ENABLE_TASKLISTS);

    let mut headings: Vec<Heading> = Vec::new();
    let mut current_level: Option<u8> = None;
    let mut current_text = String::new();
    for ev in Parser::new_ext(body, opts) {
        match ev {
            Event::Start(Tag::Heading { level, .. }) => {
                current_level = Some(heading_level_u8(level));
                current_text.clear();
            }
            Event::End(TagEnd::Heading(_)) => {
                if let Some(lv) = current_level.take() {
                    let text = current_text.trim().to_string();
                    if !text.is_empty() {
                        if title.is_none() && lv == 1 {
                            title = Some(text.clone());
                        }
                        headings.push(Heading { level: lv, text });
                    }
                }
                current_text.clear();
            }
            Event::Text(t) | Event::Code(t) if current_level.is_some() => {
                current_text.push_str(&t);
            }
            _ => {}
        }
    }

    let preview: String = body.chars().take(280).collect();
    FileMeta {
        path,
        title,
        tags,
        headings,
        body_preview: preview,
    }
}

fn heading_level_u8(l: HeadingLevel) -> u8 {
    match l {
        HeadingLevel::H1 => 1,
        HeadingLevel::H2 => 2,
        HeadingLevel::H3 => 3,
        HeadingLevel::H4 => 4,
        HeadingLevel::H5 => 5,
        HeadingLevel::H6 => 6,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn parses_yaml_and_headings() {
        let tmp = tempfile::tempdir().unwrap();
        let p = tmp.path().join("a.md");
        fs::write(
            &p,
            "---\ntitle: Hello\ntags: [a, b]\n---\n# H1\n## H2\nbody\n",
        )
        .unwrap();
        let m = extract_one(&p).unwrap();
        assert_eq!(m.title.as_deref(), Some("Hello"));
        assert_eq!(m.tags, vec!["a".to_string(), "b".to_string()]);
        assert_eq!(m.headings.len(), 2);
        assert_eq!(m.headings[0].level, 1);
    }
}
