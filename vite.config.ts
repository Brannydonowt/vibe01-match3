import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/vibe01-match3/" : "/",
}));
