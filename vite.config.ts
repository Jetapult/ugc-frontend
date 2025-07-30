import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: true,
    // @ts-ignore - allowedHosts is supported by Vite but missing in type defs
    allowedHosts: ["ugcf.vadapav.art"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
