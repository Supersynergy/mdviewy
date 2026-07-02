# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.90.x  | Yes                |
| <0.90   | No                 |

## Reporting a Vulnerability

Please do not open a public issue for a vulnerability before a fix is ready.

Report privately through GitHub Security Advisories when available, or email
`true@supersynergy.de` with:

- affected version or commit
- operating system
- reproduction steps
- expected impact

Maintainers will acknowledge valid reports, fix privately when needed, and
publish a security release or advisory when the fix is available.

## Security posture

- **Content-Security-Policy:** enforced since 0.90.3 (`app.security.csp` in
  `apps/desktop/src-tauri/tauri.conf.json`): `script-src 'self'`, no inline
  scripts, `object-src 'none'`; remote images/AI endpoints limited to
  HTTPS + localhost (Ollama). Rationale and verification steps:
  [`docs/adr/2026-06-05-security-posture-1.0.md`](docs/adr/2026-06-05-security-posture-1.0.md).
- **Asset protocol scope is deliberately broad (`**/*`, read-only):** mdviewy
  must render local images referenced by any opened Markdown file anywhere on
  disk. See the ADR above for the accepted-risk rationale.
- **AI API keys:** currently persisted in the app's local settings store
  (plaintext JSON, user-writable location). Keychain migration is tracked for
  1.0 in the ADR — do not commit or sync this file.
