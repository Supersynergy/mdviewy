pub mod cmd {
    use font_kit::source::SystemSource;
    use tauri::command;

    #[command]
    pub fn font_list() -> Vec<String> {
        let source = SystemSource::new();

        source.all_families().unwrap()
    }
}
