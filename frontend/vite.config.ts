import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
//fixed
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  envDir: "../",
  server: {
    port: 3000,
    host: true,
    allowedHosts: ["bakeryiq.pro", "www.bakeryiq.pro"],
    proxy: {
      "/api": {
        target: process.env.DOCKER_ENV ? "http://backend:5000" : "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: ["bakeryiq.pro", "www.bakeryiq.pro"],
  },
});
