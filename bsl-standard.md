# BSL-World Standard

## Monorepo

- The `D:\bsl-world` monorepository is intended only for BSL-World Windows/desktop applications and genuinely shared desktop code.
- Each desktop product is stored in its own project directory using lowercase kebab-case naming, for example `bsl-timer` or `bsl-clock`.
- Nested Git repositories (`.git` directories) inside `D:\bsl-world` are prohibited.
- Joomla extensions, web components, websites, and shared server-side infrastructure must be maintained in independent Git repositories outside `D:\bsl-world`.
- All BSL-World project directories, regardless of repository type, use lowercase kebab-case naming.
- Shared code may be moved into `bsl-core` only when it is genuinely reusable by multiple desktop products. Joomla-specific, web-specific, and server-side code must not be placed in the desktop monorepository merely because it is shared by several BSL-World projects.
- This rule supersedes the previous requirement that all BSL-World projects must be located inside `D:\bsl-world`.

## Project folder naming

- Use lowercase Latin letters.
- Separate words with hyphens.
- Format: `bsl-project-name`.
- Example: `bsl-mute`.

## App identifier (Tauri/Electron)

- Format: `ru.bsl-world.bsl-project-name`.
- Example: `ru.bsl-world.bsl-mute`.

## Versioning

- Use Semantic Versioning.
- The version must remain synchronized across every project file that contains it.
- For Tauri projects, check at least `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, and `src-tauri/tauri.conf.json` when applicable.
- Release and development artifacts must have unique versioned filenames. Different files must not be published under the same filename.

## Dependencies

- Use stable dependency versions.
- Do not introduce `alpha`, `beta`, or `rc` dependencies into stable products without a separately approved reason.
- Check official package registries before adding or upgrading dependencies.

## Git

- Run monorepository Git operations from `D:\bsl-world` or use `git -C D:\bsl-world`.
- GitVerse remote: `origin`.
- GitHub remote: `github`.
- Do not assume that pushing to one remote updates the other.
- Release tag formats are product-specific until a single monorepository-wide convention is approved.

### Repository mirrors

BSL-World public repositories are maintained on both GitVerse and GitHub.

Every approved public commit must be pushed to both remotes:

- `origin` — GitVerse;
- `github` — GitHub.

A release or development checkpoint is not considered fully published until the corresponding branch is synchronized on both services.

After pushing, verify that both remote branches point to the same commit.

### Release history

For BSL-World software projects, `CHANGELOG.md` is the canonical release history.

Do not maintain a separate `WHATSNEW.md` or equivalent file unless a product has a specific technical requirement for one.

Every public release must have an entry in `CHANGELOG.md`.

User-facing release handoff records are stored under `product-updates/<product-name>/<version>.md`.

For every public release with user-visible changes, add or update the corresponding handoff file so publication and promotion work can continue without reconstructing the development history from chat logs.

## Language rules

- Use English for source-code identifiers, comments, filenames, paths, configuration keys, technical IDs, and internal strings.
- Cyrillic is allowed in Russian localization files, user-facing UI text, documentation, help content, release notes, and other explicitly Russian-language materials.
- User-visible strings must not be embedded in business logic when they belong in localization resources.
- New applications should be designed for localization even when the first build contains only one language.
- Russian and English are the primary BSL-World interface languages.

This section supersedes the earlier blanket wording that prohibited Cyrillic in all technical files without exceptions.

## Architecture

Projects must keep the following responsibilities separate:

1. Data and persistent state.
2. Calculations and business logic.
3. Presentation and visual themes.
4. Platform integration.
5. Localization.

Presentation must not determine or mutate calculation results. Business logic must not depend on a concrete language, theme, font, window layout, or visual effect.

User preferences must be stored separately from business data and runtime state whenever their lifecycles differ.

Shared translations, palettes, utilities, and other genuinely reusable definitions may be moved to `bsl-core`. Product-specific behavior must remain in the corresponding product.

## Windows application requirements

The following requirements are mandatory for every BSL-World Windows application intended for public distribution:

- Provide an automatic update mechanism.
- Update packages must be integrity-checked and cryptographically verified before installation.
- The application must show clear user-visible update progress/status instead of silently waiting during download or installation.
- Update failures must be reported to the user in the interface, not only in logs or the developer console.
- Release channels, editions, or licensed feature sets must not be crossed accidentally by the updater.
- Before publishing a release, validate the real update path from the previous public version to the new version using production artifacts.
- Update metadata and downloadable artifacts must use the approved BSL-World download infrastructure.

## Development workflow

Work proceeds in this order:

1. Describe the goal and constraints.
2. Prepare a short plan.
3. Approve the product and architectural decisions.
4. Implement in small verifiable stages.
5. Run formatting, automated checks, tests, and a production build.
6. Perform a manual functional test.
7. Review the diff and working-tree status.
8. Commit, tag, publish, and update documentation only after verification.

For manual Windows work, state the working directory explicitly. Normally provide 3-6 related CMD commands per batch, with each independently executable command in its own separate code block for easy copying. Stop the batch at an error-sensitive or decision-sensitive boundary.

## Canonical interface themes

### General rules

- Theme definitions are shared visual standards of BSL-World.
- The same technical theme ID must refer to the same palette in every product.
- A theme changes presentation only. It must not change data, calculations, application state, or functional behavior.
- Theme tokens must be centralized instead of being scattered across handlers, components, and business logic.
- Display names belong in localization files. Technical IDs remain English and are not localized.
- A product does not have to support every canonical theme immediately. Any implemented canonical theme must use the approved palette.
- Adding or redefining a canonical theme is an architectural decision and must be recorded in this standard.
- Canonical colors must not be reconstructed approximately from screenshots.

### Glow model

Glow is a separate visual property, not a separate theme.

Recommended independent settings:

- `themeId` — selected theme;
- `glowEnabled` — whether glow or internal illumination is enabled.

Do not create duplicate theme IDs such as `green` and `neon-green`. A product should select one palette and switch its glow effect independently.

Glow intensity, blur radius, and geometry may be adapted to the product and element size. Canonical colors and the intended physical character of the effect must remain unchanged.

### Green

Technical ID: `green`

- Base: `#0BDB04`
- Highlight / Glow: `#37FF31`
- RGB Base: `11 219 4`

### Blue

Technical ID: `blue`

- Base: `#0D6EFD`
- Halo: `#168CFF`
- Highlight: `#58B2FF`
- Deep: `#044CD0`
- RGB Base: `13 110 253`

`#168CFF`, previously used as the main Blue color, is retained for the halo and related effects. The canonical Blue base is `#0D6EFD`.

### Violet

Technical ID: `purple`

- Base: `#AD5CFF`
- Highlight / Glow: `#D09AFF`
- RGB Base: `173 92 255`

English display name: `Violet`.

Russian display name: `Фиолетовая`.

The internal ID remains `purple` for compatibility with existing saved settings. It must not be renamed to `violet` without an explicit data migration.

### Magenta

Technical ID: `magenta`

- Base: `#E600A9`
- Glow: `#FF00C8`
- RGB Base: `230 0 169`

With Glow disabled, use `#E600A9`. With Glow enabled, keep the base color and use `#FF00C8` for the light halo and neon effects.

### Neon Cyan

Technical ID: `neon-cyan`

- Base: `#00BCD4`
- Glow: `#18FFFF`
- RGB Base: `0 188 212`

With Glow disabled, use `#00BCD4`. With Glow enabled, use `#18FFFF` for the light halo.

The BSL-Timer 0.4.0 source registers `neon-cyan` in the theme list and localization resources but does not contain a dedicated CSS palette. Until fixed, it inherits Green. The next BSL-Timer version must implement this approved palette.

### Tan LCD

Technical ID: `tan`

Glow Off:

- Display background: `#E8E7D6`
- Secondary surface: `#CFCEB6`
- Digits: `#4D4D4B`
- Strong digits / text: `#30302F`
- RGB Digits: `77 77 75`

Soft Amber illumination:

- Inner backlight: `#DFC070`
- Light core / Halo: `#FFE29A`

Enabling Glow must not replace the base display background or digit color. The display remains `#E8E7D6` with digits `#4D4D4B`. Soft Amber is added as a translucent internal gradient and inset illumination.

The result should resemble an LCD screen illuminated from within, like an old electronic clock or car stereo. It must not look like the screen was replaced with a solid orange surface.

## Digital display font

For seven-segment BSL-Timer displays:

- Font family: `DSEG7 Classic`.
- Font weight: `700`.
- Fallback: `Consolas, monospace`.

The font file must be distributed locally with the product. The interface must not depend on an external font service.

## BSL-Timer theme behavior

- Each timer stores its own `themeId` and `glowEnabled` values.
- Switching the active tab immediately applies that timer's appearance.
- The dynamic taskbar icon uses the theme of the timer on the active tab.
- Overdue indication has higher priority than the normal theme color.

## Product philosophy: BSL-Timer

> BSL-Timer does everything related to counting time down. And nothing that is not.

Mission:

> Make any countdown — from a few seconds to decades — simple, clear, beautiful, and reliable.

## Standard maintenance

- The authoritative repository copy is `D:\bsl-world\bsl-standard.md`.
- A persistent reference copy is kept in ChatGPT Library under the same filename.
- BSL-Core is the decision and review workspace for cross-product standards.
- Approved cross-product decisions are transferred from BSL-Core into this document.
- Product chats implement the standard; they do not redefine it silently.
- When a new decision supersedes an older rule, the supersession must be stated explicitly.
- The repository and Library copies are not automatically synchronized. After an approved change, both copies must be updated deliberately.
