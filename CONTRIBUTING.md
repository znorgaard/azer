# Contributing

```bash
npm install
npx tsc --noEmit   # type-check (strict)
npm test           # unit tests (Vitest)
npm run build      # type-check + bundle to main.js
```

- Source lives in `src/`, split by responsibility (`ai/`, `commands/`,
  `notes/`, `schema/`, `tables/`, `ui/`). Each module declares its exports.
- Obsidian API access goes through the ports in `src/ports.ts` /
  `src/obsidianPorts.ts` so logic stays unit-testable with fakes
  (`tests/fakes.ts`).
- Tests in `tests/` mirror `src/`; add a failing test before the fix.
- Never silence a lint/type error to pass checks — fix the code.
