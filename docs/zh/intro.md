---
sidebar_position: 1
---
# mdviewy

## mdviewy 目前处于 Beta 阶段 ⚠️

目前 mdviewy 处于 beta 阶段，建议在有数据备份的情况下使用。

## 功能特性

- **内置 AI**。目前支持一键导出对话、文章翻译成任意语言、获取文章摘要等功能。还支持 `DeepSeek` 和 `Chatgpt` 等大模型，让它们成为你的智能助手。
- **超轻量级**。mdviewy 基于 tauri 构建，体积小于 10MB，性能更佳。
- **高可用性**。mdviewy 使用 remirror 编辑器，不仅提供高扩展性，还拥有出色的编辑体验。此外，mdviewy 支持多种编辑模式，如 `源代码`、`所见即所得`。
- **自定义主题**。mdviewy 支持自定义主题，你还可以与他人分享你的主题。

## 下载

支持 Linux、macOS 和 Windows。

### Windows 11

1. 打开 [GitHub Releases](https://github.com/Supersynergy/mdviewy/releases)。
2. 下载并运行 `mdviewy_*_x64-setup.exe`。
3. 如果 Windows 无法自动下载 WebView2，请使用 `mdviewy_offline_*_x64-setup.exe`。它内置 WebView2，文件更大。
4. 托管安装可使用 `.msi` 包。未签名的预发布版本可能会触发 Microsoft SmartScreen，直到完成 Windows 代码签名。

> [!NOTE]
> 由于苹果对未获得开发者认证软件的安全策略限制，**macOS aarch64** 版本无法直接下载使用。你可以通过以下方式忽略限制：
> - 打开终端
> - 进入 `Applications` 目录，例如 `/Applications`
> - 运行 `xattr -cr mdviewy.app` 然后重新打开应用
> - 请仅从官方 GitHub Releases 下载。

请从 [GitHub Releases](https://github.com/Supersynergy/mdviewy/releases) 下载。

## 为什么

目前，我已经使用过很多 Markdown 应用，但没有遇到一个非常适合我的。我一直希望能有一个高效、美观、轻量级、数据安全且能轻松与各种工作流结合的 Markdown 编辑器。这也是做 mdviewy 的初衷。

## 贡献

目前的 mdviewy 还处于起步阶段，可能会有一些不好的体验或 bug，对此我深表歉意。所有感兴趣或遇到使用问题的伙伴都欢迎提交 [issues](https://github.com/Supersynergy/mdviewy/issues/new) 或 [PR](https://github.com/Supersynergy/mdviewy/compare) 来参与这个项目。

### 如何贡献

你可以阅读 [CONTRIBUTING](./Community/CONTRIBUTING) 来了解如何启动项目和修改代码，欢迎参与代码贡献。

## 支持

mdviewy 完全且永久开源，如果你想支持 mdviewy，可以给这个项目 `star`。这将给我很大的支持和帮助，爱你。
