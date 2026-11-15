use super::conf;
use crate::fc::{create_file, exists};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WorkspaceInfo {
    pub path: String,
}

impl WorkspaceInfo {
    pub fn new(path: String) -> Self {
        Self { path }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DocumentInfo {
    pub path: String,
    pub name: String,
}

impl DocumentInfo {
    pub fn new(path: String, name: String) -> Self {
        Self { path, name }
    }
}

/// How many entries the recent lists keep.
const MAX_RECENT_ENTRIES: usize = 20;

/// Puts `entry` at the front of a most-recently-used list, dropping an older
/// occurrence of the same key and anything past the cap.
fn promote_recent<T, F>(mut list: Vec<T>, entry: T, key: F) -> Vec<T>
where
    F: Fn(&T) -> &str,
{
    let entry_key = key(&entry).to_string();
    if let Some(index) = list.iter().position(|item| key(item) == entry_key) {
        list.remove(index);
    }

    list.insert(0, entry);
    list.truncate(MAX_RECENT_ENTRIES);
    list
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OpenedCache {
    recent_workspaces: Vec<WorkspaceInfo>,
    /// Added after the first releases, so older cache files deserialize without it.
    #[serde(default)]
    recent_documents: Vec<DocumentInfo>,
}

impl OpenedCache {
    pub fn new() -> Self {
        let path = &Self::get_path();
        if !exists(path) {
            create_file(path);
        }

        Self {
            recent_workspaces: vec![],
            recent_documents: vec![],
        }
    }

    pub fn recent_documents(&self) -> &[DocumentInfo] {
        &self.recent_documents
    }

    pub fn get_path() -> PathBuf {
        conf::app_root().join("opened_cache.json")
    }

    pub fn add_recent_workspace(mut self, workspace: WorkspaceInfo) -> Self {
        self.recent_workspaces = promote_recent(
            std::mem::take(&mut self.recent_workspaces),
            workspace,
            |item| item.path.as_str(),
        );
        self.write()
    }

    pub fn clear_recent_workspaces(mut self) -> Self {
        self.recent_workspaces = vec![];
        self.write()
    }

    pub fn add_recent_document(mut self, document: DocumentInfo) -> Self {
        self.recent_documents = promote_recent(
            std::mem::take(&mut self.recent_documents),
            document,
            |item| item.path.as_str(),
        );
        self.write()
    }

    pub fn clear_recent_documents(mut self) -> Self {
        self.recent_documents = vec![];
        self.write()
    }

    pub fn read() -> Self {
        match std::fs::read_to_string(Self::get_path()) {
            Ok(v) => {
                if let Ok(mut v2) = serde_json::from_str::<OpenedCache>(&v) {
                    let len_before = v2.recent_workspaces.len() + v2.recent_documents.len();
                    v2.recent_workspaces
                        .retain(|item| exists(Path::new(&item.path)));
                    v2.recent_documents
                        .retain(|item| exists(Path::new(&item.path)));
                    v2.recent_workspaces.truncate(MAX_RECENT_ENTRIES);
                    v2.recent_documents.truncate(MAX_RECENT_ENTRIES);
                    // Skip the rewrite when nothing was pruned — read() runs on
                    // the startup path and used to rewrite the file every boot.
                    if v2.recent_workspaces.len() + v2.recent_documents.len() == len_before {
                        v2
                    } else {
                        v2.write()
                    }
                } else {
                    Self::default()
                }
            }
            Err(err) => {
                println!("err: {:?}", err);
                Self::default()
            }
        }
    }

    pub fn write(self) -> Self {
        let path = &Self::get_path();
        if let Ok(v) = serde_json::to_string_pretty(&self) {
            // No fallback rewrite: a failed write would fail identically for
            // the defaults — the old `Self::default().write()` recursion
            // grew the stack until it overflowed on a tokio worker.
            if let Err(err) = std::fs::write(path, v) {
                tracing::error!("opened_cache write to {:?} failed: {err}", path);
            }
        }
        self
    }
}

impl Default for OpenedCache {
    fn default() -> Self {
        Self::new()
    }
}

pub mod cmd {
    use super::{DocumentInfo, OpenedCache, WorkspaceInfo};
    use tauri::command;

    #[command]
    pub fn get_opened_cache() -> OpenedCache {
        OpenedCache::read()
    }

    #[command]
    pub fn add_recent_workspace(workspace: WorkspaceInfo) -> OpenedCache {
        OpenedCache::read().add_recent_workspace(workspace)
    }

    #[command]
    pub fn clear_recent_workspaces() -> OpenedCache {
        OpenedCache::read().clear_recent_workspaces()
    }

    #[command]
    pub fn add_recent_document(document: DocumentInfo) -> OpenedCache {
        OpenedCache::read().add_recent_document(document)
    }

    #[command]
    pub fn clear_recent_documents() -> OpenedCache {
        OpenedCache::read().clear_recent_documents()
    }

    /// Rebuilds the native menubar so `File ▸ Open Recent` matches the cache.
    /// muda requires the AppKit main thread — commands run on tokio workers,
    /// so hop over instead of letting the menu build panic there.
    #[command]
    pub fn refresh_native_menu(app: tauri::AppHandle) {
        let app2 = app.clone();
        if let Err(err) = app.run_on_main_thread(move || {
            if let Err(err) = crate::menu::refresh_menu(&app2) {
                tracing::error!("failed to refresh menu: {:?}", err);
            }
        }) {
            tracing::error!("failed to dispatch menu refresh: {:?}", err);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{promote_recent, DocumentInfo, MAX_RECENT_ENTRIES};

    fn doc(name: &str) -> DocumentInfo {
        DocumentInfo::new(format!("/docs/{name}"), name.to_string())
    }

    #[test]
    fn promote_recent_keeps_the_newest_entries_up_to_the_cap() {
        let mut list = Vec::new();

        for index in 0..(MAX_RECENT_ENTRIES + 5) {
            list = promote_recent(list, doc(&format!("{index}.md")), |item| item.path.as_str());
        }

        assert_eq!(list.len(), MAX_RECENT_ENTRIES);
        assert_eq!(list[0].name, format!("{}.md", MAX_RECENT_ENTRIES + 4));
        assert!(!list.iter().any(|item| item.name == "0.md"));
    }

    #[test]
    fn promote_recent_moves_a_known_entry_to_the_front_without_duplicating_it() {
        let list = vec![doc("a.md"), doc("b.md")];

        let list = promote_recent(list, doc("b.md"), |item| item.path.as_str());

        let paths: Vec<_> = list.iter().map(|item| item.path.as_str()).collect();
        assert_eq!(paths, vec!["/docs/b.md", "/docs/a.md"]);
    }
}
