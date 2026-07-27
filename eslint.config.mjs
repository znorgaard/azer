import js from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default tseslint.config(
  { ignores: ["main.js", "esbuild.config.mjs", "eslint.config.mjs"] },
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Enforce sentence-case UI text in CI (this is the guideline issue #11 is
      // about), but keep the plugin's own brand names and the AI/API acronyms.
      // ignoreRegex skips specific strings entirely: the sk-ant-... API-key
      // placeholder, and the "Adventure Log" note-type proper noun (see
      // defaultTypes.ts) — scoped to that exact phrase so the words "Adventure"
      // and "Log" are still checked everywhere else.
      "obsidianmd/ui/sentence-case": [
        "error",
        {
          brands: ["Azer", "Anthropic"],
          acronyms: ["AI", "API"],
          ignoreRegex: ["^sk-ant", "Adventure Log"],
        },
      ],
    },
  },
);
