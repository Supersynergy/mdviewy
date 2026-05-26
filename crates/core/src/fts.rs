//! Tantivy embedded FTS index.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use anyhow::{Context, Result};
use serde::Serialize;
use tantivy::collector::TopDocs;
use tantivy::query::QueryParser;
use tantivy::schema::*;
use tantivy::{Index, IndexReader, IndexWriter, ReloadPolicy, TantivyDocument};

#[derive(Debug, Clone, Serialize)]
pub struct SearchHit {
    pub path: String,
    pub title: Option<String>,
    pub score: f32,
    pub snippet: String,
}

pub struct FtsIndex {
    schema: Schema,
    f_path: Field,
    f_title: Field,
    f_tags: Field,
    f_body: Field,
    index: Index,
    reader: IndexReader,
    writer: Mutex<IndexWriter>,
}

impl FtsIndex {
    pub fn open_or_create(dir: &Path) -> Result<Self> {
        std::fs::create_dir_all(dir).context("create fts dir")?;
        let mut builder = Schema::builder();
        let f_path = builder.add_text_field("path", STRING | STORED);
        let f_title = builder.add_text_field("title", TEXT | STORED);
        let f_tags = builder.add_text_field("tags", TEXT | STORED);
        let f_body = builder.add_text_field("body", TEXT | STORED);
        let schema = builder.build();

        let index =
            Index::open_in_dir(dir).or_else(|_| Index::create_in_dir(dir, schema.clone()))?;
        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()?;
        let writer = index.writer(50_000_000)?;
        Ok(Self {
            schema,
            f_path,
            f_title,
            f_tags,
            f_body,
            index,
            reader,
            writer: Mutex::new(writer),
        })
    }

    pub fn upsert(
        &self,
        path: &str,
        title: Option<&str>,
        tags: &[String],
        body: &str,
    ) -> Result<()> {
        let w = self.writer.lock().unwrap();
        let path_term = Term::from_field_text(self.f_path, path);
        w.delete_term(path_term);
        let mut doc = TantivyDocument::default();
        doc.add_text(self.f_path, path);
        if let Some(t) = title {
            doc.add_text(self.f_title, t);
        }
        for tag in tags {
            doc.add_text(self.f_tags, tag);
        }
        doc.add_text(self.f_body, body);
        w.add_document(doc)?;
        Ok(())
    }

    pub fn delete(&self, path: &str) -> Result<()> {
        let w = self.writer.lock().unwrap();
        w.delete_term(Term::from_field_text(self.f_path, path));
        Ok(())
    }

    pub fn commit(&self) -> Result<()> {
        let mut w = self.writer.lock().unwrap();
        w.commit()?;
        self.reader.reload()?;
        Ok(())
    }

    pub fn search(&self, q: &str, limit: usize) -> Result<Vec<SearchHit>> {
        let searcher = self.reader.searcher();
        let parser =
            QueryParser::for_index(&self.index, vec![self.f_title, self.f_tags, self.f_body]);
        let query = parser.parse_query(q)?;
        let top = searcher.search(&query, &TopDocs::with_limit(limit))?;
        let mut hits = Vec::with_capacity(top.len());
        for (score, addr) in top {
            let doc: TantivyDocument = searcher.doc(addr)?;
            let path = doc
                .get_first(self.f_path)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let title = doc
                .get_first(self.f_title)
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let body_full = doc
                .get_first(self.f_body)
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let snippet: String = body_full.chars().take(200).collect();
            hits.push(SearchHit {
                path,
                title,
                score,
                snippet,
            });
        }
        Ok(hits)
    }

    pub fn schema(&self) -> &Schema {
        &self.schema
    }
}

pub fn ensure_index(app_data_dir: &Path) -> Result<PathBuf> {
    let p = app_data_dir.join("fts");
    std::fs::create_dir_all(&p)?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn upsert_search_roundtrip() {
        let tmp = tempfile::tempdir().unwrap();
        let idx = FtsIndex::open_or_create(tmp.path()).unwrap();
        idx.upsert("/a.md", Some("hello world"), &[], "alpha beta gamma")
            .unwrap();
        idx.upsert("/b.md", Some("other"), &[], "delta epsilon")
            .unwrap();
        idx.commit().unwrap();
        let hits = idx.search("beta", 10).unwrap();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].path, "/a.md");
    }
}
