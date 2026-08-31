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

## Layout and conventions

- Source lives in `src/`, split by responsibility (`ai/`, `commands/`,
  `notes/`, `schema/`, `tables/`, `ui/`). Each module declares its exports.
- Obsidian API access goes through the ports in `src/ports.ts` /
  `src/obsidianPorts.ts` so logic stays unit-testable with fakes
  (`tests/fakes.ts`).
- Tests in `tests/` mirror `src/`; add a failing test before the fix.
- Never silence a lint/type error to pass checks — fix the code.
