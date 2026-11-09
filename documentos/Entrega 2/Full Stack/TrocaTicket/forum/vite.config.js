import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Build do fórum diretamente para a pasta pública do TrocaTicket.
const __dirname = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: resolve(__dirname, "../public/forum"),
    emptyOutDir: true,
  },
});
