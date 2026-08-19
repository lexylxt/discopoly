import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Dev only. Better than adding each temporary trycloudflare hostname manually.
    allowedHosts: [".trycloudflare.com", "localhost"]
  }
});
