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
      // about), but keep the plugin's own brand names, note-type proper nouns,
      // the AI/API acronyms, and the sk-ant-... API-key placeholder.
      "obsidianmd/ui/sentence-case": [
        "error",
        {
          brands: ["Azer", "Anthropic", "Adventure", "Log"],
          acronyms: ["AI", "API"],
          ignoreRegex: ["^sk-ant"],
        },
      ],
    },
  },
);
