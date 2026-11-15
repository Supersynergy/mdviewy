#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
#![allow(dead_code)]

mod app;
mod diagnostics;
mod fc;
mod font;
mod menu;
mod search;
mod setup;
mod task_system;

use std::path::PathBuf;
use std::sync;
use std::{collections::HashMap, sync::Mutex};

#[cfg(target_os = "macos")]
use app::window_manager;
use app::{bookmarks, conf, file_watcher, keybindings, opened_cache, speech, themes, workspace};
use lazy_static::lazy_static;
use tauri::{Manager, State};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

lazy_static! {
    /// FIXME Haven't found a better way to get the home dir yet, and we will optimize it later.
    /// 0 -> home_dr
    pub static ref APP_DIR: sync::Mutex<HashMap<u32, PathBuf>> = {
        let m = HashMap::new();
        sync::Mutex::new(m)
    };

    /// 窗口实例信息缓存，键为窗口标签，值为工作区路径
    pub static ref WINDOW_INSTANCES: sync::Mutex<HashMap<String, PathBuf>> = {
        let m = HashMap::new();
        sync::Mutex::new(m)
    };

    /// Most recently registered window label — HashMap has no insertion
    /// order, so "last opened" needs its own record.
    pub static ref LAST_WINDOW_LABEL: sync::Mutex<Option<String>> = sync::Mutex::new(None);
}

struct OpenedPaths(Mutex<Vec<String>>);

fn opened_path_from_url(url: &url::Url) -> String {
    if url.scheme() == "file" {
        if let Ok(path) = url.to_file_path() {
            return path.to_string_lossy().into_owned();
        }
    }

    // Deep links: `mdviewy://open?path=/abs/file.md` or `mdviewy:///abs/file.md`.
    // Agents can generate these without shelling out.
    if url.scheme() == "mdviewy" {
        for (key, value) in url.query_pairs() {
            if key == "path" {
                return value.into_owned();
            }
        }
        let host = url.host_str().unwrap_or_default();
        // `mdviewy://open` with no ?path= must not become a literal "open"
        // path — the verb is a route, not a file.
        if host == "open" && url.path().is_empty() {
            return String::new();
        }
        let combined = format!("{}{}", host, url.path());
        if !combined.is_empty() {
            return urlencoding::decode(&combined)
                .map(|s| s.into_owned())
                .unwrap_or(combined);
        }
    }

    urlencoding::decode(url.as_str())
        .map(|s| s.into_owned())
        .unwrap_or_else(|_| url.as_str().to_string())
}

fn opened_path_from_arg(arg: &str, cwd: &str) -> Option<String> {
    let value = arg.trim();
    // Skip CLI flags (-psn_ from Finder, --flags, -- separator). Without this,
    // `mdviewy --help`-style invocations become bogus paths and open failure
    // toasts in agents' hands.
    if value.is_empty() || value == "--" || value.starts_with('-') {
        return None;
    }

    if value.contains("://") {
        if let Ok(url) = url::Url::parse(value) {
            return Some(opened_path_from_url(&url));
        }
    }

    let path = PathBuf::from(value);
    let path = if path.is_absolute() {
        path
    } else {
        PathBuf::from(cwd).join(path)
    };

    Some(path.to_string_lossy().into_owned())
}

fn opened_paths_from_args<I, S>(args: I, cwd: &str) -> Vec<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter()
        .filter_map(|arg| opened_path_from_arg(arg.as_ref(), cwd))
        .collect()
}

#[tauri::command]
fn take_opened_paths(opened_paths: State<OpenedPaths>) -> Vec<String> {
    // Poisoned mutex must not kill the command — recover the queue instead.
    let mut paths = opened_paths.0.lock().unwrap_or_else(|e| e.into_inner());
    std::mem::take(&mut *paths)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 在 Linux 上禁用 DMA-BUF 渲染器
    // 否则无法在 Linux 上运行
    // 相同的bug: https://github.com/tauri-apps/tauri/issues/10702
    // 解决方案来源: https://github.com/clash-verge-rev/clash-verge-rev/blob/ae5b2cfb79423c7e76a281725209b812774367fa/src-tauri/src/lib.rs#L27-L28
    #[cfg(target_os = "linux")]
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

    // Panic hook first: it must be installed before anything can panic, so
    // even a failure inside tracing init lands in panic.log.
    diagnostics::install_panic_hook();
    diagnostics::init_tracing();
    tracing::info!("mdviewy v{} boot", env!("CARGO_PKG_VERSION"));
    dotenvy::dotenv().ok();

    let context = tauri::generate_context!();

    tauri::Builder::default()
        .manage(OpenedPaths(Default::default()))
        // Pre-window plugins — only those needed before/during the first
        // window build (path resolution, dialog, file/shell access).
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(
            |app_handle: &tauri::AppHandle, args: Vec<String>, _cwd: String| {
                let opened_paths = opened_paths_from_args(args.iter().skip(1), &_cwd);

                // Append, don't overwrite: two rapid opens before a frontend
                // drain must not lose the first batch, and a bare second
                // launch (empty args) must not wipe a pending queue.
                if !opened_paths.is_empty() {
                    if let Some(state) = app_handle.try_state::<OpenedPaths>() {
                        let mut queue = state.0.lock().unwrap_or_else(|e| e.into_inner());
                        for path in &opened_paths {
                            if !queue.contains(path) {
                                queue.push(path.clone());
                            }
                        }
                    }
                }

                // 调用setup函数处理参数和窗口复用逻辑
                // NOTE: this callback can run on a tokio worker before the
                // first .setup() has finished — nothing here may assume the
                // main window or APP_DIR registration exists.
                tracing::info!(
                    "single-instance callback: {} opened paths",
                    opened_paths.len()
                );
                if let Err(e) = crate::setup::init(app_handle.clone(), opened_paths) {
                    tracing::error!("single-instance setup failed: {:?}", e);
                }
            },
        ))
        .invoke_handler(tauri::generate_handler![
            diagnostics::frontend_diag_log,
            fc::cmd::open_folder_async,
            fc::cmd::get_file_content,
            fc::cmd::write_file,
            fc::cmd::write_u8_array_to_file,
            fc::cmd::read_u8_array_from_file,
            fc::cmd::delete_file,
            fc::cmd::copy_file_by_from,
            fc::cmd::create_folder,
            fc::cmd::delete_folder,
            fc::cmd::file_exists,
            fc::cmd::move_files_to_target_folder,
            fc::cmd::path_join,
            fc::cmd::get_md_relative_path,
            fc::cmd::rename_fs,
            fc::cmd::trash_delete,
            fc::cmd::export_html_to_path,
            fc::cmd::is_dir,
            fc::cmd::get_path_name,
            fc::cmd::get_file_normal_info,
            fc::cmd::copy_file,
            conf::cmd::get_app_conf,
            conf::cmd::reset_app_conf,
            conf::cmd::save_app_conf,
            app::window_manager::create_new_window,
            app::window_manager::update_window_path,
            app::window_manager::check_window_by_path,
            app::window_manager::focus_window_by_label,
            keybindings::cmd::get_keyboard_infos,
            keybindings::cmd::update_keybinding,
            opened_cache::cmd::get_opened_cache,
            opened_cache::cmd::add_recent_workspace,
            opened_cache::cmd::clear_recent_workspaces,
            opened_cache::cmd::add_recent_document,
            opened_cache::cmd::clear_recent_documents,
            opened_cache::cmd::refresh_native_menu,
            speech::cmd::speech_engines,
            speech::cmd::speech_speak,
            speech::cmd::speech_stop,
            bookmarks::cmd::get_bookmarks,
            bookmarks::cmd::add_bookmark,
            bookmarks::cmd::edit_bookmark,
            bookmarks::cmd::remove_bookmark,
            search::cmd::search_files_async,
            themes::cmd::load_themes,
            themes::cmd::download_theme,
            themes::cmd::remove_theme,
            themes::cmd::load_local_themes,
            themes::cmd::import_local_theme,
            themes::cmd::remove_local_theme,
            font::cmd::font_list,
            workspace::cmd::is_git_repository,
            file_watcher::cmd::watch_file,
            file_watcher::cmd::stop_file_watcher,
            app::clipboard::get_clipboard_html,
            app::clipboard::get_clipboard_text,
            take_opened_paths,
        ])
        .setup(|app: &mut tauri::App| {
            match app.path().home_dir() {
                Ok(home_dir_path) => {
                    APP_DIR
                        .lock()
                        .unwrap_or_else(|e| e.into_inner())
                        .insert(0, home_dir_path);
                }
                // Not fatal: app_root() falls back to std::env::home_dir().
                Err(e) => tracing::warn!("home_dir unavailable at setup: {e}"),
            }

            let opened_paths: State<OpenedPaths> = app.state();
            let file_paths = opened_paths.inner().to_owned();

            {
                // NOTICE: `args` may include URL protocol (`your-app-protocol://`) or arguments (`--`) if app supports them.
                // Runs on macOS too — direct binary launches
                // (`mdviewy file.md`, agent CLIs) must work; Finder opens
                // still arrive via RunEvent::Opened below.
                let cwd = std::env::current_dir()
                    .ok()
                    .and_then(|p| p.to_str().map(|s| s.to_string()))
                    .unwrap_or_default();
                let paths = opened_paths_from_args(std::env::args().skip(1), &cwd);

                if !paths.is_empty() {
                    *file_paths.0.lock().unwrap_or_else(|e| e.into_inner()) = paths;
                }
            }

            let opened_paths = file_paths
                .0
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .clone();

            // `?` unwinds the setup closure instead of panicking — tauri
            // reports a clean init error rather than an abort.
            setup::init(app.handle().clone(), opened_paths)?;

            #[cfg(target_os = "macos")]
            menu::generate_menu(app)?;

            // Deferred plugins: spawn after window has been built so the
            // webview paints first. Network updater is intentionally disabled
            // until mdviewy owns a reliable release endpoint.
            diagnostics::spawn_webview_watchdog(app.handle().clone());

            let h = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tracing::info!("[BOOT] deferred plugins starting");
                let t = std::time::Instant::now();
                if let Err(e) = h.plugin(tauri_plugin_http::init()) {
                    tracing::error!("plugin http init failed: {e}");
                }
                if let Err(e) = h.plugin(tauri_plugin_clipboard_manager::init()) {
                    tracing::error!("plugin clipboard init failed: {e}");
                }
                if let Err(e) = h.plugin(tauri_plugin_notification::init()) {
                    tracing::error!("plugin notification init failed: {e}");
                }
                tracing::info!(
                    "[BOOT] deferred plugins done in {}ms",
                    t.elapsed().as_millis()
                );
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // Persist window geometry once at shutdown — the previous version
            // wrote the state file on *every* window event (focus, move,
            // resize), a synchronous disk write on the runtime hot path.
            if matches!(
                event,
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed
            ) {
                let app = window.app_handle();
                let _ = app.save_window_state(StateFlags::all());
            }

            // A window vanishing is the "it just closed" report — log every
            // close/destroy so the next one is distinguishable from a crash.
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                tracing::info!("window '{}' close requested", window.label());
            }

            // Focus changes update recency — LAST_WINDOW_LABEL only knew
            // creation order before, so menu commands and warm opens could
            // route to a stale window.
            if let tauri::WindowEvent::Focused(true) = event {
                window_manager::record_last_window_label(window.label());

                // A restored position can reference a now-disconnected
                // external monitor — the window then opens off-screen and
                // reads as "the app opened and vanished". Pull it back.
                if let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) {
                    let on_screen =
                        window
                            .available_monitors()
                            .unwrap_or_default()
                            .iter()
                            .any(|m| {
                                let mp = m.position();
                                let ms = m.size();
                                pos.x < mp.x + ms.width as i32
                                    && pos.x + size.width as i32 > mp.x
                                    && pos.y < mp.y + ms.height as i32
                                    && pos.y + size.height as i32 > mp.y
                            });
                    if !on_screen {
                        tracing::warn!(
                            "window '{}' was restored off-screen — recentering",
                            window.label()
                        );
                        let _ = window.center();
                    }
                }
            }

            if let tauri::WindowEvent::Destroyed = event {
                let window_label = window.label();
                tracing::info!("window '{window_label}' destroyed");
                diagnostics::forget_window(window_label);
                if let Ok(mut instances) = WINDOW_INSTANCES.lock() {
                    instances.remove(window_label);
                    println!(
                        "Removed window '{}' from WINDOW_INSTANCES on close",
                        window_label
                    );
                }
                if let Ok(mut last) = LAST_WINDOW_LABEL.lock() {
                    if last.as_deref() == Some(window_label) {
                        *last = None;
                    }
                }
            }
        })
        .build(context)
        .unwrap_or_else(|e| {
            tracing::error!("app build failed: {e}");
            eprintln!("mdviewy failed to start: {e}");
            std::process::exit(1);
        })
        .run(|_app, _event| {
            match _event {
                tauri::RunEvent::ExitRequested { .. } => {
                    tracing::info!("app exit requested")
                }
                tauri::RunEvent::Exit => tracing::info!("app exiting"),
                _ => {}
            }
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls, .. } = _event {
                let opened_paths = urls.iter().map(opened_path_from_url).collect::<Vec<_>>();
                let opened_paths_state = _app.try_state::<OpenedPaths>();
                if let Some(u) = opened_paths_state {
                    let mut queue = u.0.lock().unwrap_or_else(|e| e.into_inner());
                    for path in &opened_paths {
                        if !queue.contains(path) {
                            queue.push(path.clone());
                        }
                    }
                }

                println!("Processed opened paths: {:?}", opened_paths);

                // get_focused_window already falls back to the last live
                // window; None here means the app runs with zero windows —
                // create one instead of dropping the file into a void queue.
                if let Some(window) = window_manager::get_focused_window(_app) {
                    use tauri::Emitter;
                    println!("Emitting to window: {}", window.label());
                    // Warm-instance file open (app already running, window not
                    // OS-focused/minimized): without unminimize+focus the file
                    // loads invisibly behind other apps — looks like "nothing
                    // happened" (verified 2026-07-05).
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                    let _ = window.eval(window_manager::opened_urls_initialization_script(
                        &opened_paths,
                        true,
                    ));
                    let result = window.emit("opened-urls", opened_paths.clone());
                    println!("Emit result: {:?}", result);
                } else {
                    println!("No live window — creating one for opened paths");
                    let handle = _app.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(e) = crate::setup::init(handle, opened_paths) {
                            eprintln!("Reopen window failed: {:?}", e);
                        }
                    });
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn args_skip_flags_and_keep_paths() {
        let paths = opened_paths_from_args(
            vec!["--help", "-psn_0_12345", "note.md", "/abs/x.pdf", "--", ""],
            "/cwd",
        );
        assert_eq!(paths, vec!["/cwd/note.md", "/abs/x.pdf"]);
    }

    #[test]
    fn url_decoding_covers_file_and_deep_link() {
        let file = url::Url::parse("file:///tmp/a%20b.md").unwrap();
        assert_eq!(opened_path_from_url(&file), "/tmp/a b.md");

        let deep = url::Url::parse("mdviewy://open?path=/tmp/x%20y.pdf").unwrap();
        assert_eq!(opened_path_from_url(&deep), "/tmp/x y.pdf");

        let deep2 = url::Url::parse("mdviewy:///tmp/plain.md").unwrap();
        assert_eq!(opened_path_from_url(&deep2), "/tmp/plain.md");
    }

    #[test]
    fn arg_accepts_deep_link_url() {
        let paths = opened_paths_from_args(vec!["mdviewy://open?path=%2Ftmp%2Fdoc.rtf"], "/cwd");
        assert_eq!(paths, vec!["/tmp/doc.rtf"]);
    }
}
