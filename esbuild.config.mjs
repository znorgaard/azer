import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

await esbuild
  .build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: ["obsidian", "electron", ...builtins],
    format: "cjs",
    target: "es2022",
    sourcemap: prod ? false : "inline",
    minify: prod,
    outfile: "main.js",
    logLevel: "info",
  })
  .catch((e) => { console.error(e); process.exit(1); });
