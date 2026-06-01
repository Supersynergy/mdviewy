//! Tauri command wrappers around `mdviewy-core`.

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use mdviewy_core::frontmatter::{self, FileMeta};
use mdviewy_core::fts::{FtsIndex, SearchHit};
use mdviewy_core::render::{self, RenderOpts, RenderOutput};
use mdviewy_core::watcher::{self, ScanEntry};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Default)]
pub struct CoreState {
    pub fts: Mutex<Option<Arc<FtsIndex>>>,
    pub watchers: Mutex<Vec<watcher::Watcher>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub root: PathBuf,
    pub entries: Vec<ScanEntry>,
    pub total: usize,
}

#[tauri::command]
pub fn core_scan_folder(path: String) -> Result<ScanResult, String> {
    let p = PathBuf::from(&path);
    let entries = watcher::scan(&p).map_err(|e| e.to_string())?;
    let total = entries.len();
    Ok(ScanResult {
        root: p,
        entries,
        total,
    })
}

#[tauri::command]
pub fn core_extract_meta(paths: Vec<String>) -> Result<Vec<FileMeta>, String> {
    let pbs: Vec<PathBuf> = paths.into_iter().map(PathBuf::from).collect();
    Ok(frontmatter::extract_batch(&pbs))
}

#[tauri::command]
pub fn core_render_md(md: String, theme: Option<String>) -> Result<RenderOutput, String> {
    let theme_static: Option<&'static str> = match theme.as_deref() {
        Some(s) if s.contains("dark") => Some("dark"),
        Some(_) => Some("light"),
        None => None,
    };
    Ok(render::render(
        &md,
        RenderOpts {
            theme: theme_static,
        },
    ))
}

#[tauri::command]
pub fn core_watch_folder(
    app: AppHandle,
    state: State<'_, CoreState>,
    path: String,
) -> Result<(), String> {
    let p = PathBuf::from(&path);
    let w = watcher::watch(&p).map_err(|e| e.to_string())?;
    let rx = w.rx.clone();
    state.watchers.lock().unwrap().push(w);

    let app_clone = app.clone();
    std::thread::spawn(move || {
        while let Ok(ev) = rx.recv_timeout(Duration::from_secs(60 * 60 * 24)) {
            if let Err(e) = app_clone.emit("mdviewy://watch", ev) {
                eprintln!("[core_watch_folder] emit failed: {e}");
            }
        }
    });
    Ok(())
}

fn ensure_fts(app: &AppHandle, state: &CoreState) -> Result<Arc<FtsIndex>, String> {
    let mut guard = state.fts.lock().unwrap();
    if let Some(idx) = guard.as_ref() {
        return Ok(idx.clone());
    }
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("fts");
    let idx = FtsIndex::open_or_create(&dir).map_err(|e| e.to_string())?;
    let arc = Arc::new(idx);
    *guard = Some(arc.clone());
    Ok(arc)
}

#[tauri::command]
pub fn core_fts_index(
    app: AppHandle,
    state: State<'_, CoreState>,
    paths: Vec<String>,
) -> Result<usize, String> {
    let idx = ensure_fts(&app, &state)?;
    let pbs: Vec<PathBuf> = paths.iter().map(PathBuf::from).collect();
    let metas = frontmatter::extract_batch(&pbs);
    let mut count = 0;
    for (meta, raw_path) in metas.iter().zip(pbs.iter()) {
        let body = std::fs::read_to_string(raw_path).unwrap_or_default();
        let path_s = raw_path.to_string_lossy();
        idx.upsert(&path_s, meta.title.as_deref(), &meta.tags, &body)
            .map_err(|e| e.to_string())?;
        count += 1;
    }
    idx.commit().map_err(|e| e.to_string())?;
    Ok(count)
}

#[tauri::command]
pub fn core_fts_search(
    app: AppHandle,
    state: State<'_, CoreState>,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<SearchHit>, String> {
    let idx = ensure_fts(&app, &state)?;
    idx.search(&query, limit.unwrap_or(20))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn core_fts_delete(
    app: AppHandle,
    state: State<'_, CoreState>,
    path: String,
) -> Result<(), String> {
    let idx = ensure_fts(&app, &state)?;
    idx.delete(&path).map_err(|e| e.to_string())?;
    idx.commit().map_err(|e| e.to_string())?;
    Ok(())
}
