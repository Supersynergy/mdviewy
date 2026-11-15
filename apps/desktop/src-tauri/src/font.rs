pub mod cmd {
    use font_kit::source::SystemSource;
    use tauri::command;

    #[command]
    pub fn font_list() -> Vec<String> {
        let source = SystemSource::new();

        source.all_families().unwrap_or_else(|e| {
            tracing::warn!("font_list: all_families failed: {e}");
            Vec::new()
        })
    }
}
