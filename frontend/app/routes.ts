import { type RouteConfig, index, route } from "@react-router/dev/routes";

const routes = [
  // Login and register.
  route("login", "./pages/login/index.tsx"),
  route("register", "./pages/register/index.tsx"),
  route("forgot-password", "./pages/forgot-password/index.tsx"),
  route("reset-password", "./pages/reset-password/index.tsx"),

  // Home.
  index("./pages/(home)/index.tsx"),

  // Publications. (Order matters here; more specific routes first.)
  route("publications/new", "./pages/publications/new/index.tsx"),
  route(
    "publications/:pubId/edit",
    "./pages/publications/[slug]/change/index.tsx",
    {
      id: "publication-edit"
    }
  ),
  route(
    "publications/:pubId/change",
    "./pages/publications/[slug]/change/redirect-to-edit.ts"
  ),
  route("publications/:slug/draft", "./pages/publications/[slug]/index.tsx", {
    id: "publication-draft"
  }),
  route(
    "publications/:slug/:versionNumber",
    "./pages/publications/[slug]/index.tsx",
    {
      id: "publication-version"
    }
  ),
  route("publications/:slug", "./pages/publications/[slug]/index.tsx", {
    id: "publication"
  }),

  // Users.
  route("users/:slug", "./pages/users/[slug]/index.tsx"),

  // Organizations.
  route("organizations/:slug", "./pages/organizations/[slug]/index.tsx"),

  // Account settings.
  route("account", "./pages/account/layout.tsx", [
    route("notifications", "./pages/account/notifications/index.tsx"),
    route("publications", "./pages/account/publications/index.tsx"),
    route("settings", "./pages/account/settings/index.tsx")
  ]),

  // Meta.
  route("about", "./pages/about/index.tsx"),
  route("terms", "./pages/terms/index.tsx"),
  route("privacy-policy", "./pages/privacy-policy/index.tsx"),

  // Sitemaps.
  route("sitemaps/sitemap.xml", "./pages/sitemaps/sitemap.xml.ts"),
  route(
    "sitemaps/sitemap-publications.xml",
    "./pages/sitemaps/sitemap-publications.xml.ts"
  ),
  route("sitemaps/sitemap-users.xml", "./pages/sitemaps/sitemap-users.xml.ts"),
  route(
    "sitemaps/sitemap-organizations.xml",
    "./pages/sitemaps/sitemap-organizations.xml.ts"
  ),

  // Notifications.
  route("unsubscribe", "./pages/unsubscribe/index.tsx"),

  // Device Auth
  route("device", "./pages/device/index.tsx"),

  // Catch-all.
  route("*", "./pages/not-found.tsx")
];

export default routes satisfies RouteConfig;
