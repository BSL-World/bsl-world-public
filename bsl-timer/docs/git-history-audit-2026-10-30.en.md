# BSL-Timer history audit — 30 October 2026

[Full registry and findings in Russian](git-history-audit-2026-10-30.ru.md)

GitHub and GitVerse `main` both point to
`416fed8fa741412e63f3cfe471f8212106069d19`. All eight BSL-Timer/BSL-Core tags
match. Local `main` is two documentation commits behind, while local source files
contain later work. The initial audit did not change commits, tags or releases.
The user then explicitly authorized commits and pushes to both mirrors.

Three present-day recovery commits now preserve the earlier work on top of the
shared published main: `b016600` restores the saved pre-Glass 1.0.5 baseline,
`3f0b98e` preserves Core and shared standards, and `aed85a3` preserves Timer Glass
and Unreleased changes. The original working-copy files remain unchanged.
The remote/release inventory below records the state before these pushes.

GitHub has four published Timer releases and a 1.0.3 draft containing the final
Free installer, updater signature and checksum. GitVerse has two published Timer
releases and an empty 1.0.3 draft. GitVerse also retains legacy BSL-Tor branches,
tags and an end-of-life release; these must retain their product identity.

The live website updater manifest still serves 1.0.3. Free installation and a real
Pro update were confirmed by the user on 26 October; this does not establish
separate Free updater or simultaneous-launch acceptance. Draft release text
predating those confirmations needs updating.

A verified ZIP preserves 50 changed/new files outside existing task backups.
A verified Git bundle preserves the complete reachable local history. Existing
backup directories and ignored build outputs are outside that ZIP. Neither file
is a complete disk image or a backup of server settings and release attachments.
Private backup files and Pro installers must not enter public releases.

The audit folder contains API responses, 198 local artifact checksums, package
version history, partial-source archive inventories and 15 proposed historical
tags. Proposed commits have matching package.json, Tauri and Cargo versions and
are ancestors of both remote main branches. This does not prove installer/source
correspondence. No proposed tags have been created.

All 108 current Timer tests, 101 recovered-baseline tests and 33 Core tests passed.
Free/Pro Vite builds and `cargo check --offline --locked` passed in the isolated
worktree. All 33 initially selected updater signatures passed
cryptographic verification using the existing minisign verifier and the updater
public key. Both website installer signatures also passed, and website installer
hashes and all three GitHub attachment digests match final local artifacts.
No new installer build, installer execution or visual acceptance was performed.

A separate review directory combines published documentation with preserved
local changes. README and the shared standard merged without conflicts, and the
published handoff clarification was retained. It is a review directory, not a
new repository or branch.

Recommended order: preserve current source work in honest, present-day commits;
verify missing historical tag candidates; complete the existing 1.0.3 releases;
recover documented older releases without making them Latest. Partial 1.0.1 and
1.0.2 archives are evidence, not complete source trees. Intermediate 1.0.4 and
Glass previews 1.0.6–1.0.7 should not automatically become stable releases.
Core 0.6.0/0.6.1 also lack separately established historical commits.

Publication dates must reflect actual publication, with original development
dates recorded separately. Existing tags must not be rewritten. Pro remains
outside public release attachments. Production updater metadata is unchanged.
