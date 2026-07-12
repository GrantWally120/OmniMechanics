import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the built bundle works from any static host or subpath.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2020",
    outDir: "dist",
    sourcemap: false,
  },
});
