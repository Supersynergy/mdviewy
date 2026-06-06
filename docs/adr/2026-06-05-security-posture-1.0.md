# Security posture for 1.0

Date: 2026-06-05

Captures the security decisions for the 1.0 hardening pass. Some items are
applied; others are deliberately deferred with rationale so they are not "fixed"
blindly in a way that breaks the editor.

## 1. Content-Security-Policy — RECOMMENDED, not yet applied

`tauri.conf.json` `app.security.csp` is currently `null` (no CSP). A CSP is
enforced by the webview at **runtime**, so flipping it blindly cannot be verified
by a build and risks a white-screen app. It must be set together with a manual
run + screenshot of the editor, AI panel, and image rendering.

Proposed starting policy (tighten iteratively against runtime errors):

```
default-src 'self';
img-src 'self' asset: https://asset.localhost data: blob:;
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
connect-src 'self' ipc: https://api.openai.com https://api.deepseek.com;
script-src 'self'
```

Action: apply on a branch, launch the app, exercise open/edit/export/AI/image,
fix violations in the devtools console, then merge. Owner verifies at runtime.

## 2. assetProtocol scope `["**/*"]` — ACCEPTED (with rationale)

`assetProtocol.scope.allow` is broad on purpose: mdviewy is a general Markdown
editor that must render local images referenced by *any* opened file, anywhere on
disk. Narrowing to a workspace dir would break the core "open any .md and see its
images" flow. Risk is bounded — read access only, and the user explicitly opens
files. We keep it broad and revisit if a sandboxed/portable mode is added.

## 3. AI key storage — VERIFY before 1.0

API keys (OpenAI/DeepSeek/Copilot) must live in the OS keychain via Tauri's
secure store, never plaintext in the config JSON. Action: audit the settings
read/write path; migrate if any key is persisted in plaintext.

## 4. Dependency advisories — ACCEPTED, tracked

`cargo audit --no-fetch --stale` reports ~20 allowed transitive warnings (all
indirect, no direct fix available yet). They are gated as "allowed" in CI rather
than ignored. Re-review each on every `cargo update`; promote to blocker if a
direct upgrade path appears or severity rises.

## Definition of done (1.0)

- [ ] CSP set and runtime-verified (open/edit/export/AI/image all work).
- [ ] AI keys confirmed in OS keychain.
- [ ] assetProtocol rationale linked from SECURITY.md.
- [ ] audit warnings re-reviewed at release cut.
