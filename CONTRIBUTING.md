# Contributing

## Setup

CI runs on Node 20; use the same locally.

```bash
npm install
```

## Checks

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs these on every pull request; all three must pass:

```bash
npm run lint    # ESLint over src/ and tests/
npm run build   # type-check (strict) + bundle to main.js
npm test        # unit tests (Vitest)
```

While iterating:

```bash
npx tsc --noEmit     # type-check only, no bundle
npm run test:watch   # Vitest watch mode
npm run dev          # unminified build with inline sourcemaps
```

## Trying it in a vault

Build, then symlink or copy `manifest.json` and `main.js` into `<vault>/.obsidian/plugins/azer/` and enable Azer in Settings → Community plugins.
After a rebuild, toggle the plugin off and on (or reload Obsidian) to pick up the change.

## Cutting a release

1. Open and merge a version-bump PR updating `manifest.json`, `package.json`,
   `package-lock.json`, and `versions.json`.
2. Tag the merge commit on `main` with the bare version (no `v` prefix) and
   push the tag: `git tag X.Y.Z && git push origin X.Y.Z`.
3. The tag push triggers the Release workflow, which builds `main.js` in CI,
   generates [artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations)
   for `main.js` and `manifest.json`, and creates a draft release with those
   assets attached.
4. Review the draft, write the release notes, and publish.

**Never attach locally built assets to a release** — attestations only cover
the bytes CI built, and a local build can differ invisibly (e.g. CRLF line
endings in `manifest.json` from a Windows checkout). Anyone can then verify an
asset with:

```bash
gh attestation verify main.js -R znorgaard/azer
```

## Layout and conventions

- Source lives in `src/`, split by responsibility (`ai/`, `commands/`,
  `notes/`, `schema/`, `tables/`, `ui/`). Each module declares its exports.
- Obsidian API access goes through the ports in `src/ports.ts` /
  `src/obsidianPorts.ts` so logic stays unit-testable with fakes
  (`tests/fakes.ts`).
- Tests in `tests/` mirror `src/`; add a failing test before the fix.
- Never silence a lint/type error to pass checks — fix the code.
