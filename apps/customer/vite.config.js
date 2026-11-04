import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import fs from "fs";
import PrerenderPlugin from "@prerenderer/rollup-plugin";

const SRC_DIR = path.resolve(__dirname, "./src");
const PUBLIC_DIR = path.resolve(__dirname, "./public");
const BUILD_DIR = path.resolve(__dirname, "./dist");

console.log("VITE ROOT =", SRC_DIR);


export default defineConfig({
  plugins: [
    
    react(),
    // new PrerenderPlugin({
    //   routes: ["/", "/promotion", "/vip", "/register", "/login"], // ← your F7 routes to prerender
    //   renderer: "@prerenderer/renderer-puppeteer",
    //   rendererOptions: {
    //     maxConcurrentRoutes: 1,
    //     inject: {
    //       __IS_PRERENDER: true,
    //     },
    //     renderAfterDocumentEvent: "custom-render-event",
    //     timeout: 90000,
    //   },
    // }),
  ],
  root: SRC_DIR,
  envDir: __dirname,
  base: "./",
  publicDir: PUBLIC_DIR,
  build: {
    outDir: BUILD_DIR,
    assetsInlineLimit: 0,
    emptyOutDir: true,
    rollupOptions: {
      treeshake: false,
    },
  },
  resolve: {
    alias: {
      "@": SRC_DIR,
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,

    proxy: {
        "/api": {
            target: "https://aftervibe_backend.test",
            changeOrigin: true,
            secure: false,
        },
    },
},
});
