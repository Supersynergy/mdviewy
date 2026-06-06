# mdviewy — Masterplan to 1.0

Status: v0.90.1 (2026-06-02). Target: **1.0.0 GA**.
Owner: Supersynergy. Last updated: 2026-06-05.

Functionally close. The gap to 1.0 is **trust + distribution + narrative + brand**, not features.

## Progress (2026-06-05)

- ✅ **Phase 0 done** — removed "reconstruction phase" notice (EN/ZH/JA), unified
  name to lowercase `mdviewy` everywhere, pointed all metadata at GitHub
  (`Supersynergy/mdviewy`), recorded both in ADR `2026-06-05-canonical-name-and-repo-home`.
- ✅ **Phase 4 mostly done** — tarsier app icon rendered into all icon slots +
  `public/logo.png`. Final raster polish optional.
- 🟡 **Phase 3 started** — added Rust edge tests for file-type detection; full
  suite green (Rust + 67 frontend tests).
- 📄 **Phase 1 & 2 documented** — `docs/SIGNING.md` (Apple/Windows signing, the
  real GA blocker) and ADR `2026-06-05-security-posture-1.0` (CSP plan, audit).
- ⛔ **Phase 1 (signing) + Phase 5 (tag 1.0) need the owner** — Apple/Windows
  certs cannot be provisioned from here; not tagging 1.0 until builds are signed.

### Lean & speed audit (2026-06-06)

- **Speedtuning: already strong.** Release profile (`lto=fat`, `codegen-units=1`,
  `panic=abort`, `strip`) + `.cargo/config.toml` (sccache, `-dead_strip`,
  `target-cpu=apple-m1`) + lazy-loaded editor/AI + lodash purge. Gap: no
  `criterion`/`divan` benches on hot paths (render/FTS).
- **Leancode: gate now wired** (`just lean` / `just security` / `just pre-pr`),
  but findings remain:
  - `cargo machete` flags unused Rust deps in 6 crates (e.g. `mdviewy-core`:
    `syntect`, `serde_json`, `parking_lot`, `thiserror`; `mfdev`: `anyhow`,
    `log`, `env_logger`, `os_pipe`). Verify each (machete has macro/feature
    false-positives) then trim. — **Phase 3/2**
  - `osv-scanner`: **41 vulns across ~22 transitive npm deps** (incl. `vitest`
    3.0.7 = CVSS 9.8 dev-only, plus `undici`/`uuid`/`xml2js`/`postcss`/`tar`/
    `prismjs`/`lodash`). Fix via yarn upgrades + `resolutions`, then re-run
    `just security`. — **Phase 2 blocker for a clean release**
  - Frontend carries 5 AI-SDK libs (`@ai-sdk/{deepseek,google,openai}` + `ai` +
    `ollama-ai-provider-v2`) and 3 markdown renderers (`rme`, `react-markdown`,
    `@ant-design/x-markdown`) — review for overlap (judgment, not auto-delete).

---

## Definition of Done (1.0 GA)

A user on macOS / Windows / Linux can:
1. Download a **signed, notarized** build that opens without `xattr` workarounds.
2. Open, edit, save, export Markdown (+ JSON/TXT) with no data-loss bug.
3. Use built-in AI with clear key setup and graceful offline/error states.
4. Get updates through a defined path (auto-update or documented manual).
5. See one consistent brand (name, logo, repo home, links).

Release gate: `just check` green · `tauri:build` all 3 OS · signing verified · README truthful · CHANGELOG cut.

---

## Phase 0 — Truth & Naming (0.5 day) — UNBLOCKS EVERYTHING

- [ ] Remove "reconstruction phase / needs 3-6 months / no release" from `README.md` + `README.src.md`.
- [ ] Pick canonical name casing: **mdviewy** (lowercase). Fix `tauri.conf` `productName` "MDviewy" → align.
- [ ] Resolve naming churn: ADR `2026-05-26-rename-to-mdmaster.md` vs current "mdviewy" — write a superseding ADR stating final name.
- [ ] Pick canonical repo home (Gitea `git.marketdeck.io` **or** GitHub `Supersynergy`). Make package.json / Cargo.toml / README badges / download links all agree.
- Gate: no contradictory name/URL anywhere (`rg -i 'mdmaster|reconstruction'` clean).

## Phase 1 — Distribution & Trust (3–5 days) — #1 REAL BLOCKER

- [ ] macOS: Apple Developer ID signing + notarization in `tauri.conf` macOS block (`signingIdentity`, `entitlements`). Verify: `spctl -a -vv mdviewy.app` → "accepted".
- [ ] Windows: code-signing cert wired into wix bundle. Verify SmartScreen reputation path.
- [ ] Linux: AppImage/deb confirmed launching on clean box.
- [ ] Update path decision: re-enable Tauri updater w/ signed manifest **or** document manual-update policy in README + in-app "check for updates" link. (Updater was removed in 0.90 — decide deliberately.)
- Gate: fresh-machine install on all 3 OS opens with zero terminal workaround.

## Phase 2 — Security Hardening (1–2 days)

- [ ] Replace `csp: null` with a real Content-Security-Policy.
- [ ] Tighten `assetProtocol.scope.allow` from `["**/*"]` to opened-workspace dirs only.
- [ ] Document the 20 allowed transitive `cargo audit` warnings in `docs/adr/` (why each is accepted).
- [ ] AI key storage: confirm keys go to OS keychain, never plaintext config.
- Gate: `smac-secscan .` + `gitleaks` + `cargo audit --no-fetch --stale` clean/accepted.

## Phase 3 — Quality & Test Depth (3–4 days)

- [ ] Frontend: add smoke/E2E for core flows — open file, edit, save, switch wysiwyg/source, export, ToC jump, command palette. (Currently ~0 component tests on 25k LOC TS.)
- [ ] Rust: extend beyond 21 tests — file_search edge cases, large-file handling, path/encoding boundaries.
- [ ] Manual QA matrix: huge file, empty file, non-UTF8, broken image paste, AI offline/timeout/bad-key, concurrent save.
- [ ] Fix any P0/P1 from the matrix.
- Gate: `just check` green + E2E green + QA matrix signed off.

## Phase 4 — Brand & Polish (1–2 days)

- [ ] Pick final mascot direction (see Brand below) and generate raster mascot art.
- [ ] Replace `public/logo.png`, all `apps/desktop/src-tauri/icons/*` (.png/.icns/.ico + Square tiles), favicon.
- [ ] Refresh social-preview with final logo.
- [ ] Screenshots (`show-en.png` / `show-zh.png`) updated to current UI.
- Gate: icon crisp at 16/32/128/1024px; macOS dock + Win taskbar + Linux look right.

## Phase 5 — Release Engineering (1 day)

- [ ] CI builds + signs all 3 OS on tag.
- [ ] Cut CHANGELOG `1.0.0` section (move Unreleased).
- [ ] Bump versions: tauri.conf, Cargo workspace, desktop package.json → `1.0.0`.
- [ ] Release notes + launch copy (use `repo-release-excellence`).
- [ ] Tag `v1.0.0`, publish, verify download links resolve.
- Gate: clean download → install → run on all 3 OS from the published release.

---

## Brand Decision (input ready)

Concepts in `docs/brand/concepts-2026-06/` (+ `png/` previews).

- **Recommended (Codex):** Tarsier app icon (`appicon-final-recommendation.svg`) — big eyes ownable, readable at 32px — + `mark-02-caret.svg` for favicon/tray/monochrome.
- Alternatives: koala (existing direction, distinct grey), loris (sleepy-cute).
- Palette: teal `#166870` / `#72D6C7` + gold `#F5C85F`.
- Next step for final art: `banana-claude`/nanobanana with chosen SVG as reference, then render icon set.

---

## Critical Path (fastest to GA)

```
Phase 0 (truth/naming)  →  Phase 1 (signing)  →  Phase 5 (release)
                        ↘  Phase 2,3,4 parallel where staffed
```

Signing (Phase 1) is the longest-lead item (cert provisioning). Start it day 1, in parallel with Phase 0.

Rough total: ~2–3 focused weeks solo, faster if signing certs already exist.
