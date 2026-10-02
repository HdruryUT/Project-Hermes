import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  // The lazily loaded 3D arena chunk (three.js) is intentionally ~650 kB.
  build: { chunkSizeWarningLimit: 800 },
});
