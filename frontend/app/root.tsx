import stylesheet from "@/../styles/index.css?url";
import { initAuthFromSession } from "@/api/auth";
import Footer from "@/components/Footer";
import { KeyboardFocusMode } from "@/components/KeyboardFocusMode";
import Navbar from "@/components/Navbar";
import NotFound from "@/components/NotFound";
import NProgress from "@/components/NProgress";
import Toaster from "@/components/stacks-ui/Toaster";
import { useTrackCommittedLocation } from "@/hooks/useCommittedLocation";
import { useRevealNavOnRouteChange } from "@/hooks/useHideOnScrollDown";
import { usePaginationTransitionEnd } from "@/hooks/usePaginationTransition";
import { runCookieConsent } from "@/lib/cookieConsent";
import AuthProvider from "@/providers/AuthProvider";
import useLocalPreferencesStore from "@/store/localPreferencesStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import katexStylesheet from "katex/dist/katex.min.css?url";
import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration
} from "react-router";
import { Route } from "./+types/root";
import { TimeTickProvider } from "./contexts/TimeTickContext";

const queryClient = new QueryClient();

export const links = () => [
  // KaTeX, from the installed package so it matches the version that renders
  // the math. Imported here, not in index.css, so Vite bundles its fonts.
  { rel: "stylesheet", href: katexStylesheet },
  // Main stylesheet.
  { rel: "stylesheet", href: stylesheet },
  // Favicon.
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
  // Preload fonts.
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous"
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap"
  }
];

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <NotFound />;
    }
    return (
      <>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
      </>
    );
  } else if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <p>The stack trace is:</p>
        <pre>{error.stack}</pre>
      </div>
    );
  } else {
    return <h1>Unknown Error</h1>;
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const rehydrateLocalPreferences = useLocalPreferencesStore(
    (s) => s.rehydrate
  );

  useRevealNavOnRouteChange();
  usePaginationTransitionEnd();

  useEffect(() => {
    // Initialize authentication from session.
    initAuthFromSession();
    // Initialize cookie consent library and run cookie consent.
    runCookieConsent();
    // Rehydrate local preferences from localStorage after mount to avoid
    // an SSR hydration mismatch (store initializes with the default on both
    // server and client, then syncs to the stored value client-side).
    rehydrateLocalPreferences();
  }, [rehydrateLocalPreferences]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta property="og:site_name" content="The Stacks" />
        <meta property="og:locale" content="en" />
        <meta
          property="og:image"
          content="https://thestacks.org/og-image.png?v2"
        />
        <meta property="og:image:width" content="2400" />
        <meta property="og:image:height" content="1260" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:image"
          content="https://thestacks.org/og-image.png?v2"
        />
        <meta name="generator" content="The Stacks" />

        <Meta />
        <Links />

        <script
          data-collect-dnt="true"
          async
          src="https://scripts.simpleanalyticscdn.com/latest.js"
        ></script>
      </head>

      <body suppressHydrationWarning className="flex flex-col">
        <TimeTickProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <KeyboardFocusMode />
              <NProgress />
              <Navbar />
              <main className="pt-navbar flex flex-1 flex-col print:pt-0">
                {children}
              </main>
              <Toaster />
              <Footer />
            </AuthProvider>
          </QueryClientProvider>
          <ScrollRestoration />
          <Scripts />
        </TimeTickProvider>
      </body>
    </html>
  );
}

export default function App() {
  useTrackCommittedLocation();
  return <Outlet />;
}
