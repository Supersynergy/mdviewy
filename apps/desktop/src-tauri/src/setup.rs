use crate::app::{conf::AppConf, window_manager};
use std::path::PathBuf;
use tauri::{utils::config::WebviewUrl, AppHandle, Emitter, WebviewWindowBuilder};

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

pub fn init(
    app_handle: AppHandle,
    opened_paths: Vec<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let _setup_start = std::time::Instant::now();
    eprintln!("[BOOT] setup::init start");

    // 首先检查是否已经存在窗口
    if let Some(existing_window) = window_manager::get_last_opened_window(&app_handle) {
        let script = window_manager::opened_urls_initialization_script(&opened_paths, true);
        let _ = existing_window.eval(&script);
        let _ = existing_window.emit("opened-urls", opened_paths.clone());

        // 确保窗口被聚焦 — unminimize first: a Dock-minimized window stays
        // hidden even when set_focus nominally succeeds.
        let _ = existing_window.unminimize();
        let _ = existing_window.set_focus();
        return Ok(());
    }

    let theme = AppConf::theme_mode(&app_handle.clone());

    let main_win = WebviewWindowBuilder::new(
        &app_handle,
        "main".to_string(),
        WebviewUrl::App("index.html".into()),
    )
    .initialization_script(window_manager::opened_urls_initialization_script(
        &opened_paths,
        false,
    ))
    .title("mdviewy")
    .resizable(true)
    .fullscreen(false)
    .theme(Some(theme))
    .inner_size(1200.0, 800.0)
    .min_inner_size(400.0, 400.0);

    #[cfg(target_os = "macos")]
    let main_win = main_win.title_bar_style(TitleBarStyle::Transparent);

    let window = main_win.build()?;
    eprintln!(
        "[BOOT] window built at {}ms",
        _setup_start.elapsed().as_millis()
    );

    // Vibrancy is purely cosmetic and NSVisualEffectView attach is 8-15ms
    // synchronous. Queue it on the AppKit main thread — apply_vibrancy
    // requires it (returns NotMainThread on a tokio worker; this init also
    // runs off-main for the single-instance callback path).
    #[cfg(target_os = "macos")]
    {
        let win_for_vib = window.clone();
        let _ = app_handle.run_on_main_thread(move || {
            if let Err(e) = apply_vibrancy(
                &win_for_vib,
                NSVisualEffectMaterial::HudWindow,
                Some(NSVisualEffectState::Active),
                Some(12.0),
            ) {
                tracing::warn!("window vibrancy skipped: {e}");
            }
        });
    }

    // 将初始窗口添加到全局窗口实例缓存中
    let window_label = window.label().to_string();
    let workspace_path = opened_paths.first().cloned().unwrap_or_default();

    // 存储窗口实例信息到全局缓存 — only directories are workspaces; a file
    // path here would make check_window_by_path dedup windows on a document.
    if !workspace_path.is_empty() && PathBuf::from(&workspace_path).is_dir() {
        use crate::WINDOW_INSTANCES;

        let mut instances = WINDOW_INSTANCES
            .lock()
            .map_err(|e| format!("Failed to lock window instances: {}", e))?;
        instances.insert(window_label.clone(), PathBuf::from(workspace_path));
    }

    window_manager::record_last_window_label(&window_label);

    Ok(())
}
