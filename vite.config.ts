import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version: string };

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/vibe01-match3/" : "/",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
}));
