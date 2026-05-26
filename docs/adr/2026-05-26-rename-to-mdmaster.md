# Rename to mdmaster

Date: 2026-05-26

Decision:
- Rename product, Tauri bundle, Rust app crate, npm workspace scope, docs links, Raycast command, and install script to `mdmaster`.
- Use bundle identifier `com.supersynergy.mdmaster`.
- Use GitHub repository target `Supersynergy/mdviewy`.

Rationale:
- The project is now positioned as a fast native Markdown viewer/editor under the shorter `mdmaster` identity.
- The rename avoids stale app discovery in Raycast and aligns package names, app bundle names, and repo metadata.

Notes:
- External third-party package names remain unchanged.
- Legacy app data path handling still falls back safely when platform config resolution fails.
