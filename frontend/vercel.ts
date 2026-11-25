import { routes, type VercelConfig } from "@vercel/config/v1";

const backendUrl = process.env.VITE_BACKEND_URL;

export const config: VercelConfig = {
  framework: "react-router",
  // You would think this should use ${deploymentEnv("VITE_BACKEND_URL")}, but that doesn't work.
  rewrites: [routes.rewrite("/api/:path(.*)", `${backendUrl}/api/:path`)]
};
