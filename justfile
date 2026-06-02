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
