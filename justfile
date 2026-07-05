set shell := ["bash", "-euo", "pipefail", "-c"]

fmt:
    cargo fmt --all

lint:
    cargo clippy --workspace --all-targets --all-features -- -D warnings

test:
    cargo nextest run --workspace --all-features --no-tests pass

audit:
    cargo audit --no-fetch --stale

audit-online:
    cargo audit

check:
    cargo fmt --all -- --check
    cargo check --workspace --all-targets --all-features
    cargo clippy --workspace --all-targets --all-features -- -D warnings
    cargo nextest run --workspace --all-features --no-tests pass
    cargo audit --no-fetch --stale

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
    yarn workspace @mdviewy/desktop tauri:build
    ./scripts/install-mdviewy-app.sh

# Full CI gate: type/lint/test + audit.
ci: check

# Pre-PR / pre-release gate: CI + lean + security.
pre-pr: check lean security
