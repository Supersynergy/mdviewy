use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum FileType {
    Unknown,
    Markdown,
    Image,
    Json,
    Txt,
    Code,
    Rtf,
    Pdf,
    Directory,
}

const IMAGE_EXTS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "webp", "bmp", "avif", "ico", "tif", "tiff",
];

// Kept in sync with the frontend's CODE_EXTENSIONS in
// apps/desktop/src/helper/fileTypeHandler.ts — the workspace tree and the
// editor must agree on what's openable.
const CODE_EXTS: &[&str] = &[
    "js",
    "mjs",
    "cjs",
    "jsx",
    "ts",
    "mts",
    "cts",
    "tsx",
    "py",
    "pyw",
    "pyx",
    "rs",
    "go",
    "java",
    "c",
    "h",
    "cpp",
    "c++",
    "cc",
    "cxx",
    "hpp",
    "h++",
    "hh",
    "hxx",
    "cs",
    "fs",
    "rb",
    "rbx",
    "php",
    "php3",
    "php4",
    "php5",
    "php7",
    "phtml",
    "swift",
    "kt",
    "kts",
    "scala",
    "sc",
    "lua",
    "pl",
    "pm",
    "r",
    "jl",
    "dart",
    "ex",
    "exs",
    "erl",
    "hrl",
    "hs",
    "clj",
    "cljc",
    "cljs",
    "edn",
    "elm",
    "d",
    "cr",
    "groovy",
    "gradle",
    "hx",
    "ml",
    "mli",
    "html",
    "htm",
    "xhtml",
    "handlebars",
    "hbs",
    "xml",
    "xsl",
    "xsd",
    "dtd",
    "css",
    "scss",
    "sass",
    "less",
    "gss",
    "styl",
    "vue",
    "liquid",
    "j2",
    "jinja",
    "jinja2",
    "jsonc",
    "json5",
    "jsonld",
    "yaml",
    "yml",
    "toml",
    "ini",
    "cfg",
    "conf",
    "properties",
    "env",
    "sh",
    "bash",
    "zsh",
    "ps1",
    "bat",
    "cmd",
    "sql",
    "cql",
    "pls",
    "prql",
    "sparql",
    "diff",
    "patch",
    "dockerfile",
    "cmake",
    "mk",
    "wat",
    "wast",
    "tex",
    "sty",
    "v",
    "sv",
    "vhdl",
    "vim",
    "feature",
    "cypher",
    "asn",
    "asn1",
    "e",
    "forth",
    "fth",
    "4th",
    "f",
    "for",
    "f77",
    "f90",
    "f95",
    "s",
    "cob",
    "cpy",
    "dylan",
    "dyl",
    "factor",
    "lisp",
    "cl",
    "el",
    "mrc",
    "idl",
    "ls",
    "nsis",
    "nsh",
    "oz",
    "pig",
    "pas",
    "pp",
    "sol",
    "tcl",
    "vbs",
    "vb",
    "sieve",
    "nt",
    "brf",
];

const PLAIN_TEXT_EXTS: &[&str] = &[
    "txt", "text", "mdx", "log", "csv", "tsv", "asc", "me", "nfo", "out", "err", "lock", "graphql",
    "gql", "prisma", "proto", "thrift", "rego", "bicep", "tf", "hcl", "nomad", "service",
    "desktop", "po", "pot", "rst", "adoc", "org", "srt", "vtt", "ics", "vcf", "wkt", "ndjson",
    "jsonl",
];

fn extension_of(file_name: &str) -> &str {
    let name = file_name.rsplit(['/', '\\']).next().unwrap_or(file_name);
    match name.rfind('.') {
        Some(i) if i > 0 => &name[i + 1..],
        _ => "",
    }
}

pub fn get_file_type(file_name: &str) -> FileType {
    let ext = extension_of(file_name).to_lowercase();
    let lower_name = file_name.to_lowercase();

    if ext == "md" || ext == "markdown" {
        FileType::Markdown
    } else if IMAGE_EXTS.contains(&ext.as_str()) {
        FileType::Image
    } else if ext == "json" {
        FileType::Json
    } else if ext == "rtf" {
        FileType::Rtf
    } else if ext == "pdf" {
        FileType::Pdf
    } else if CODE_EXTS.contains(&ext.as_str()) {
        FileType::Code
    } else if PLAIN_TEXT_EXTS.contains(&ext.as_str())
        || matches!(
            lower_name.rsplit(['/', '\\']).next().unwrap_or(""),
            "dockerfile"
                | "makefile"
                | "gnumakefile"
                | "cmakelists.txt"
                | "rakefile"
                | "gemfile"
                | "podfile"
                | "brewfile"
                | "vagrantfile"
                | "justfile"
                | "procfile"
                | ".gitignore"
                | ".dockerignore"
                | ".gitattributes"
                | ".gitmodules"
                | ".npmrc"
                | ".editorconfig"
                | ".env"
                | ".zshrc"
                | ".bashrc"
                | ".zprofile"
                | ".profile"
                | ".prettierrc"
                | ".eslintrc"
                | ".babelrc"
                | "license"
                | "licence"
                | "copying"
                | "changelog"
                | "authors"
                | "contributors"
                | "notice"
        )
    {
        FileType::Txt
    } else {
        FileType::Unknown
    }
}

pub fn is_supported_file_name(file_name: &str) -> bool {
    let file_type = get_file_type(file_name);
    file_type != FileType::Unknown
}

pub fn is_md_file_name(file_name: &str) -> bool {
    matches!(get_file_type(file_name), FileType::Markdown)
}

pub fn move_files(source_paths: &Vec<PathBuf>, dest_path: &Path) {
    let options = fs_extra::dir::CopyOptions::new();

    if !dest_path.exists() {
        fs::create_dir(dest_path).expect("Cannot create destination directory");
    }

    let dest = dest_path.to_str().unwrap().to_string();
    let mut sources: Vec<String> = Vec::new();

    for path in source_paths {
        sources.push(path.to_str().unwrap().to_string());
    }

    fs_extra::move_items(&sources, &dest, &options)
        .unwrap_or_else(|_| panic!("Failed to move files to {}", dest));
}

pub fn get_relative_path(path: &Path, base_path: &Path) -> PathBuf {
    let mut relative_path = PathBuf::new();

    for component in path.components() {
        if component == std::path::Component::Normal("..".as_ref()) {
            relative_path.pop();
        } else if component != std::path::Component::Normal(".".as_ref()) {
            relative_path.push(component);
        }
    }

    relative_path.strip_prefix(base_path).unwrap().to_path_buf()
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_md_file_name() {
        assert!(super::is_md_file_name("test.md"));
        assert!(!super::is_md_file_name("test.txt"));
        assert!(!super::is_md_file_name("test.mdx"));
    }

    #[test]
    fn test_get_file_type_edges() {
        use super::{get_file_type, FileType};
        // case-insensitive extension matching
        assert_eq!(get_file_type("README.MD"), FileType::Markdown);
        assert_eq!(get_file_type("note.Markdown"), FileType::Markdown);
        assert_eq!(get_file_type("PHOTO.PNG"), FileType::Image);
        assert_eq!(get_file_type("data.JSON"), FileType::Json);
        assert_eq!(get_file_type("log.TXT"), FileType::Txt);
        // universal-workspace formats
        assert_eq!(get_file_type("doc.RTF"), FileType::Rtf);
        assert_eq!(get_file_type("paper.pdf"), FileType::Pdf);
        assert_eq!(get_file_type("main.rs"), FileType::Code);
        assert_eq!(get_file_type("app.TSX"), FileType::Code);
        assert_eq!(get_file_type("notes.mdx"), FileType::Txt);
        assert_eq!(get_file_type(".gitignore"), FileType::Txt);
        assert_eq!(get_file_type("Dockerfile"), FileType::Txt);
        // non-file-ish / edge inputs must not misclassify
        assert_eq!(get_file_type(""), FileType::Unknown);
        assert_eq!(get_file_type("foo-bar-baz"), FileType::Unknown);
        assert_eq!(get_file_type("archive.tar.gz"), FileType::Unknown);
        assert_eq!(get_file_type("a.exe"), FileType::Unknown);
        // extension must be a suffix, not a substring
        assert_eq!(get_file_type("md.notes"), FileType::Unknown);
    }

    #[test]
    fn test_is_supported_file_name() {
        assert!(super::is_supported_file_name("a.md"));
        assert!(super::is_supported_file_name("a.json"));
        assert!(super::is_supported_file_name("a.txt"));
        assert!(super::is_supported_file_name("a.png"));
        assert!(!super::is_supported_file_name("a.exe"));
        assert!(!super::is_supported_file_name(""));
    }

    #[test]
    fn test_get_relative_path() {
        let path = std::path::Path::new("/a/b/c/d");
        let base_path = std::path::Path::new("/a/b");

        let relative_path = super::get_relative_path(path, base_path);

        assert_eq!(relative_path.to_str().unwrap(), "c/d");
    }
}
