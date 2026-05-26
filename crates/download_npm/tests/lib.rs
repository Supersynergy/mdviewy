extern crate download_npm;

#[tokio::test]
#[ignore = "requires live npm registry network"]
async fn test_download() {
    const TEST_FOLDER: &str = "./tests/tar";
    let _ = download_npm::download(
        "react",
        download_npm::DownloadOptions {
            dest_path: TEST_FOLDER.to_string(),
            untar: false,
        },
    )
    .await;

    assert!(std::path::Path::new(TEST_FOLDER).exists());
    assert!(std::path::Path::new(TEST_FOLDER).join("react.tgz").exists());
}

#[tokio::test]
#[ignore = "requires live npm registry network"]
async fn test_download_untar() {
    const TEST_FOLDER: &str = "./tests/untar";
    let _ = download_npm::download(
        "mdmaster-theme-template",
        download_npm::DownloadOptions {
            dest_path: TEST_FOLDER.to_string(),
            untar: true,
        },
    )
    .await;

    assert!(std::path::Path::new(TEST_FOLDER).exists());
    assert!(std::path::Path::new(TEST_FOLDER)
        .join("mdmaster-theme-template")
        .join("package.json")
        .exists());
    assert!(std::path::Path::new(TEST_FOLDER)
        .join("mdmaster-theme-template")
        .join("index.js")
        .exists());
}
