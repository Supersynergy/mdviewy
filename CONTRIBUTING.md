# Contributing to mdviewy

Thanks for helping make Markdown work feel calmer and safer.

## Before you start

- Search the [issue tracker](https://github.com/Supersynergy/mdviewy/issues) for existing work.
- Keep changes focused. One problem and one verifiable outcome per pull request.
- Never add telemetry, document uploads, or automatic indexing without an explicit user-facing opt-in.
- Treat user files as irreplaceable: preserve content on every error path.

## Local setup

Use Node.js 26, Corepack/Yarn 4, stable Rust, and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform.

```bash
corepack enable
yarn install --immutable
yarn setup
yarn dev:desktop
```

## Required checks

Run the smallest relevant test while developing, then the full local gate before opening a pull request:

```bash
yarn workspace @mdviewy/desktop test
yarn workspace @mdviewy/desktop build
cargo fmt --all -- --check
cargo check --workspace --all-targets --all-features
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
node scripts/translate-check.js
```

For file-opening, saving, parsing, or security changes, include a regression test that fails without the fix.

## Pull requests

Describe the user-visible outcome, the root cause, and the exact checks you ran. Add screenshots for layout changes. Do not mix generated formatting, dependency upgrades, and product changes unless they are required for the same fix.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions are licensed under [AGPL-3.0-only](LICENSE).
