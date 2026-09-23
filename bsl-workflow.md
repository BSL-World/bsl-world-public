# BSL-World Cross-Chat Workflow

## Purpose

This document defines how BSL-World work is handed off between specialized ChatGPT chats without relying on chat memory.

The repository is the canonical source of truth. Library copies may be used as convenient references, but repository files take precedence.

## Chat responsibilities

### Development chats

Development chats handle architecture, source code, testing, builds, packaging, update infrastructure, Git, technical release work, and technical standards.

They do not own public product-page copy, release-news articles, Product Hunt / AlternativeTo work, or social promotion.

After every public release with user-visible changes, create:

`product-updates/<product-name>/<version>.md`

### Product-content chats

Product-content chats handle product pages, release news, Download / Installation / About sections, and RU/EN product-copy adaptation.

Before writing about a release, read the matching handoff file and the product `CHANGELOG.md`.

### Promotion chats

Promotion chats handle Product Hunt, AlternativeTo, product directories, social announcements, and refreshing old version information on external platforms.

Before promotion work, read the matching `product-updates/<product-name>/<version>.md`.

### Resume / career chat

The resume/career chat maintains the user's resume and related career materials.

It may use BSL-World repository records as evidence of completed work, especially:

- `product-updates/<product-name>/<version>.md` for user-visible completed release work;
- product `CHANGELOG.md` files for technical implementation history;
- `bsl-standard.md` for cross-product engineering standards the user helped establish;
- repository commit history when exact implementation or release evidence is needed.

The resume/career chat should convert this evidence into concise, employer-facing achievements and skills. It should not copy release notes verbatim or add every minor release.

When updating the resume, it should:

1. read the current canonical resume source used in that chat;
2. review relevant new BSL-World release handoffs since the last resume update;
3. identify only materially new skills, responsibilities, or completed outcomes;
4. propose resume changes for user approval;
5. after approval, update the canonical resume source used by the resume/career workflow.

The development chat does not edit the resume itself. Its responsibility is to leave accurate technical evidence in the repository so the resume/career chat can reuse it without asking the user to reconstruct the work from memory.

### Other chats

Chats unrelated to product publication may ignore `product-updates/`.

## Release handoff

`product-updates/` is the canonical cross-chat handoff mechanism for public releases.

Structure:

```text
product-updates/
└── <product-name>/
    └── <version>.md
```

Each handoff should contain:
- product and version;
- release date;
- user-visible changes;
- important validation results;
- publication and promotion follow-up;
- technical references.

It is concise by design and does not replace `CHANGELOG.md`.

## Sources of truth

Use these sources in this order:

1. Product source and configuration in the repository.
2. Product `CHANGELOG.md`.
3. `product-updates/<product>/<version>.md`.
4. `bsl-standard.md`.
5. Library reference copies.

Do not reconstruct release facts from old chat messages when the repository contains the answer.

## Repository and Library

Canonical repository: `BSL-World/bsl-world-public`.

GitVerse and GitHub are mirrors and should point to the same public commit.

A Library copy of this workflow may be kept for easier cross-chat access. It is a reference copy, not an independent source of truth.

When this workflow changes:
1. update the repository copy;
2. commit and push to both Git mirrors;
3. deliberately refresh the Library reference copy if maintained.

## How to start work in another chat

Example:

> Read `product-updates/bsl-timer/0.7.1.md` in `BSL-World/bsl-world-public` and use it as the release handoff.

The receiving chat should use repository files instead of asking the user to retell release history.

## Windows application baseline

For any publicly distributed BSL-World Windows application, follow the Windows application requirements in `bsl-standard.md`, including automatic signed updates, visible progress/status, user-visible update errors, release-channel separation, and real update-path validation.

## Local working copy

Desktop monorepository: `D:\bsl-world`

Canonical local workflow file:

`D:\bsl-world\bsl-workflow.md`

A Word copy may be kept as a personal human-readable manual, but the Markdown file in Git remains canonical.
