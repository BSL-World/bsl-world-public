# BSL-World Standard

## Monorepo
- Root: D:\bsl-world\
- All projects are subfolders: bsl-core, bsl-mute, bsl-tor, ...
- No nested .git folders.

## Project folder naming
- Only lowercase latin letters, words separated by hyphen.
- Format: bsl-project-name (example: bsl-mute)

## App identifier (Tauri/Electron)
- Format: ru.bsl-world.bsl-project-name
- Example: ru.bsl-world.bsl-mute

## Versioning
- Tauri: src-tauri/Cargo.toml (version field)
- Electron: package.json ("version" field)
- Sync manually on release.

## Dependencies
- Always use latest stable versions (not older than 1 year, no alpha/beta/rc).
- Check crates.io / npmjs.com before adding.

## Git release tags
- Format: bsl-project-name/vX.Y.Z
- Example: git tag bsl-mute/v1.0.0

## CRITICAL RULES
- NO CYRILLIC in code, comments, or any technical files.