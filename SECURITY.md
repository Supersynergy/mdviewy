# Security policy

## Supported versions

| Version | Security support |
| --- | --- |
| 0.92.x | Yes |
| 0.91.x | Critical fixes only |
| 0.90.x and older | No |

## Report a vulnerability

Do not open a public issue before a fix is available. Use [GitHub private vulnerability reporting](https://github.com/Supersynergy/mdviewy/security/advisories/new) or email `true@supersynergy.de` with the affected version, operating system, reproduction steps, and expected impact.

We will acknowledge actionable reports, investigate privately, and publish a security release or advisory when a fix is ready.

## Security posture

- Markdown documents stay on the local filesystem. Opening a folder is explicit and workspace scans are bounded.
- File saves use a same-directory temporary file, a durable flush, and atomic replacement.
- The WebView Content Security Policy blocks inline scripts and objects. GitHub-style README HTML is sanitized before rendering.
- External links open in the operating system browser; relative Markdown links stay inside mdviewy.
- Local images may be read from paths referenced by an opened document. The asset protocol is read-only but intentionally broad so standalone Markdown can display its own assets.
- AI is optional. Requests leave the device only after a provider is configured and an AI action is invoked.
- AI provider keys currently live in the local settings store as plaintext. Do not sync or commit that file; operating-system keychain storage remains a 1.0 gate.

Architecture details and verification commands live in [the security posture ADR](docs/adr/2026-06-05-security-posture-1.0.md).
