---
sidebar_position: 1
---
# mdviewy

## mdviewy is in Beta Stage ⚠️

Currently, mdviewy is in the beta stage, and it is recommended to use it with data backups.

## Feature

- **Built-in AI**. Currently, it supports one click export of conversations, translation of articles to any language, and obtaining article abstracts. It also supports large models such as `DeepSeek` and `Chatgpt` to make them your intelligent assistants.
- **Super lightweight**. The mdviewy is based on tauri and has a volume of less than 10MB and better performance.
- **High availability**. mdviewy uses the remirror editor, which not only provides high scalability, but also has a great editing experience. And, mdviewy supports multiple editing modes, such as `source code`, `wysiwyg`.
- **Custom Theme**. mdviewy supports custom themes, and you can also share your themes with others.

## Download

Available for Linux, macOS and Windows.

### Windows 11

1. Open [GitHub Releases](https://github.com/Supersynergy/mdviewy/releases).
2. Download `mdviewy_*_x64-setup.exe` and run it.
3. If Windows cannot download WebView2 automatically, use `mdviewy_offline_*_x64-setup.exe`. It is larger because it bundles WebView2.
4. Use the `.msi` package for managed installs. Unsigned prerelease builds may show Microsoft SmartScreen until Windows code signing is configured.

> [!NOTE]
> Because of Apple’s security policy restrictions on software without developer certification, the **macOS aarch64** version cannot be downloaded and used directly. You can ignore the limit by doing the following:
> - Open your terminal
> - Go to the `Applications` directory. .e.g `/Applications`.
> - Run `xattr -cr mdviewy.app` and open the app again
> - Download only from the official GitHub releases.

Download from [GitHub Releases](https://github.com/Supersynergy/mdviewy/releases).

## Why

At present, I have used many Markdown applications, but I have not encountered one that is very suitable for me. I have always hoped to have a Markdown editor that is efficient, beautiful, lightweight, data-safe, and can be easily combined with various workflows. This It is also the original intention of doing mdviewy.

## Contribute

The current mdviewy is still in its infancy, and there may be some bad experiences or bugs, for which I am sorry. All partners who are interested or encounter usage problems are welcome to submit [issues](https://github.com/Supersynergy/mdviewy/issues/new) or [PR](https://github.com/Supersynergy/mdviewy/compare) to participate in this project.

### How to Contribute

You can read [CONTRIBUTING](./Community/CONTRIBUTING) to know how to start the project and modify the code, Welcome to participate in code contribution.

## Support

mdviewy is completely and permanently open source, if you want to support mdviewy, you can `star` this project. This will give me great support and help, love you.
