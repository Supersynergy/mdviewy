use crate::app::conf::AppConf;
use crate::app::keybindings::Keybindings;
use crate::app::opened_cache::OpenedCache;
use crate::app::window_manager::get_focused_window;
use tauri::menu::{Menu, MenuEvent, MenuItemBuilder, PredefinedMenuItem, Submenu};
use tauri::{App, AppHandle, Emitter, Manager, Runtime};

/// Prefix of the menu ids that carry a path, e.g. `app_openRecent:/docs/a.md`.
pub const OPEN_RECENT_PREFIX: &str = "app_openRecent:";
const MAX_MENU_RECENT_ENTRIES: usize = 20;

/// Builds `File ▸ Open Recent` from the persisted recent lists.
fn build_open_recent_submenu<R: Runtime, M: Manager<R>>(
    manager: &M,
) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
    let cache = OpenedCache::read();
    let mut entries: Vec<tauri::menu::MenuItem<R>> = Vec::new();

    for document in cache
        .recent_documents()
        .iter()
        .take(MAX_MENU_RECENT_ENTRIES)
    {
        entries.push(
            MenuItemBuilder::new(&document.name)
                .id(format!("{OPEN_RECENT_PREFIX}{}", document.path))
                .build(manager)?,
        );
    }

    let mut items: Vec<&dyn tauri::menu::IsMenuItem<R>> = Vec::new();
    let empty_item;

    if entries.is_empty() {
        empty_item = MenuItemBuilder::new("No recent documents")
            .id("app_noRecentDocuments")
            .enabled(false)
            .build(manager)?;
        items.push(&empty_item);
    } else {
        for entry in &entries {
            items.push(entry);
        }
    }

    let separator = PredefinedMenuItem::separator(manager)?;
    let clear_item = MenuItemBuilder::new("Clear Recent")
        .id("app_clearRecentDocuments")
        .build(manager)?;
    items.push(&separator);
    items.push(&clear_item);

    Ok(Submenu::with_items(manager, "Open Recent", true, &items)?)
}

pub fn generate_menu(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let _app_conf = AppConf::read_with_app(app.handle());
    let _keyboard_infos = Keybindings::read();

    // let is_dark = app_conf.clone().theme_check("dark");

    // let theme_menu_light_item = CheckMenuItemBuilder::new("Light")
    //     .checked(!is_dark)
    //     .id("theme_light")
    //     .build(app);
    // let theme_menu_dark_item = CheckMenuItemBuilder::new("Dark")
    //     .checked(is_dark)
    //     .id("theme_dark")
    //     .build(app);

    // let theme_submenu = &Submenu::with_items(
    //     app,
    //     "Theme",
    //     true,
    //     &[&theme_menu_light_item, &theme_menu_dark_item],
    // )?;

    let menu_handler = move |app: &AppHandle, event: MenuEvent| {
        let menu_id = event.id().as_ref();

        // 获取当前焦点窗口
        if let Some(window) = get_focused_window(app) {
            let focused_window_label = window.label();
            println!("focused_window: {}", focused_window_label);

            if let Some(path) = menu_id.strip_prefix(OPEN_RECENT_PREFIX) {
                app.emit_to(focused_window_label, "native:open_recent", path)
                    .map_err(|err| println!("{:?}", err))
                    .ok();
                return;
            }

            // One emit per item — ids that are not command ids are translated
            // here so the frontend's native:menu → command map stays clean.
            match menu_id {
                "About" => {
                    app.emit_to(focused_window_label, "app_about", ())
                        .map_err(|err| println!("{:?}", err))
                        .ok();
                }
                "Settings" => {
                    app.emit_to(focused_window_label, "native:menu", "app_openSetting")
                        .map_err(|err| println!("{:?}", err))
                        .ok();
                }
                _ => {
                    if let Err(err) = app.emit_to(focused_window_label, "native:menu", menu_id) {
                        tracing::error!("menu emit '{}' failed: {:?}", menu_id, err);
                    }
                }
            }
        } else {
            println!("No focused window found for menu event");
        }
    };

    let menu_items = build_menu(app)?;

    app.set_menu(menu_items)?;

    app.on_menu_event(menu_handler);

    Ok(())
}

/// Rebuilds and applies the menubar, e.g. after the recent lists changed.
pub fn refresh_menu(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let menu = build_menu(app)?;
    app.set_menu(menu)?;
    Ok(())
}

fn build_menu<R: Runtime, M: Manager<R>>(app: &M) -> Result<Menu<R>, Box<dyn std::error::Error>> {
    Ok(Menu::with_items(
        app,
        &[
            &Submenu::with_items(
                app,
                "mdviewy",
                true,
                &[
                    &MenuItemBuilder::new("About mdviewy")
                        .id("About")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Settings...")
                        .id("Settings")
                        .accelerator("CmdOrCtrl+,")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::show_all(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, Some("Quit mdviewy"))?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &MenuItemBuilder::new("New File")
                        .id("app_newFile")
                        .accelerator("CmdOrCtrl+N")
                        .build(app)?,
                    &MenuItemBuilder::new("New Window")
                        .id("app_newWindow")
                        .accelerator("CmdOrCtrl+Shift+N")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Open Folder...")
                        .id("app_openFolder")
                        .accelerator("CmdOrCtrl+O")
                        .build(app)?,
                    &MenuItemBuilder::new("Open File...")
                        .id("app_openFile")
                        .build(app)?,
                    &build_open_recent_submenu(app)?,
                    &MenuItemBuilder::new("Quick Open")
                        .id("app_openCommandPalette")
                        .accelerator("CmdOrCtrl+P")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Save")
                        .id("app_save")
                        .accelerator("CmdOrCtrl+S")
                        .build(app)?,
                    &MenuItemBuilder::new("Save As...")
                        .id("app_saveAs")
                        .accelerator("CmdOrCtrl+Shift+S")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Export as HTML")
                        .id("editor_export_html")
                        .build(app)?,
                    &MenuItemBuilder::new("Export as Image")
                        .id("editor_export_image")
                        .build(app)?,
                    &MenuItemBuilder::new("Print / Save as PDF")
                        .id("editor_print_pdf")
                        .accelerator("CmdOrCtrl+Shift+D")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Close Tab")
                        .id("app_closeCurrentEditorTab")
                        .accelerator("CmdOrCtrl+W")
                        .build(app)?,
                    &MenuItemBuilder::new("Close Window")
                        .id("app_closeWindow")
                        .accelerator("CmdOrCtrl+Shift+W")
                        .build(app)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Find and Replace")
                        .id("app_findReplaceEditor")
                        .accelerator("CmdOrCtrl+F")
                        .build(app)?,
                    &MenuItemBuilder::new("Find in Files...")
                        .id("app_findInFiles")
                        .accelerator("CmdOrCtrl+Shift+F")
                        .build(app)?,
                    &MenuItemBuilder::new("Find Next")
                        .id("app_findNext")
                        .accelerator("CmdOrCtrl+G")
                        .build(app)?,
                    &MenuItemBuilder::new("Find Previous")
                        .id("app_findPrev")
                        .accelerator("CmdOrCtrl+Shift+G")
                        .build(app)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "View",
                true,
                &[
                    &MenuItemBuilder::new("Command Palette")
                        .id("app_openCommandPalette")
                        .accelerator("CmdOrCtrl+K")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Toggle Left Sidebar")
                        .id("app_toggleLeftsidebarVisible")
                        .accelerator("CmdOrCtrl+B")
                        .build(app)?,
                    &MenuItemBuilder::new("Toggle Right Sidebar")
                        .id("app_toggleRightsidebarVisible")
                        .accelerator("CmdOrCtrl+Alt+B")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Toggle Editor Mode")
                        .id("app_toggleEditorType")
                        .accelerator("CmdOrCtrl+Shift+M")
                        .build(app)?,
                    &Submenu::with_items(
                        app,
                        "Editor Mode",
                        true,
                        &[
                            &MenuItemBuilder::new("Source")
                                .id("app_viewSourceCode")
                                .build(app)?,
                            &MenuItemBuilder::new("Pretty")
                                .id("app_viewWysiwyg")
                                .build(app)?,
                            &MenuItemBuilder::new("Preview")
                                .id("app_viewPreview")
                                .build(app)?,
                        ],
                    )?,
                    &MenuItemBuilder::new("Refresh Table of Contents")
                        .id("app:toc_refresh")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Zoom In")
                        .id("app_zoomIn")
                        .accelerator("CmdOrCtrl+Plus")
                        .build(app)?,
                    &MenuItemBuilder::new("Zoom Out")
                        .id("app_zoomOut")
                        .accelerator("CmdOrCtrl+-")
                        .build(app)?,
                    &MenuItemBuilder::new("Actual Size")
                        .id("app_zoomReset")
                        .accelerator("CmdOrCtrl+0")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Reset Layout")
                        .id("app_reset_layout")
                        .build(app)?,
                    &PredefinedMenuItem::fullscreen(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Go",
                true,
                &[
                    &MenuItemBuilder::new("Go to File...")
                        .id("app_goToFile")
                        .build(app)?,
                    &MenuItemBuilder::new("Go to Heading...")
                        .id("app_openHeadingJumper")
                        .accelerator("CmdOrCtrl+Shift+O")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Next Tab")
                        .id("app_nextTab")
                        .accelerator("CmdOrCtrl+Alt+Right")
                        .build(app)?,
                    &MenuItemBuilder::new("Previous Tab")
                        .id("app_prevTab")
                        .accelerator("CmdOrCtrl+Alt+Left")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Next Heading")
                        .id("app_nextHeading")
                        .accelerator("CmdOrCtrl+Down")
                        .build(app)?,
                    &MenuItemBuilder::new("Previous Heading")
                        .id("app_prevHeading")
                        .accelerator("CmdOrCtrl+Up")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Recent Files")
                        .id("app_showRecent")
                        .build(app)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, None)?,
                    &PredefinedMenuItem::maximize(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Toggle Left Sidebar")
                        .id("app_toggleLeftsidebarVisible")
                        .build(app)?,
                    &MenuItemBuilder::new("Toggle Right Sidebar")
                        .id("app_toggleRightsidebarVisible")
                        .build(app)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Help",
                true,
                &[
                    &MenuItemBuilder::new("mdviewy GitHub")
                        .id("app_openGithub")
                        .build(app)?,
                    &MenuItemBuilder::new("Report Issue")
                        .id("app_reportIssue")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemBuilder::new("Keyboard Shortcuts")
                        .id("app_openSetting")
                        .build(app)?,
                ],
            )?,
            // &Submenu::with_items(
            //     app,
            //     "View",
            //     true,
            //     &[
            //         &MenuItemBuilder::new("SourceCode View")
            //             .id("SourceCodeView")
            //             .build(app)?,
            //         &MenuItemBuilder::new("Wysiwyg View")
            //             .id("WysiwygView")
            //             .build(app)?,
            //     ],
            // )?,
        ],
    )?)
}
