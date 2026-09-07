// Banglar Voice - Vite / TanStack Start configuration (fully standalone).
// Built directly on the official TanStack Start + Vite plugins; no external
// platform config wrapper is required.
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // TanStack Start devtools (dev-only) + server/browser build pipeline,
    // React fast-refresh, Tailwind CSS v4, and the @/ path alias.
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts
      // (our SSR error wrapper). Nitro/vite builds from this.
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
  ],
});
