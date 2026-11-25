import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  define: {
    // These mirror the variables available in vite.config.ts
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_MODE__: JSON.stringify("test"),
    __API_BASE__: JSON.stringify("/api"),
    __API_BACKEND_URL__: JSON.stringify("http://localhost")
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"]
  }
});
