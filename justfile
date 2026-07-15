set shell := ["bash", "-euo", "pipefail", "-c"]

# Fixed releases for these 2026-07 advisories are below the repository's
# 14-day package-age floor. Review/remove all three ignores on 2026-07-22;
# rationale: docs/adr/2026-06-05-security-posture-1.0.md.
rustsec_fresh_fix_ignores := "--ignore RUSTSEC-2026-0204 --ignore RUSTSEC-2026-0194 --ignore RUSTSEC-2026-0195"

fmt:
    cargo fmt --all

lint:
    cargo clippy --workspace --all-targets --all-features -- -D warnings

test:
    cargo nextest run --workspace --all-features --no-tests pass

audit:
    cargo audit --no-fetch --stale {{rustsec_fresh_fix_ignores}}

audit-online:
    cargo audit {{rustsec_fresh_fix_ignores}}

check:
    cargo fmt --all -- --check
    cargo check --workspace --all-targets --all-features
    cargo clippy --workspace --all-targets --all-features -- -D warnings
    cargo nextest run --workspace --all-features --no-tests pass
    cargo audit --no-fetch --stale {{rustsec_fresh_fix_ignores}}

# Lean gate — flag unused dependencies (code = liability). Warn-only.
lean:
    cargo machete || true

# Security gate — secret scan (working tree) + npm vuln scan.
# Rust advisories are covered by `cargo audit` in `check`/`audit`, so osv here
# scans only the npm lockfile to avoid duplicate ignore-list maintenance.
security:
    gitleaks dir . -c .gitleaks.toml --redact --no-banner
    osv-scanner --config osv-scanner.toml --lockfile yarn.lock

# Build the desktop app and deploy straight to /Applications: strips
# quarantine + re-signs ad-hoc + re-registers with LaunchServices, so the
# real running app (Finder/CLI/Spotlight-resolved) is never stale and never
# triggers an "unidentified developer" Gatekeeper prompt on this machine.
install:
    yarn workspace @mdviewy/desktop build
    yarn workspace @mdviewy/desktop tauri:build --bundles app
    ./scripts/install-mdviewy-app.sh

# Full CI gate: type/lint/test + audit.
ci: check

# Pre-PR / pre-release gate: CI + lean + security.
pre-pr: check lean security
