use crate::app::conf::AppConf;
use crate::app::keybindings::Keybindings;
use crate::app::window_manager::get_focused_window;
use tauri::menu::{
    CheckMenuItem, CheckMenuItemBuilder, Menu, MenuEvent, MenuItem, MenuItemBuilder,
    PredefinedMenuItem, Submenu,
};
use tauri::{App, AppHandle, Emitter, Manager};

pub fn generate_menu(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let app_conf = AppConf::read_with_app(&app.handle());
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

            // 发送菜单事件到焦点窗口
            app.emit_to(&focused_window_label, "native:menu", menu_id)
                .expect("failed to emit");

            // 处理特定的菜单事件
            match menu_id {
                "About" => {
                    app.emit_to(&focused_window_label, "app_about", {})
                        .map_err(|err| println!("{:?}", err))
                        .ok();
                }
                "Settings" => {
                    app.emit_to(&focused_window_label, "native:menu", "app_openSetting")
                        .map_err(|err| println!("{:?}", err))
                        .ok();
                }
                _ => {}
            }
        } else {
            println!("No focused window found for menu event");
        }
    };

    let menu_items = Menu::with_items(
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
                    &MenuItemBuilder::new("Find")
                        .id("app_find")
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
                        .accelerator("CmdOrCtrl+Shift+E")
                        .build(app)?,
                    &MenuItemBuilder::new("Refresh TOC")
                        .id("app:toc_refresh")
                        .build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::fullscreen(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Go",
                true,
                &[
                    &MenuItemBuilder::new("Go to File...")
                        .id("app_openCommandPalette")
                        .accelerator("CmdOrCtrl+P")
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
                    &MenuItemBuilder::new("Recent Files")
                        .id("app_showRecent")
                        .accelerator("CmdOrCtrl+R")
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
    )?;

    app.set_menu(menu_items).expect("failed to set menu");

    app.on_menu_event(menu_handler);

    Ok(())
}
