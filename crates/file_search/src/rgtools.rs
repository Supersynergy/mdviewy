use grep::{
    printer::StandardBuilder,
    regex::RegexMatcherBuilder,
    searcher::{BinaryDetection, SearcherBuilder},
};
use ignore::WalkBuilder;
use std::{
    collections::HashSet,
    ffi::OsStr,
    ffi::OsString,
    fs::File,
    io::Write,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};

use crate::options::ContentOptions;

struct MyWrite {
    data: Vec<u8>,
}

pub const SEPARATOR: &str = r"\0\1\2\3\4";

#[derive(Default)]
pub struct ContentResults {
    pub results: Vec<String>,
    pub errors: Vec<String>,
}

const SKIPPED_DIRECTORY_NAMES: &[&str] = &[
    ".git",
    ".hg",
    ".svn",
    ".cache",
    ".next",
    ".nuxt",
    ".parcel-cache",
    ".pytest_cache",
    ".turbo",
    ".venv",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "target",
    "venv",
];

fn should_skip_entry_name(name: &OsStr) -> bool {
    name.to_str()
        .is_some_and(|name| SKIPPED_DIRECTORY_NAMES.contains(&name))
}

pub fn search_contents(
    pattern: &str,
    paths: &[OsString],
    allowed_files: Option<HashSet<String>>,
    ops: ContentOptions,
    must_stop: Arc<AtomicBool>,
) -> ContentResults {
    let case_insensitive = !ops.case_sensitive;
    let mut errors = vec![];
    let matcher = RegexMatcherBuilder::new()
        .case_insensitive(case_insensitive)
        .build(pattern);
    if matcher.is_err() {
        return ContentResults::default();
    }
    let matcher = matcher.unwrap();

    let mut searcher = SearcherBuilder::new()
        .binary_detection(BinaryDetection::quit(b'\x00'))
        .line_number(true)
        .build();

    let my_write = MyWrite { data: vec![] };
    let mut printer = StandardBuilder::new()
        .separator_field_match(SEPARATOR.as_bytes().to_vec())
        .build_no_color(my_write);

    if let Some(allowed_files) = allowed_files {
        for path in allowed_files {
            let file = File::open(&path);
            if file.is_err() {
                continue;
            }
            let file = file.unwrap();
            let result =
                searcher.search_file(&matcher, &file, printer.sink_with_path(&matcher, &path));
            if let Err(err) = result {
                errors.push(err.to_string());
            }
        }
    } else {
        for path in paths {
            let walker = WalkBuilder::new(path)
                .hidden(true)
                .git_ignore(true)
                .git_global(true)
                .git_exclude(true)
                .follow_links(false)
                .filter_entry(|entry| !should_skip_entry_name(entry.file_name()))
                .build();

            for result in walker {
                if must_stop.load(Ordering::Relaxed) {
                    return ContentResults::default();
                }

                let dent = match result {
                    Ok(dent) => dent,
                    Err(err) => {
                        errors.push(err.to_string());
                        continue;
                    }
                };

                if !dent
                    .file_type()
                    .is_some_and(|file_type| file_type.is_file())
                {
                    continue;
                }
                let result = searcher.search_path(
                    &matcher,
                    dent.path(),
                    printer.sink_with_path(&matcher, dent.path()),
                );
                if let Err(err) = result {
                    errors.push(err.to_string());
                }
            }
        }
    }
    ContentResults {
        results: printer
            .into_inner()
            .into_inner()
            .string()
            .split('\n')
            .map(|x| x.to_string())
            .collect(),
        errors,
    }
}
impl MyWrite {
    pub fn string(&self) -> String {
        String::from_utf8_lossy(&self.data).to_string()
    }
}

impl Write for MyWrite {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.data.extend_from_slice(buf);
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs, sync::atomic::AtomicBool};

    #[test]
    fn content_search_prunes_vendor_and_build_dirs() {
        let tmp = tempfile::tempdir().unwrap();
        let root = tmp.path();
        fs::create_dir(root.join("docs")).unwrap();
        fs::write(root.join("docs").join("guide.md"), "needle").unwrap();
        fs::create_dir(root.join("node_modules")).unwrap();
        fs::write(root.join("node_modules").join("hidden.md"), "needle").unwrap();
        fs::create_dir(root.join("target")).unwrap();
        fs::write(root.join("target").join("build.md"), "needle").unwrap();

        let results = search_contents(
            "needle",
            &[root.as_os_str().to_os_string()],
            None,
            ContentOptions::default(),
            Arc::new(AtomicBool::new(false)),
        );

        assert_eq!(
            results
                .results
                .iter()
                .filter(|line| line.contains("needle"))
                .count(),
            1
        );
        assert!(results.results.iter().any(|line| line.contains("guide.md")));
        assert!(!results
            .results
            .iter()
            .any(|line| line.contains("node_modules")));
        assert!(!results.results.iter().any(|line| line.contains("target")));
    }
}
