import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: { scripts: true },
  },
});
