#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
#![allow(dead_code)]

mod app;
mod core_cmd;
mod fc;
mod font;
mod menu;
mod search;
mod setup;
mod task_system;

use std::path::PathBuf;
use std::sync;
use std::{collections::HashMap, sync::Mutex};

use app::{
    bookmarks, conf, extensions, file_watcher, keybindings, opened_cache, process, themes,
    window_manager, workspace,
};
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
}

struct OpenedPaths(Mutex<Vec<String>>);

fn opened_path_from_url(url: &url::Url) -> String {
    if url.scheme() == "file" {
        if let Ok(path) = url.to_file_path() {
            return path.to_string_lossy().into_owned();
        }
    }

    urlencoding::decode(url.as_str())
        .map(|s| s.into_owned())
        .unwrap_or_else(|_| url.as_str().to_string())
}

fn opened_path_from_arg(arg: &str, cwd: &str) -> Option<String> {
    let value = arg.trim();
    if value.is_empty() || value == "--" || value.starts_with("-psn_") {
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
    let mut paths = opened_paths.0.lock().unwrap();
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

    tracing_subscriber::fmt::init();
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
        .plugin(tauri_plugin_single_instance::init(
            |app_handle: &tauri::AppHandle, args: Vec<String>, _cwd: String| {
                let opened_paths = opened_paths_from_args(args.iter().skip(1), &_cwd);

                // 调用setup函数处理参数和窗口复用逻辑
                if let Err(e) = crate::setup::init(app_handle.clone(), opened_paths) {
                    println!("单例参数处理失败: {:?}", e);
                }
            },
        ))
        .invoke_handler(tauri::generate_handler![
            fc::cmd::open_folder,
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
            fc::cmd::convert_text,
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
            conf::cmd::open_conf_window,
            app::window_manager::create_new_window,
            app::window_manager::get_window_instances,
            app::window_manager::update_window_path,
            app::window_manager::check_window_by_path,
            app::window_manager::focus_window_by_label,
            keybindings::cmd::get_keyboard_infos,
            keybindings::cmd::update_keybinding,
            opened_cache::cmd::get_opened_cache,
            opened_cache::cmd::add_recent_workspace,
            opened_cache::cmd::clear_recent_workspaces,
            bookmarks::cmd::get_bookmarks,
            bookmarks::cmd::add_bookmark,
            bookmarks::cmd::edit_bookmark,
            bookmarks::cmd::remove_bookmark,
            search::cmd::search_files_async,
            extensions::cmd::extensions_init,
            process::app_exit,
            process::app_restart,
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
            file_watcher::cmd::stop_all_file_watchers,
            app::clipboard::get_clipboard_html,
            app::clipboard::get_clipboard_text,
            take_opened_paths,
            core_cmd::core_scan_folder,
            core_cmd::core_extract_meta,
            core_cmd::core_render_md,
            core_cmd::core_watch_folder,
            core_cmd::core_fts_index,
            core_cmd::core_fts_search,
            core_cmd::core_fts_delete,
        ])
        .setup(|app: &mut tauri::App| {
            app.manage(core_cmd::CoreState::default());

            let home_dir_path = app.path().home_dir().expect("failed to get home dir");
            APP_DIR.lock().unwrap().insert(0, home_dir_path);

            let opened_paths: State<OpenedPaths> = app.state();
            let file_paths = opened_paths.inner().to_owned();

            #[cfg(any(windows, target_os = "linux"))]
            {
                // NOTICE: `args` may include URL protocol (`your-app-protocol://`) or arguments (`--`) if app supports them.
                let cwd = std::env::current_dir()
                    .ok()
                    .and_then(|p| p.to_str().map(|s| s.to_string()))
                    .unwrap_or_default();
                let paths = opened_paths_from_args(std::env::args().skip(1), &cwd);

                if !paths.is_empty() {
                    *file_paths.0.lock().unwrap() = paths;
                }
            }

            let opened_paths = file_paths.0.lock().unwrap().clone();

            setup::init(app.handle().clone(), opened_paths).expect("failed to setup app");

            #[cfg(target_os = "macos")]
            menu::generate_menu(app).expect("failed to generate menu");

            // Deferred plugins: spawn after window has been built so the
            // webview paints first. Network updater is intentionally disabled
            // until mdviewy owns a reliable release endpoint.
            let h = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                eprintln!("[BOOT] deferred plugins starting");
                let t = std::time::Instant::now();
                let _ = h.plugin(tauri_plugin_http::init());
                let _ = h.plugin(tauri_plugin_clipboard_manager::init());
                let _ = h.plugin(tauri_plugin_notification::init());
                eprintln!(
                    "[BOOT] deferred plugins done in {}ms",
                    t.elapsed().as_millis()
                );
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            let app = window.app_handle();
            let _ = app.save_window_state(StateFlags::all());

            if let tauri::WindowEvent::Destroyed = event {
                let window_label = window.label();
                if let Ok(mut instances) = WINDOW_INSTANCES.lock() {
                    instances.remove(window_label);
                    println!(
                        "Removed window '{}' from WINDOW_INSTANCES on close",
                        window_label
                    );
                }
            }
        })
        .build(context)
        .unwrap()
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls, .. } = event {
                let opened_paths = urls.iter().map(opened_path_from_url).collect::<Vec<_>>();
                let opened_paths_state = app.try_state::<OpenedPaths>();
                if let Some(u) = opened_paths_state {
                    *u.0.lock().unwrap() = opened_paths.clone();
                }

                println!("Processed opened paths: {:?}", opened_paths);

                if let Some(window) = window_manager::get_focused_window(app) {
                    use tauri::Emitter;
                    println!("Emitting to focused window: {}", window.label());
                    if let Ok(paths_json) = serde_json::to_string(&opened_paths) {
                        let _ = window.eval(&format!("window.openedUrls = {paths_json};"));
                    }
                    let result = window.emit("opened-urls", opened_paths.clone());
                    println!("Emit result: {:?}", result);
                } else {
                    if let Some(window) = window_manager::get_last_opened_window(app) {
                        use tauri::Emitter;
                        println!("Emitting to last opened window: {}", window.label());
                        if let Ok(paths_json) = serde_json::to_string(&opened_paths) {
                            let _ = window.eval(&format!("window.openedUrls = {paths_json};"));
                        }
                        let result = window.emit("opened-urls", opened_paths.clone());
                        println!("Emit result: {:?}", result);
                    } else {
                        println!("No window found to emit event");
                    }
                }
            }
        });
}
