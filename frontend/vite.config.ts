import { reactRouter } from "@react-router/dev/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const backendUrl = env.VITE_BACKEND_URL || "http://localhost:7001";

  return {
    plugins: [reactRouter(), tsconfigPaths()],
    build: {
      manifest: true
    },
    server: {
      host: "::",
      port: 3000,
      open: env.VITE_DEV_OPEN === "true",
      allowedHosts: env.VITE_ALLOWED_HOSTS
        ? env.VITE_ALLOWED_HOSTS.split(",")
        : ["thestacks.org"],
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          secure: false
        }
      }
    },
    resolve: {
      // myst-transforms imports katex's raw ESM source, which Vercel's
      // function runtime cannot handle, so bundle both instead of
      // leaving them external.
      noExternal: ["myst-transforms", "katex"]
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-hook-form"]
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_MODE__: JSON.stringify(mode),
      __API_BASE__: JSON.stringify("/api"),
      __API_BACKEND_URL__: JSON.stringify(backendUrl)
    }
  };
});
