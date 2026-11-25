import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

// https://vercel.com/docs/environment-variables/system-environment-variables#VERCEL.
const isVercel = process.env.VERCEL === "1";

export default {
  // Enable server-side rendering.
  ssr: true,
  // Use Vercel integration for deployment to Vercel.
  presets: isVercel ? [vercelPreset()] : [],
  splitRouteModules: true
} satisfies Config;
