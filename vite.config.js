import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// All API calls proxy to the Express backend on port 3001
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/gmail-api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});