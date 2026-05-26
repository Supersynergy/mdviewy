//! Gitignore-aware folder watcher.
//!
//! Pattern: `ignore::WalkBuilder` for initial scan → `notify-debouncer-full` for
//! incremental events → coalesce + filter (.md/.markdown/.txt + non-ignored) →
//! emit `WatchEvent` over crossbeam channel.

use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::{Context, Result};
use crossbeam_channel::{unbounded, Receiver, Sender};
use ignore::WalkBuilder;
use notify::{EventKind, RecursiveMode};
use notify_debouncer_full::{new_debouncer, DebounceEventResult};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum WatchEvent {
    Add { path: PathBuf },
    Remove { path: PathBuf },
    Modify { path: PathBuf },
    Rename { from: PathBuf, to: PathBuf },
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanEntry {
    pub path: PathBuf,
    pub is_dir: bool,
    pub size: u64,
}

pub struct Watcher {
    _debouncer: notify_debouncer_full::Debouncer<
        notify::RecommendedWatcher,
        notify_debouncer_full::RecommendedCache,
    >,
    pub rx: Receiver<WatchEvent>,
}

const MD_EXTS: &[&str] = &["md", "markdown", "mdx", "txt"];

fn is_markdownish(p: &Path) -> bool {
    p.extension()
        .and_then(|e| e.to_str())
        .map(|e| MD_EXTS.iter().any(|ext| ext.eq_ignore_ascii_case(e)))
        .unwrap_or(false)
}

/// Initial gitignore-aware scan. Parallel via `ignore::WalkBuilder::build_parallel`.
pub fn scan(root: &Path) -> Result<Vec<ScanEntry>> {
    let (tx, rx) = unbounded::<ScanEntry>();
    WalkBuilder::new(root)
        .hidden(false)
        .git_ignore(true)
        .git_exclude(true)
        .ignore(true)
        .build_parallel()
        .run(|| {
            let tx = tx.clone();
            Box::new(move |res| {
                if let Ok(entry) = res {
                    let path = entry.path().to_path_buf();
                    let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
                    if !is_dir && !is_markdownish(&path) {
                        return ignore::WalkState::Continue;
                    }
                    let size = entry.metadata().ok().map(|m| m.len()).unwrap_or(0);
                    let _ = tx.send(ScanEntry { path, is_dir, size });
                }
                ignore::WalkState::Continue
            })
        });
    drop(tx);
    Ok(rx.iter().collect())
}

/// Start incremental watcher. Caller polls `Watcher.rx`.
pub fn watch(root: &Path) -> Result<Watcher> {
    let (tx, rx): (Sender<WatchEvent>, Receiver<WatchEvent>) = unbounded();
    let root_owned = root.to_path_buf();

    let mut debouncer = new_debouncer(
        Duration::from_millis(200),
        None,
        move |res: DebounceEventResult| {
            let Ok(events) = res else { return };
            for ev in events {
                // Filter: only markdownish files (dirs we always pass through)
                let relevant = ev.paths.iter().any(|p| p.is_dir() || is_markdownish(p));
                if !relevant {
                    continue;
                }
                // Honor gitignore for the root we watch.
                let ignored = ev.paths.iter().any(|p| {
                    p.strip_prefix(&root_owned).is_ok()
                        && ignore::gitignore::Gitignore::new(root_owned.join(".gitignore"))
                            .0
                            .matched(p, false)
                            .is_ignore()
                });
                if ignored {
                    continue;
                }
                match ev.kind {
                    EventKind::Create(_) => {
                        for p in &ev.paths {
                            let _ = tx.send(WatchEvent::Add { path: p.clone() });
                        }
                    }
                    EventKind::Remove(_) => {
                        for p in &ev.paths {
                            let _ = tx.send(WatchEvent::Remove { path: p.clone() });
                        }
                    }
                    EventKind::Modify(notify::event::ModifyKind::Name(_))
                        if ev.paths.len() == 2 =>
                    {
                        let _ = tx.send(WatchEvent::Rename {
                            from: ev.paths[0].clone(),
                            to: ev.paths[1].clone(),
                        });
                    }
                    EventKind::Modify(_) => {
                        for p in &ev.paths {
                            let _ = tx.send(WatchEvent::Modify { path: p.clone() });
                        }
                    }
                    _ => {}
                }
            }
        },
    )
    .context("failed to start notify debouncer")?;

    debouncer
        .watch(root, RecursiveMode::Recursive)
        .with_context(|| format!("failed to watch {}", root.display()))?;

    Ok(Watcher {
        _debouncer: debouncer,
        rx,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn scan_finds_md_only() {
        let tmp = tempfile::tempdir().unwrap();
        fs::write(tmp.path().join("a.md"), "# hi").unwrap();
        fs::write(tmp.path().join("b.png"), b"binary").unwrap();
        let entries = scan(tmp.path()).unwrap();
        let files: Vec<_> = entries.iter().filter(|e| !e.is_dir).collect();
        assert_eq!(files.len(), 1);
        assert!(files[0].path.ends_with("a.md"));
    }
}
