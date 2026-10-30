import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative base so the build works at any GitHub Pages path (/<repo>/ or a custom domain).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
