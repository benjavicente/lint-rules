import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {},
  lint: {
    ignorePatterns: ["dist/**"],
  },
  pack: {
    deps: { skipNodeModulesBundle: true },
  },
});
