import {
  test as base,
  expect,
  type Page,
  type Request,
  type Route,
} from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  type Entry,
  recordedApiFile,
  recordedFile,
  recordedMedia,
} from "./recordings.ts";

const ASSETS = path.join(import.meta.dirname, "assets");

/** External URL → local copy, written by vendor-assets.ts. */
const vendored: Record<string, { file: string; contentType: string }> =
  JSON.parse(readFileSync(path.join(ASSETS, "manifest.json"), "utf8"));

// The frontend loads KaTeX's CSS and fonts from jsDelivr. Serve them from the
// installed katex package, which the renderer uses. Until index.css imports
// the package, its version can differ from the one production requests.
const KATEX_CDN =
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/katex@[^/]+\/dist\/(.+)$/;
const KATEX_DIST = path.join(
  path.dirname(createRequire(import.meta.url).resolve("katex/package.json")),
  "dist",
);
const KATEX_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
};

/** The local file and content type for an external URL, if there is one. */
function localCopy(url: URL): Entry | null {
  const recorded = recordedMedia(url.href);
  if (recorded) return recorded;
  const asset = vendored[url.href];
  if (asset) {
    return {
      path: path.join(ASSETS, "files", asset.file),
      contentType: asset.contentType,
    };
  }
  const katexFile = url.href.match(KATEX_CDN)?.[1];
  const contentType = katexFile && KATEX_TYPES[path.extname(katexFile)];
  if (katexFile && contentType) {
    const file = path.join(KATEX_DIST, katexFile);
    if (existsSync(file)) return { path: file, contentType };
  }
  return null;
}

// Audio/video, and anything an iframe loads (its page, or a srcdoc iframe's
// scripts and images, as in gist embeds), get an empty local response and don't
// count as unvendored. Specs should mask them; media can vary between runs.
function isMaskedEmbed(request: Request): boolean {
  if (request.resourceType() === "media") return true;
  try {
    return request.frame().parentFrame() !== null;
  } catch {
    // A popup's first navigation has no frame yet: it's a page, not an iframe.
    return false;
  }
}

/** An empty response of the right kind for a masked embed's request. */
function emptyResponse(request: Request): {
  contentType: string;
  body: string;
} {
  switch (request.resourceType()) {
    case "document":
      return {
        contentType: "text/html",
        body: "<!doctype html><title></title>",
      };
    case "script":
      return { contentType: "text/javascript", body: "" };
    case "stylesheet":
      return { contentType: "text/css", body: "" };
    default:
      return { contentType: "application/octet-stream", body: "" };
  }
}

/** Analytics hosts, blocked on purpose: they don't affect rendering. */
const BLOCKED_HOSTS = new Set([
  "scripts.simpleanalyticscdn.com",
  "queue.simpleanalyticscdn.com",
]);

/** Auth endpoints a logged-out page calls; they get a 401, not a recording. */
function isAuthEndpoint(pathname: string): boolean {
  return pathname === "/api/auth/me" || pathname.startsWith("/api/auth2/");
}

/** A fixed instant, so nothing that reads the clock changes between runs. */
const FIXED_TIME = new Date("2026-01-01T00:00:00Z");

// Hermetic network for every test: same-origin passes except redirects and
// `/api/**`, which gets recorded GET responses, or a 401 for auth endpoints.
// External requests get local copies; anything else fails the test. All of it
// is set on the browser context, so popups and new pages get it too.
export const test = base.extend<{ hermetic: void }>({
  hermetic: [
    async ({ context, baseURL }, use) => {
      // Only playwright.visual.config.ts sets this up (container, fixture server,
      // baselines); a run without it, e.g. `pnpm exec playwright test`, isn't valid.
      if (!baseURL) {
        throw new Error(
          "baseURL is not set: run the visual suite with `pnpm run test:visual` in tests/, which uses playwright.visual.config.ts in the pinned container.",
        );
      }
      const origin = new URL(baseURL).origin;
      const unvendored = new Set<string>();
      const redirects: string[] = [];
      const unrecorded: string[] = [];
      const sockets: string[] = [];
      const errors: string[] = [];

      // The route handler isn't rerun for a redirect's target, so every request
      // is also checked here, including each hop of a redirect chain.
      context.on("request", (request) => {
        const url = new URL(request.url());
        if (!url.protocol.startsWith("http") || url.origin === origin) return;
        if (isMaskedEmbed(request)) return;
        if (!localCopy(url) && !BLOCKED_HOSTS.has(url.hostname)) {
          unvendored.add(url.href);
        }
      });

      const handle = async (route: Route): Promise<void> => {
        const url = new URL(route.request().url());
        if (url.origin === origin) {
          if (url.pathname.startsWith("/api/")) {
            // The browser's own API calls: recorded GETs replay (see
            // record-publication.ts), auth endpoints say logged out, and
            // anything else fails the test so a new call can't pass unnoticed.
            const method = route.request().method();
            if (method === "GET") {
              const json = recordedFile(url.pathname);
              if (json) {
                return route.fulfill({
                  path: json,
                  contentType: "application/json",
                });
              }
              const file = recordedApiFile(url.pathname);
              if (file) return route.fulfill(file);
            }
            if (isAuthEndpoint(url.pathname)) {
              return route.fulfill({
                status: 401,
                contentType: "application/json",
                body: '{"error":"unauthenticated"}',
              });
            }
            unrecorded.push(`${method} ${url.pathname}`);
            return route.fulfill({
              status: 404,
              contentType: "application/json",
              body: '{"error":"not recorded"}',
            });
          }
          // Fetched here instead of continued, so a redirect can't be followed
          // past this handler. The pages under test never redirect.
          const response = await route.fetch({ maxRedirects: 0 });
          if (response.status() >= 300 && response.status() < 400) {
            redirects.push(`${url.href} → ${response.headers().location}`);
            return route.abort("blockedbyclient");
          }
          return route.fulfill({ response });
        }
        if (isMaskedEmbed(route.request())) {
          return route.fulfill(emptyResponse(route.request()));
        }
        const local = localCopy(url);
        if (local) {
          return route.fulfill({
            ...local,
            // Fonts are fetched in CORS mode.
            headers: { "access-control-allow-origin": "*" },
          });
        }
        return route.abort("blockedbyclient");
      };

      // Handler calls still running when the test ends (e.g. React Router's
      // /__manifest lookup) are drained below while the page is open. Only a
      // call that starts after that can lose its page mid-fetch; its errors
      // are ignored, and every earlier handler error still fails the test.
      const inFlight = new Set<Promise<void>>();
      let drained = false;
      await context.route("**/*", (route) => {
        const handling = handle(route).catch((error: unknown) => {
          if (!drained) throw error;
        });
        inFlight.add(handling);
        const settle = () => inFlight.delete(handling);
        handling.then(settle, settle);
        return handling;
      });

      // route() doesn't see WebSockets. A routed socket never reaches a
      // server unless connected, so only same-origin ones are.
      await context.routeWebSocket(/.*/, (socket) => {
        const url = new URL(socket.url());
        if (url.host === new URL(origin).host) {
          socket.connectToServer();
          return;
        }
        sockets.push(url.href);
        void socket.close({
          code: 1008,
          reason: "blocked by the visual suite",
        });
      });

      context.on("weberror", (webError) =>
        errors.push(`pageerror: ${webError.error().message}`),
      );
      context.on("console", (message) => {
        if (message.type() !== "error") return;
        // Chromium logs every failed resource load. The ones for requests the
        // route above answered or blocked on purpose are expected.
        // Redirects and unvendored requests are reported by their own checks.
        const resource = message.location().url;
        if (message.text().startsWith("Failed to load resource")) {
          if (isExpectedFailure(resource, origin)) return;
          if (unvendored.size > 0 || redirects.length > 0) return;
        }
        errors.push(`console.error: ${message.text()} (${resource})`);
      });

      await context.clock.setFixedTime(FIXED_TIME);
      await use();

      while (inFlight.size > 0) await Promise.allSettled(inFlight);
      drained = true;

      expect(
        [...unvendored],
        "Unvendored external requests. Add the URL to vendor-assets.ts (or block it in harness.ts) and rerun it.",
      ).toEqual([]);
      expect(
        unrecorded,
        "Unrecorded API requests. Re-record the publication (record-publication.ts), or add an auth endpoint to isAuthEndpoint in harness.ts.",
      ).toEqual([]);
      expect(redirects, "Unexpected redirects").toEqual([]);
      expect(sockets, "External WebSockets").toEqual([]);
      expect(errors, "The page logged errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

function isExpectedFailure(resource: string, origin: string): boolean {
  if (!resource) return false;
  const url = new URL(resource);
  if (url.origin === origin) return url.pathname.startsWith("/api/");
  // A recorded 404 (an absolute avatar URL that was missing) is replayed.
  const recorded = recordedMedia(url.href);
  if (recorded && "status" in recorded) return true;
  return BLOCKED_HOSTS.has(url.hostname);
}

/** How long one image may take to load before the test fails naming it. */
const IMAGE_TIMEOUT_MS = 10_000;

// Waits until a loaded, hydrated page can't change, without sleeps or
// `networkidle`: fonts loaded, images under `root` decoded, then two frames
// for effects that measure the laid-out page (figure captions, floats).
export async function waitForStablePage(
  page: Page,
  root = "body",
): Promise<void> {
  // Keep the pointer off the content, so nothing renders in a hover state.
  await page.mouse.move(0, 0);

  const problems = await page.evaluate(
    async ({ root, imageTimeoutMs }) => {
      await document.fonts.ready;

      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>(`${root} img`),
      );
      // A lazy image off-screen never starts loading. Switching it to eager
      // starts the load without scrolling the page.
      for (const image of images) {
        if (image.loading === "lazy") image.loading = "eager";
      }

      const broken: string[] = [];
      await Promise.all(
        images.map(async (image) => {
          if (!image.complete) {
            const settled = await new Promise<boolean>((resolve) => {
              image.addEventListener("load", () => resolve(true), {
                once: true,
              });
              image.addEventListener("error", () => resolve(true), {
                once: true,
              });
              setTimeout(() => resolve(false), imageTimeoutMs);
            });
            if (!settled) {
              broken.push(
                `image did not load within ${imageTimeoutMs}ms: ${image.src}`,
              );
              return;
            }
          }
          if (image.naturalWidth === 0) {
            broken.push(`image failed to load: ${image.src}`);
            return;
          }
          await image.decode();
        }),
      );

      // A vendored font that fails to decode would silently fall back.
      const fonts = Array.from(document.fonts)
        .filter((font) => font.status === "error")
        .map((font) => `font failed to load: ${font.family} ${font.style}`);

      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      return [...broken, ...fonts];
    },
    { root, imageTimeoutMs: IMAGE_TIMEOUT_MS },
  );
  expect(problems, "page assets").toEqual([]);
}
