//! Boot diagnostics: persistent file logging + a panic hook that writes to
//! disk. Release builds use `panic = "unwind"` (a task panic used to abort
//! the whole process — see CHANGELOG), and GUI launches have no usable
//! stderr, so the default panic printer frequently can't report anything.
//! Every panic and every boot milestone lands in `diagnostics_dir()`.

use std::{
    fs::{File, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::{Arc, Mutex},
};

/// Must not go through `conf::app_root()` — a panic inside app_root is
/// exactly the case this path exists to record (app_root used to panic when
/// called before `.setup()` populated APP_DIR).
pub fn diagnostics_dir() -> PathBuf {
    #[cfg(target_os = "macos")]
    if let Some(home) = std::env::home_dir() {
        return home.join("Library").join("Logs").join("mdviewy");
    }
    std::env::temp_dir().join("mdviewy-logs")
}

fn open_append(dir: &PathBuf, name: &str) -> std::io::Result<File> {
    std::fs::create_dir_all(dir)?;
    let path = dir.join(name);
    // Cheap rotation: once a log passes 4 MB, move it aside so files stay
    // greppable and disk usage is bounded.
    if std::fs::metadata(&path)
        .map(|m| m.len() > 4 * 1024 * 1024)
        .unwrap_or(false)
    {
        let _ = std::fs::rename(&path, dir.join(format!("{name}.old")));
    }
    OpenOptions::new().create(true).append(true).open(path)
}

fn append_line(dir: &PathBuf, name: &str, line: &str) -> bool {
    match open_append(dir, name) {
        Ok(mut f) => writeln!(f, "{line}").is_ok(),
        Err(_) => false,
    }
}

/// Writes every panic to `panic.log` with thread, location and a backtrace,
/// then lets unwinding continue. Deliberately never touches stderr and never
/// calls the default hook — its stderr write is what turned task panics into
/// unreadable aborts on console-less launches.
pub fn install_panic_hook() {
    let dir = diagnostics_dir();
    let started = std::time::Instant::now();
    std::panic::set_hook(Box::new(move |info| {
        let thread = std::thread::current();
        let thread_name = thread.name().unwrap_or("<unnamed>");
        let location = info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "<unknown>".to_string());
        let payload = info
            .payload()
            .downcast_ref::<&str>()
            .map(|s| (*s).to_string())
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "<non-string payload>".to_string());
        let payload = payload.chars().take(2000).collect::<String>();
        let backtrace = std::backtrace::Backtrace::force_capture();
        let line = format!(
            "{} [PANIC] v{} +{}ms thread='{}' at {}: {}\n{}",
            chrono::Local::now().to_rfc3339(),
            env!("CARGO_PKG_VERSION"),
            started.elapsed().as_millis(),
            thread_name,
            location,
            payload,
            backtrace,
        );
        let _ = append_line(&dir, "panic.log", &line);
    }));
}

/// Tee writer: every tracing event goes to the log file AND stdout, so
/// `bun run dev` keeps console output while packaged builds get a durable
/// file. Write failures are swallowed — a dead stdout/stderr must never
/// take the process down.
struct Tee {
    file: Arc<Mutex<File>>,
}

impl Write for Tee {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        let _ = std::io::stdout().write_all(buf);
        if let Ok(mut f) = self.file.lock() {
            let _ = f.write_all(buf);
        }
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        let _ = std::io::stdout().flush();
        if let Ok(mut f) = self.file.lock() {
            let _ = f.flush();
        }
        Ok(())
    }
}

#[derive(Clone)]
struct LogMaker {
    file: Arc<Mutex<File>>,
}

impl<'a> tracing_subscriber::fmt::MakeWriter<'a> for LogMaker {
    type Writer = Tee;

    fn make_writer(&'a self) -> Self::Writer {
        Tee {
            file: self.file.clone(),
        }
    }
}

/// Persists frontend (webview/JS) failures to `frontend.log`. A JS error
/// before React mounts — or a dead renderer — produces a white window with
/// zero trace in mdviewy.log, because the webview cannot reach tracing.
#[tauri::command]
pub fn frontend_diag_log(message: String) {
    let msg: String = message.chars().take(2000).collect();
    let line = format!("{} [WEB] {}", chrono::Local::now().to_rfc3339(), msg);
    let _ = append_line(&diagnostics_dir(), "frontend.log", &line);
}

struct Heartbeat {
    seen: std::time::Instant,
    strikes: u8,
}

fn heartbeats() -> &'static Mutex<std::collections::HashMap<String, Heartbeat>> {
    static HB: std::sync::OnceLock<Mutex<std::collections::HashMap<String, Heartbeat>>> =
        std::sync::OnceLock::new();
    HB.get_or_init(|| Mutex::new(std::collections::HashMap::new()))
}

/// Drop a destroyed window's heartbeat entry.
pub fn forget_window(label: &str) {
    if let Ok(mut map) = heartbeats().lock() {
        map.remove(label);
    }
}

/// The JS side emits `mdviewy:heartbeat` (payload: window label) every 10s.
/// A silent-but-visible window means the WebContent process died or the
/// event loop is blocked — the classic "white window" with the Rust process
/// still alive. Recovery ladder: reload the page (fixes a wedged page),
/// then restart the app (a dead renderer ignores eval).
pub fn spawn_webview_watchdog(app: tauri::AppHandle) {
    use std::time::{Duration, Instant};
    use tauri::{Listener, Manager};

    app.listen("mdviewy:heartbeat", |event| {
        if let Ok(label) = serde_json::from_str::<String>(event.payload()) {
            if let Ok(mut map) = heartbeats().lock() {
                map.entry(label)
                    .or_insert_with(|| Heartbeat {
                        seen: Instant::now(),
                        strikes: 0,
                    })
                    .seen = Instant::now();
            }
        }
    });

    tauri::async_runtime::spawn(async move {
        const INTERVAL: Duration = Duration::from_secs(30);
        const DEAD_AFTER: Duration = Duration::from_secs(150);
        loop {
            tokio::time::sleep(INTERVAL).await;
            let now = Instant::now();
            for (label, window) in app.webview_windows() {
                // Hidden/minimized windows are App-Nap candidates — their
                // timers legitimately stop; that is not a dead renderer.
                if !window.is_visible().unwrap_or(false) || window.is_minimized().unwrap_or(false) {
                    continue;
                }
                let strikes = {
                    let mut map = match heartbeats().lock() {
                        Ok(m) => m,
                        Err(e) => e.into_inner(),
                    };
                    let hb = map.entry(label.clone()).or_insert_with(|| Heartbeat {
                        seen: now,
                        strikes: 0,
                    });
                    if now.duration_since(hb.seen) < DEAD_AFTER {
                        hb.strikes = 0;
                        0
                    } else {
                        hb.strikes += 1;
                        hb.strikes
                    }
                };
                if strikes == 0 {
                    continue;
                }
                if strikes >= 3 && window.is_focused().unwrap_or(false) {
                    tracing::error!(
                        "webview watchdog: '{label}' renderer unresponsive — restarting app"
                    );
                    app.restart();
                }
                tracing::warn!(
                    "webview watchdog: '{label}' heartbeat silent >{}s (strike {strikes}) — reloading",
                    DEAD_AFTER.as_secs()
                );
                let _ = window.eval("window.location.reload()");
            }
        }
    });
}

/// tracing → stdout + `mdviewy.log` (append, 4 MB rotation). Falls back to
/// stdout-only when the log dir is not writable.
pub fn init_tracing() {
    let dir = diagnostics_dir();
    let file = open_append(&dir, "mdviewy.log");
    let builder = tracing_subscriber::fmt()
        .with_ansi(false)
        .with_target(true)
        .with_max_level(tracing::Level::INFO);
    match file {
        Ok(f) => builder
            .with_writer(LogMaker {
                file: Arc::new(Mutex::new(f)),
            })
            .init(),
        Err(_) => builder.init(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn append_line_creates_dir_and_file() {
        let tmp = tempfile::tempdir().unwrap();
        let dir = tmp.path().join("nested/logs");
        assert!(append_line(&dir, "panic.log", "test line"));
        let content = std::fs::read_to_string(dir.join("panic.log")).unwrap();
        assert!(content.contains("test line"));
    }

    #[test]
    fn oversized_log_is_rotated() {
        let tmp = tempfile::tempdir().unwrap();
        let dir = tmp.path().to_path_buf();
        std::fs::write(dir.join("mdviewy.log"), vec![b'x'; 5 * 1024 * 1024]).unwrap();
        assert!(append_line(&dir, "mdviewy.log", "after rotation"));
        assert!(dir.join("mdviewy.log.old").exists());
        let content = std::fs::read_to_string(dir.join("mdviewy.log")).unwrap();
        assert_eq!(content.trim_end(), "after rotation");
    }
}
