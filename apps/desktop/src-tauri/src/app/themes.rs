use super::conf;
use crate::fc::exists;
use serde::{Deserialize, Serialize};
use std::{fs::create_dir_all, path::PathBuf, vec};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Theme {
    pub id: String,
    pub path: String,
    pub pkg: String,
    pub script_text: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LocalTheme {
    pub id: String,
    pub name: String,
    pub path: String,
    pub css_content: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppThemes {
    themes: Vec<Theme>,
    local_themes: Vec<LocalTheme>,
}
pub const APP_THEMES_PATH: &str = "themes";
pub const APP_LOCAL_THEMES_PATH: &str = "local_themes";

fn build_theme(path: PathBuf) -> Option<Theme> {
    tracing::debug!("build_theme: {:?}", path);
    let pkg_path = path.join("package.json");
    let script_file_path = path.join("index.js");

    if !exists(&pkg_path) {
        return None;
    }

    // A malformed or unreadable theme must be skipped, not crash the app —
    // this runs inside a tauri command on a tokio worker where a panic is
    // fatal for the whole process.
    let pkg = match std::fs::read_to_string(&pkg_path) {
        Ok(pkg) => pkg,
        Err(e) => {
            tracing::warn!("theme {:?}: package.json unreadable: {e}", path);
            return None;
        }
    };
    let pkg: serde_json::Value = match serde_json::from_str(&pkg) {
        Ok(pkg) => pkg,
        Err(e) => {
            tracing::warn!("theme {:?}: package.json invalid: {e}", path);
            return None;
        }
    };
    let pkg = pkg.to_string();

    let script_text = if exists(&script_file_path) {
        match std::fs::read_to_string(&script_file_path) {
            Ok(text) => Some(text),
            Err(e) => {
                tracing::warn!("theme {:?}: index.js unreadable: {e}", path);
                None
            }
        }
    } else {
        None
    };

    Some(Theme {
        id: path.file_name()?.to_str()?.to_string(),
        path: path.to_str()?.to_string(),
        pkg,
        script_text,
    })
}

impl AppThemes {
    pub fn new() -> Self {
        Self {
            themes: vec![],
            local_themes: vec![],
        }
    }

    pub fn dir_path() -> PathBuf {
        conf::app_root().join(APP_THEMES_PATH)
    }

    pub fn local_themes_dir_path() -> PathBuf {
        conf::app_root().join(APP_LOCAL_THEMES_PATH)
    }

    fn build_local_theme(path: &PathBuf) -> Option<LocalTheme> {
        if path.extension().and_then(|e| e.to_str()) != Some("css") {
            return None;
        }
        let file_name = path.file_stem()?.to_str()?.to_string();
        let css_content = std::fs::read_to_string(path).ok()?;
        Some(LocalTheme {
            id: file_name.clone(),
            name: file_name,
            path: path.to_str()?.to_string(),
            css_content,
        })
    }

    pub async fn init(self) -> Self {
        self.init_in(Self::dir_path(), Self::local_themes_dir_path())
            .await
    }

    /// Directory-injected variant so tests can point at a tempdir and so a
    /// missing/unreadable parent degrades to "no themes" instead of a panic.
    async fn init_in(mut self, dir: PathBuf, local_dir: PathBuf) -> Self {
        for d in [&dir, &local_dir] {
            if !exists(d) {
                // create_dir_all — plain create_dir fails when the parent
                // doesn't exist yet, which is exactly the fresh-boot case.
                if let Err(e) = create_dir_all(d) {
                    tracing::warn!("theme dir {:?} not creatable: {e}", d);
                }
            }
        }

        let mut themes = vec![];
        match std::fs::read_dir(&dir) {
            Ok(entries) => {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if !path.is_dir() {
                        continue;
                    }
                    if let Some(theme) = build_theme(path) {
                        themes.push(theme);
                    }
                }
            }
            Err(e) => tracing::warn!("theme dir {:?} unreadable: {e}", dir),
        }

        let mut local_themes = vec![];
        match std::fs::read_dir(&local_dir) {
            Ok(entries) => {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if !path.is_file() {
                        continue;
                    }
                    if let Some(local_theme) = Self::build_local_theme(&path) {
                        local_themes.push(local_theme);
                    }
                }
            }
            Err(e) => tracing::warn!("local theme dir {:?} unreadable: {e}", local_dir),
        }

        self.themes = themes;
        self.local_themes = local_themes;

        self
    }
}

impl Default for AppThemes {
    fn default() -> Self {
        Self::new()
    }
}

pub mod cmd {
    use super::{AppThemes, LocalTheme, Theme};
    use crate::fc::exists;
    use download_npm;
    use std::fs::create_dir_all;
    use std::path::PathBuf;
    use tauri::command;

    #[command]
    pub async fn load_themes() -> Vec<Theme> {
        AppThemes::default().init().await.themes
    }

    #[command]
    pub async fn load_local_themes() -> Vec<LocalTheme> {
        AppThemes::default().init().await.local_themes
    }

    #[command]
    pub async fn import_local_theme(file_path: String) -> Result<LocalTheme, String> {
        let source_path = PathBuf::from(&file_path);

        if !source_path.exists() {
            return Err("File does not exist".to_string());
        }

        if source_path.extension().and_then(|e| e.to_str()) != Some("css") {
            return Err("Only CSS files are supported".to_string());
        }

        let file_name = source_path
            .file_stem()
            .ok_or("Invalid file name")?
            .to_str()
            .ok_or("Invalid file name encoding")?
            .to_string();

        let dest_dir = AppThemes::local_themes_dir_path();

        if !exists(&dest_dir) {
            create_dir_all(&dest_dir)
                .map_err(|e| format!("Failed to create theme directory: {}", e))?;
        }

        let dest_path = dest_dir.join(format!("{}.css", file_name));

        std::fs::copy(&source_path, &dest_path)
            .map_err(|e| format!("Failed to copy file: {}", e))?;

        let css_content = std::fs::read_to_string(&dest_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;

        Ok(LocalTheme {
            id: file_name.clone(),
            name: file_name,
            path: dest_path
                .to_str()
                .ok_or("Invalid destination path encoding")?
                .to_string(),
            css_content,
        })
    }

    #[command]
    pub async fn remove_local_theme(id: String) -> Result<(), String> {
        let local_themes = AppThemes::default().init().await.local_themes;

        let theme = local_themes.iter().find(|t| t.id == id);

        if let Some(theme) = theme {
            let path = PathBuf::from(&theme.path);
            if path.exists() {
                std::fs::remove_file(&path).map_err(|e| format!("Failed to remove file: {}", e))?;
            }
        }

        Ok(())
    }

    #[command]
    pub async fn download_theme(name: String) -> Result<(), String> {
        let dir_path = AppThemes::dir_path();
        // Handle invalid path encoding to prevent runtime panics and provide debug context
        let dest_path = dir_path
            .to_str()
            .ok_or_else(|| {
                let err_msg = format!("Invalid theme directory path: {:?}", dir_path);
                tracing::error!("{}", err_msg);
                err_msg
            })?
            .to_string();

        download_npm::download(
            &name,
            download_npm::DownloadOptions {
                untar: true,
                dest_path,
            },
        )
        .await
        .map_err(|e| {
            // Log the detailed error for debugging purposes while returning a user-friendly message
            let err_msg = format!("Failed to download theme '{}': {}", name, e);
            tracing::error!("{}", err_msg);
            err_msg
        })?;

        Ok(())
    }

    #[command]
    pub async fn remove_theme(name: String) -> Result<(), String> {
        let dir_path = AppThemes::dir_path();
        let theme_path = dir_path.join(&name);

        if !theme_path.exists() {
            return Err(format!("Theme '{}' not found", name));
        }

        std::fs::remove_dir_all(&theme_path).map_err(|e| {
            let err_msg = format!("Failed to remove theme '{}': {}", name, e);
            tracing::error!("{}", err_msg);
            err_msg
        })?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::AppThemes;

    #[tokio::test]
    async fn init_creates_missing_dirs_with_missing_parents() {
        // Fresh-boot case: neither the theme dir nor its parent exists —
        // plain create_dir used to fail here and read_dir then panicked.
        let tmp = tempfile::tempdir().unwrap();
        let themes_dir = tmp.path().join("deep/nested/themes");
        let local_dir = tmp.path().join("deep/nested/local_themes");

        let t = AppThemes::default()
            .init_in(themes_dir.clone(), local_dir.clone())
            .await;

        assert!(t.themes.is_empty());
        assert!(t.local_themes.is_empty());
        assert!(themes_dir.is_dir());
        assert!(local_dir.is_dir());
    }

    #[tokio::test]
    async fn init_skips_malformed_theme_instead_of_panicking() {
        let tmp = tempfile::tempdir().unwrap();
        let themes_dir = tmp.path().join("themes");
        let bad = themes_dir.join("broken-theme");
        std::fs::create_dir_all(&bad).unwrap();
        std::fs::write(bad.join("package.json"), "{not json").unwrap();
        // A theme dir without package.json at all must also be skipped.
        std::fs::create_dir_all(themes_dir.join("empty-theme")).unwrap();
        // A stray file in the themes dir is not a theme.
        std::fs::write(themes_dir.join("README.md"), "x").unwrap();

        let local_dir = tmp.path().join("local_themes");
        std::fs::create_dir_all(&local_dir).unwrap();
        std::fs::write(local_dir.join("ok.css"), "body{}").unwrap();
        // Invalid UTF-8 CSS is skipped, not fatal.
        std::fs::write(local_dir.join("bad.css"), [0xff, 0xfe]).unwrap();
        // Non-css files are ignored.
        std::fs::write(local_dir.join("notes.txt"), "x").unwrap();

        let t = AppThemes::default().init_in(themes_dir, local_dir).await;

        assert!(t.themes.is_empty());
        assert_eq!(t.local_themes.len(), 1);
        assert_eq!(t.local_themes[0].id, "ok");
    }

    #[tokio::test]
    async fn init_survives_unreadable_theme_dir() {
        // read_dir on a path that exists but is a file (not a dir) errors —
        // must degrade to empty, not unwrap-panic.
        let tmp = tempfile::tempdir().unwrap();
        let not_a_dir = tmp.path().join("themes");
        std::fs::write(&not_a_dir, "oops").unwrap();
        let local_dir = tmp.path().join("local_themes");
        std::fs::create_dir_all(&local_dir).unwrap();

        let t = AppThemes::default().init_in(not_a_dir, local_dir).await;
        assert!(t.themes.is_empty());
        assert!(t.local_themes.is_empty());
    }
}
