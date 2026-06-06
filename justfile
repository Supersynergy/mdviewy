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

# Security gate — secret scan (working tree) + OSS vuln scan of the lockfiles.
security:
    gitleaks dir . -c .gitleaks.toml --redact --no-banner
    osv-scanner --lockfile Cargo.lock --lockfile yarn.lock

# Full CI gate: type/lint/test + audit.
ci: check

# Pre-PR / pre-release gate: CI + lean + security.
pre-pr: check lean security
