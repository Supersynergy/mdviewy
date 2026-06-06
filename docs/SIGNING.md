# Code Signing & Notarization (1.0 blocker)

Status: **NOT yet configured.** This is the #1 distribution blocker for 1.0.

Today's release CI (`.github/workflows/tauri-release.yml`) signs only the **Tauri
updater artifacts** (`TAURI_SIGNING_PRIVATE_KEY` / `TAURI_KEY_PASSWORD`). It does
**not** Apple-code-sign or notarize, which is why the release notes still tell
macOS users to run `xattr -cr mdviewy.app` to bypass Gatekeeper.

> Updater signing ≠ OS code signing. They are different keys and solve different
> problems. We have the former, not the latter.

## What 1.0 needs

### macOS — Developer ID + notarization

1. Apple Developer Program membership ($99/yr) → "Developer ID Application" cert.
2. Add to `tauri.conf.json` `bundle.macOS`:
   - `"signingIdentity": "Developer ID Application: <Name> (<TEAMID>)"`
   - keep `entitlements` null unless a capability needs it.
3. Add these GitHub Actions secrets and env on the macOS build jobs:
   - `APPLE_CERTIFICATE` (base64 .p12), `APPLE_CERTIFICATE_PASSWORD`
   - `APPLE_SIGNING_IDENTITY`
   - `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), `APPLE_TEAM_ID`
   Tauri's bundler auto-notarizes when `APPLE_ID`/`APPLE_PASSWORD`/`APPLE_TEAM_ID`
   are present.
4. Verify on a clean Mac: `spctl -a -vvv -t install mdviewy.app` → "accepted,
   source=Notarized Developer ID". App opens with **no** `xattr` step.
5. Remove the `xattr -cr` instructions from README + the release-notes template
   in `tauri-release.yml` once verified.

### Windows — Authenticode

- Code-signing cert (OV or EV; EV clears SmartScreen instantly).
- Tauri env: `WINDOWS_CERTIFICATE` (base64 .pfx), `WINDOWS_CERTIFICATE_PASSWORD`.
- Verify: `signtool verify /pa mdviewy.exe`.

### Linux

- AppImage/deb need no OS signing. Optionally GPG-sign the release checksums.

## Definition of done

- [ ] macOS build notarized; `spctl` accepts on a clean machine.
- [ ] Windows build signed; SmartScreen path acceptable.
- [ ] `xattr` workaround removed from README + release notes.
- [ ] Secrets documented in the repo's CI settings (names only, never values).
