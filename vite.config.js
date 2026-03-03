import { defineConfig } from "vite";
import { resolve } from "node:path";
import { cpSync, existsSync } from "node:fs";

function copyVaStaticAssets() {
  return {
    name: "copy-va-static-assets",
    writeBundle(outputOptions) {
      const outputDir = outputOptions.dir
        ? resolve(outputOptions.dir)
        : resolve(process.cwd(), "dist");

      const staticFolders = ["audio", "icons"];

      staticFolders.forEach((folder) => {
        const sourceDir = resolve(process.cwd(), "va", folder);
        const destinationDir = resolve(outputDir, "va", folder);

        if (existsSync(sourceDir)) {
          cpSync(sourceDir, destinationDir, { recursive: true });
        }
      });
    }
  };
}

export default defineConfig({
  // Relative asset paths so the built site works on GitHub Pages project URLs.
  base: "./",
  plugins: [copyVaStaticAssets()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        va: resolve(process.cwd(), "va/index.html")
      }
    }
  }
});
