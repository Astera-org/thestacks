/**
 * Compares how a publication renders on a deployment (usually a local dev
 * server, sometimes a Vercel preview) against production. Loads the
 * publication page on both sites in headless Chromium, then diffs the
 * normalized DOM, text, and a screenshot of each page region (header, body
 * column, sidebar). Each run writes its artifacts to a new folder,
 * `data/<date>-render-comparison/<slug>/<time>/`.
 *
 * Usage:
 *
 * ```sh
 * pnpm run compare-render <deployment-url> <slug> [--version v3]
 *   [--prod https://thestacks.org] [--width 1280] [--threshold 0.01]
 * ```
 *
 * Exits with status 1 on a visual difference: more than `--threshold` percent
 * of pixels differ in any region, or a region changed size. DOM or text differences
 * alone only print a warning, since they often don't change what readers see.
 *
 * Environment variables:
 *   VERCEL_AUTOMATION_BYPASS_SECRET – Optional. Bypasses deployment protection
 *     on the deployment origin only. Never sent to localhost.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { formatPatch, structuredPatch, type StructuredPatch } from "diff";
import dotenv from "dotenv";
import pixelmatch from "pixelmatch";
import { chromium, type Browser, type Page } from "playwright";
import { PNG } from "pngjs";
import { DATA_DIR } from "@/constants";

dotenv.config({ quiet: true });

const STARTED_AT = new Date().toISOString();
const CURRENT_DATE = STARTED_AT.slice(0, 10); // YYYY-MM-DD
const CURRENT_TIME = STARTED_AT.slice(11, 19).replace(/:/g, "-"); // HH-MM-SS, UTC

/** Both pages see the same clock, so relative timestamps ("3 days ago") match. */
const FIXED_TIME = new Date(`${CURRENT_DATE}T12:00:00Z`);

const MAIN_COLUMN_ANCHOR = "#publication-body";

/**
 * Page regions compared separately. The selectors must also match production,
 * so they rely on existing structure rather than test ids. `.bg-pub-header`
 * alone also matches the fixed title banner.
 */
const REGIONS = {
  header: `.bg-pub-header:has(+ * ${MAIN_COLUMN_ANCHOR})`,
  body: `section:has(> ${MAIN_COLUMN_ANCHOR})`,
  // The table of contents. The aside itself spans the whole grid height, so a
  // change to the table would be a negligible share of its pixels.
  sidebar: `section:has(> ${MAIN_COLUMN_ANCHOR}) + aside > nav`,
};

type RegionName = keyof typeof REGIONS;

const REGION_NAMES = Object.keys(REGIONS) as RegionName[];

/**
 * Content that differs between loads or backends regardless of the code being
 * compared. Comments and social posts are user data that the `.json` data check
 * doesn't cover, and a local backend rarely has the same ones as production.
 */
const VOLATILE_SELECTORS = [
  "iframe",
  '[data-testid="new-comment-form"]',
  "time",
  "div:has(> #comments)",
  "div:has(> #social)",
  // The comment count in the table of contents.
  'a[href="#comments"] > span:has(svg)',
];

interface Options {
  deployOrigin: string;
  prodOrigin: string;
  slug: string;
  version?: string;
  width: number;
  threshold: number;
}

interface Capture {
  html: string;
  text: string;
  screenshot: Buffer;
}

type Rendered = Record<RegionName, Capture>;

function usage(): never {
  console.error(
    "Usage: pnpm run compare-render <deployment-url> <slug> [--version v3] [--prod https://thestacks.org] [--width 1280] [--threshold 0.01]",
  );
  process.exit(2);
}

function isLocal(origin: string): boolean {
  const { hostname } = new URL(origin);
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Accepts `localhost:3000` or `my-preview.vercel.app` as well as full URLs. */
function toOrigin(input: string): string {
  const withScheme = /^https?:\/\//.test(input)
    ? input
    : /^(localhost|127\.0\.0\.1)\b/.test(input)
      ? `http://${input}`
      : `https://${input}`;
  return new URL(withScheme).origin;
}

function parseOptions(): Options {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      version: { type: "string" },
      prod: { type: "string", default: "https://thestacks.org" },
      width: { type: "string", default: "1280" },
      threshold: { type: "string", default: "0.01" },
    },
  });
  if (positionals.length !== 2) usage();
  const [deployment, slug] = positionals;
  return {
    deployOrigin: toOrigin(deployment),
    prodOrigin: toOrigin(values.prod),
    slug,
    version: values.version,
    width: Number(values.width),
    threshold: Number(values.threshold),
  };
}

function headersFor(
  origin: string,
  deployOrigin: string,
): Record<string, string> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret || origin !== deployOrigin || isLocal(origin)) return {};
  return { "x-vercel-protection-bypass": secret };
}

function publicationPath({ slug, version }: Options): string {
  return version ? `/publications/${slug}/${version}` : `/publications/${slug}`;
}

/** The most specific message in a fetch or navigation error, on one line. */
function errorDetail(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  // fetch wraps the real failure (refused, redirect, TLS) in its cause. The
  // ES2020 lib these scripts target doesn't declare Error.cause.
  const { cause } = error as { cause?: unknown };
  // A refused localhost connection is an AggregateError (it tried both ::1 and
  // 127.0.0.1) with an empty message, so fall back to its code.
  const detail =
    cause instanceof Error
      ? cause.message || (cause as { code?: string }).code || error.message
      : error.message;
  return detail.split("\n")[0];
}

/** Turns network and protection failures into an actionable message. */
function explainFailure(
  origin: string,
  status?: number,
  error?: unknown,
): string {
  if (status === 401 || status === 403) {
    return process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? `${origin} returned ${status}; check VERCEL_AUTOMATION_BYPASS_SECRET.`
      : `${origin} returned ${status}; set VERCEL_AUTOMATION_BYPASS_SECRET to bypass deployment protection.`;
  }
  if (status === 404) {
    return `Publication not found on ${origin}.`;
  }
  if (status) {
    return `${origin} returned ${status}.`;
  }
  const detail = error === undefined ? "" : errorDetail(error);
  if (isLocal(origin) && /ECONNREFUSED|ERR_CONNECTION_REFUSED/.test(detail)) {
    return `Could not connect to ${origin}; is the frontend running (pnpm run dev in frontend/)?`;
  }
  return detail
    ? `Request to ${origin} failed: ${detail}`
    : `Could not load ${origin}.`;
}

/** Recursively sorts object keys so equal data serializes identically. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonicalize(v)]),
    );
  }
  return value;
}

async function fetchPublicationJson(
  origin: string,
  options: Options,
): Promise<string> {
  const url = `${origin}${publicationPath(options)}.json`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: headersFor(origin, options.deployOrigin),
      // Custom headers would otherwise follow redirects to unrelated origins.
      redirect: "error",
    });
  } catch (error) {
    throw new Error(explainFailure(origin, undefined, error));
  }
  if (!res.ok) throw new Error(explainFailure(origin, res.status));
  return JSON.stringify(canonicalize(await res.json()), null, 2);
}

/**
 * Serializes a region as indented HTML with the noise that differs between
 * origins and builds removed. Runs in the browser.
 */
function serializeRegion(region: Element, volatile: string[]): string {
  const clone = region.cloneNode(true) as Element;
  clone
    .querySelectorAll(["script", "style", "noscript", ...volatile].join(","))
    .forEach((el) => el.remove());

  const origin = location.origin;
  // React's useId output depends on render order: `:r1:` (React 18), `«r1»`
  // (19.0–19.1), `_r_1_` (19.2+), with an uppercase R for server-rendered ids.
  // The exact shapes keep words like `_report_` from matching.
  const reactId = /[:«][rR][0-9a-z]+[:»]|_[rR]_[0-9a-z]+_/g;
  // Vite asset hashes, e.g. `/assets/logo-B3x9_aQ1.svg`.
  const assetHash = /(\/assets\/[^"'\s?]+)-[A-Za-z0-9_-]{8}(\.\w+)/g;
  const normalize = (value: string) =>
    value
      .split(origin)
      .join("")
      .replace(reactId, "«id»")
      .replace(assetHash, "$1$2");

  const lines: string[] = [];
  const walk = (node: Node, depth: number) => {
    const indent = "  ".repeat(depth);
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      if (text) lines.push(indent + text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const attrs = Array.from(el.attributes)
      .filter((a) => !a.name.startsWith("data-vite"))
      .map((a) => {
        // SSR writes `a:b` while the client writes `a: b;`; cssText is canonical.
        const value =
          a.name === "style" ? (el as HTMLElement).style.cssText : a.value;
        return `${a.name}="${normalize(value)}"`;
      })
      .sort();
    lines.push(`${indent}<${[tag, ...attrs].join(" ")}>`);
    el.childNodes.forEach((child) => walk(child, depth + 1));
    lines.push(`${indent}</${tag}>`);
  };
  walk(clone, 0);
  return lines.join("\n") + "\n";
}

/** Scrolls through the page so lazy images and observers fire, then returns to the top. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    window.scrollTo(0, 0);
  });
}

/** Loads every image in the compared regions, giving up on stragglers after a bound. */
async function loadImages(page: Page) {
  await page.evaluate(async (selectors) => {
    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>(
        selectors.map((selector) => `${selector} img`).join(","),
      ),
    );
    images.forEach((img) => (img.loading = "eager"));
    const loaded = Promise.all(
      images.map((img) => img.decode().catch(() => {})),
    );
    const timeout = new Promise((resolve) => setTimeout(resolve, 15_000));
    await Promise.race([loaded, timeout]);
  }, Object.values(REGIONS));
}

/** Hides fixed and sticky elements outside the compared regions so they don't overlay the screenshots. */
async function hideOverlays(page: Page) {
  await page.evaluate((selectors) => {
    const regions = selectors.map((selector) =>
      document.querySelector(selector),
    );
    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      const { position } = getComputedStyle(el);
      if (
        (position === "fixed" || position === "sticky") &&
        !regions.some((region) => region?.contains(el))
      ) {
        el.style.visibility = "hidden";
      }
    });
  }, Object.values(REGIONS));
}

async function render(
  browser: Browser,
  origin: string,
  options: Options,
): Promise<Rendered> {
  const context = await browser.newContext({
    viewport: { width: options.width, height: 900 },
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  const bypassHeaders = headersFor(origin, options.deployOrigin);
  if (Object.keys(bypassHeaders).length > 0) {
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (new URL(request.url()).origin !== options.deployOrigin) {
        await route.continue();
        return;
      }
      // route.continue headers also follow cross-origin redirects. Fetch one
      // hop and fulfill it so the browser routes each redirect independently.
      const response = await route.fetch({
        headers: {
          ...request.headers(),
          ...bypassHeaders,
          // Lets the browser keep the bypass in a cookie. Vercel answers with a
          // 307 that sets it, which the browser follows but a plain fetch can't.
          "x-vercel-set-bypass-cookie": "true",
        },
        maxRedirects: 0,
      });
      await route.fulfill({ response });
    });
  }
  // tsx compiles with esbuild's keepNames, which wraps functions passed to
  // page.evaluate in a `__name` helper that doesn't exist in the browser.
  await context.addInitScript("globalThis.__name = (fn) => fn;");
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXED_TIME);

  try {
    const url = `${origin}${publicationPath(options)}`;
    console.log(`Rendering ${url}...`);
    const response = await page
      .goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 })
      .catch((error: unknown) => {
        throw new Error(explainFailure(origin, undefined, error));
      });
    if (!response) throw new Error(explainFailure(origin));
    if (!response.ok() || new URL(page.url()).pathname === "/not-found") {
      throw new Error(explainFailure(origin, response.status()));
    }

    await page.locator(MAIN_COLUMN_ANCHOR).waitFor({ timeout: 30_000 });
    await scrollThrough(page);
    // Bounded and non-fatal, like `settle()` in tests/utils.ts.
    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => {});
    await loadImages(page);
    await page.evaluate(() => document.fonts.ready);
    await hideOverlays(page);

    const regions = REGION_NAMES.map((name) => {
      const locator = page.locator(REGIONS[name]);
      return { name, locator };
    });
    for (const { name, locator } of regions) {
      const count = await locator.count();
      if (count !== 1) {
        throw new Error(
          `Expected one ${name} region (${REGIONS[name]}) on ${origin}, found ${count}.`,
        );
      }
      // Excluded content must not contribute pixels or layout to the comparison.
      await locator.evaluate((region, volatile) => {
        region
          .querySelectorAll(volatile.join(","))
          .forEach((el) => el.remove());
      }, VOLATILE_SELECTORS);
    }

    const rendered = {} as Rendered;
    for (const { name, locator } of regions) {
      const html = await locator.evaluate(serializeRegion, VOLATILE_SELECTORS);
      const screenshot = await locator.screenshot({ animations: "disabled" });
      const text = (await locator.innerText()) + "\n";
      rendered[name] = { html, text, screenshot };
    }
    return rendered;
  } finally {
    // Requests still in flight, such as a slow image, would otherwise reject
    // inside the route handler once the context closes and crash the process.
    await context.unrouteAll({ behavior: "ignoreErrors" });
    await context.close();
  }
}

/** Copies an image onto a white canvas of the given size. */
function padTo(image: PNG, width: number, height: number): PNG {
  const padded = new PNG({ width, height });
  padded.data.fill(255);
  PNG.bitblt(image, padded, 0, 0, image.width, image.height, 0, 0);
  return padded;
}

function compareScreenshots(prod: Buffer, deploy: Buffer) {
  const a = PNG.sync.read(prod);
  const b = PNG.sync.read(deploy);
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const paddedProd = padTo(a, width, height);
  const paddedDeploy = padTo(b, width, height);
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(
    paddedProd.data,
    paddedDeploy.data,
    diff.data,
    width,
    height,
    { threshold: 0.1, diffColor: MISMATCH_COLOR },
  );
  return {
    prod: paddedProd,
    deploy: paddedDeploy,
    diff,
    diffImage: PNG.sync.write(diff),
    mismatched,
    mismatchPercent: (mismatched / (width * height)) * 100,
    heightDelta: b.height - a.height,
    widthDelta: b.width - a.width,
  };
}

/**
 * Mismatches below this percentage of a region are too small to find in the
 * full diff image, so zoomed crops around them are written as well.
 */
const DETAIL_MAX_PERCENT = 0.01;

/** Mismatched pixels closer than this many pixels share a crop. */
const DETAIL_GAP = 20;

/** Unchanged pixels shown around each group of mismatched ones. */
const DETAIL_PADDING = 20;

const DETAIL_MAX_CROPS = 10;

/** pixelmatch's color for mismatched pixels; anti-aliasing is drawn yellow. */
const MISMATCH_COLOR: [number, number, number] = [255, 0, 0];

interface MismatchBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pixels: number;
}

function boxesNear(a: MismatchBox, b: MismatchBox): boolean {
  return (
    a.x - DETAIL_GAP <= b.x + b.width &&
    b.x - DETAIL_GAP <= a.x + a.width &&
    a.y - DETAIL_GAP <= b.y + b.height &&
    b.y - DETAIL_GAP <= a.y + a.height
  );
}

function mergeBoxes(a: MismatchBox, b: MismatchBox): MismatchBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
    pixels: a.pixels + b.pixels,
  };
}

/** Groups the mismatched pixels in pixelmatch's diff output into boxes, top to bottom. */
function findMismatchBoxes(diff: PNG): MismatchBox[] {
  const [r, g, b] = MISMATCH_COLOR;
  let boxes: MismatchBox[] = [];
  for (let y = 0; y < diff.height; y++) {
    for (let x = 0; x < diff.width; x++) {
      const i = (y * diff.width + x) * 4;
      if (
        diff.data[i] !== r ||
        diff.data[i + 1] !== g ||
        diff.data[i + 2] !== b
      )
        continue;
      const pixel = { x, y, width: 1, height: 1, pixels: 1 };
      const index = boxes.findIndex((box) => boxesNear(box, pixel));
      if (index === -1) boxes.push(pixel);
      else boxes[index] = mergeBoxes(boxes[index], pixel);
    }
  }
  // Boxes grow as pixels join them and can come to overlap; merge until none do.
  for (let merged = true; merged;) {
    merged = false;
    const next: MismatchBox[] = [];
    for (const box of boxes) {
      const index = next.findIndex((other) => boxesNear(other, box));
      if (index === -1) next.push(box);
      else {
        next[index] = mergeBoxes(next[index], box);
        merged = true;
      }
    }
    boxes = next;
  }
  return boxes.sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * Renders zoomed crops of prod, deploy, and an overlay of the two side by side.
 * In the overlay, red marks ink only on prod and cyan ink only on deploy, so a
 * shifted glyph shows as a red edge on one side and a cyan edge on the other.
 */
function renderDetail(prod: PNG, deploy: PNG, box: MismatchBox): Buffer {
  const x0 = Math.max(0, box.x - DETAIL_PADDING);
  const y0 = Math.max(0, box.y - DETAIL_PADDING);
  const width = Math.min(prod.width, box.x + box.width + DETAIL_PADDING) - x0;
  const height =
    Math.min(prod.height, box.y + box.height + DETAIL_PADDING) - y0;
  // Scale small crops up to roughly 400px per panel; never shrink.
  const zoom = Math.max(
    1,
    Math.min(16, Math.floor(400 / Math.max(width, height))),
  );
  const separator = 8;
  const panelWidth = width * zoom;
  const out = new PNG({
    width: 3 * panelWidth + 2 * separator,
    height: height * zoom,
  });
  out.data.fill(255);

  const rgb = (image: PNG, x: number, y: number) => {
    const i = ((y0 + y) * image.width + x0 + x) * 4;
    return [image.data[i], image.data[i + 1], image.data[i + 2]];
  };
  const gray = (image: PNG, x: number, y: number) => {
    const [r, g, b] = rgb(image, x, y);
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  };
  const panels = [
    (x: number, y: number) => rgb(prod, x, y),
    (x: number, y: number) => rgb(deploy, x, y),
    (x: number, y: number) => {
      const p = gray(prod, x, y);
      return [gray(deploy, x, y), p, p];
    },
  ];
  panels.forEach((color, panel) => {
    const left = panel * (panelWidth + separator);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const [r, g, b] = color(x, y);
        for (let dy = 0; dy < zoom; dy++) {
          for (let dx = 0; dx < zoom; dx++) {
            const i = ((y * zoom + dy) * out.width + left + x * zoom + dx) * 4;
            out.data[i] = r;
            out.data[i + 1] = g;
            out.data[i + 2] = b;
          }
        }
      }
    }
  });
  // Separators between panels.
  for (let y = 0; y < out.height; y++) {
    for (const left of [panelWidth, 2 * panelWidth + separator]) {
      for (let x = left; x < left + separator; x++) {
        const i = (y * out.width + x) * 4;
        out.data[i] = out.data[i + 1] = out.data[i + 2] = 0;
      }
    }
  }
  return PNG.sync.write(out);
}

/** Counts added and removed lines in a patch. */
function countChangedLines(patch: StructuredPatch): number {
  return patch.hunks
    .flatMap((hunk) => hunk.lines)
    .filter((line) => line.startsWith("+") || line.startsWith("-")).length;
}

/** Diffs one region's captures, writes its artifacts, and returns its summary. */
function compareRegion(
  name: RegionName,
  prod: Capture,
  deploy: Capture,
  write: (file: string, contents: string | Buffer) => void,
) {
  const domPatch = structuredPatch(
    `${name}.prod.html`,
    `${name}.deploy.html`,
    prod.html,
    deploy.html,
  );
  const textPatch = structuredPatch(
    `${name}.prod.txt`,
    `${name}.deploy.txt`,
    prod.text,
    deploy.text,
  );
  const visual = compareScreenshots(prod.screenshot, deploy.screenshot);

  write(`html/${name}.prod.html`, prod.html);
  write(`html/${name}.deploy.html`, deploy.html);
  write(`html/${name}.diff`, formatPatch(domPatch));
  write(`txt/${name}.prod.txt`, prod.text);
  write(`txt/${name}.deploy.txt`, deploy.text);
  write(`txt/${name}.diff`, formatPatch(textPatch));
  write(`png/${name}.prod.png`, prod.screenshot);
  write(`png/${name}.deploy.png`, deploy.screenshot);
  write(`png/${name}.diff.png`, visual.diffImage);

  const mismatchBoxes =
    visual.mismatched > 0 && visual.mismatchPercent < DETAIL_MAX_PERCENT
      ? findMismatchBoxes(visual.diff)
      : [];
  mismatchBoxes.slice(0, DETAIL_MAX_CROPS).forEach((box, i) => {
    write(
      `png/${name}.detail-${i + 1}.png`,
      renderDetail(visual.prod, visual.deploy, box),
    );
  });

  return {
    name,
    domChangedLines: countChangedLines(domPatch),
    textChangedLines: countChangedLines(textPatch),
    pixelsMismatched: visual.mismatched,
    pixelMismatchPercent: Number(visual.mismatchPercent.toFixed(3)),
    // Unrounded for the threshold check: rounding can bring a mismatch just
    // over the threshold down to it, e.g. 0.0104% to 0.010%.
    exactMismatchPercent: visual.mismatchPercent,
    heightDelta: visual.heightDelta,
    widthDelta: visual.widthDelta,
    // Where small mismatches are; png/<region>.detail-<n>.png shows the first
    // DETAIL_MAX_CROPS of them.
    ...(mismatchBoxes.length > 0 && { mismatchBoxes }),
  };
}

async function main() {
  const options = parseOptions();
  const { deployOrigin, prodOrigin, slug, version } = options;
  const slugDirectory = join(
    DATA_DIR,
    `${CURRENT_DATE}-render-comparison`,
    // Keeps runs against different previews apart; local runs keep the short
    // path. Only the first label of the host, since dots in folder names cause
    // problems.
    isLocal(deployOrigin) ? "" : new URL(deployOrigin).hostname.split(".")[0],
    version ? `${slug}-${version}` : slug,
  );
  mkdirSync(slugDirectory, { recursive: true });
  // A folder per run, so files from earlier runs can't be mistaken for this
  // one's. Not recursive: a second run in the same second fails here instead of
  // mixing its files into the first run's folder.
  const outputDirectory = join(slugDirectory, CURRENT_TIME);
  mkdirSync(outputDirectory);
  const write = (name: string, contents: string | Buffer) => {
    const path = join(outputDirectory, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  };

  console.log(`Comparing ${deployOrigin} against ${prodOrigin}...`);

  const [prodData, deployData] = await Promise.all([
    fetchPublicationJson(prodOrigin, options),
    fetchPublicationJson(deployOrigin, options),
  ]);
  const dataIdentical = prodData === deployData;
  if (!dataIdentical) {
    write("prod.json", prodData);
    write("deploy.json", deployData);
    console.warn(
      "\n⚠️  The publication data differs between the two backends, so render differences may come from data, not code. See prod.json and deploy.json.\n",
    );
  }

  const browser = await chromium.launch();
  let prod: Rendered;
  let deploy: Rendered;
  try {
    prod = await render(browser, prodOrigin, options);
    deploy = await render(browser, deployOrigin, options);
  } finally {
    await browser.close();
  }

  const regions = REGION_NAMES.map((name) =>
    compareRegion(name, prod[name], deploy[name], write),
  );
  const summary = {
    prod: `${prodOrigin}${publicationPath(options)}`,
    deploy: `${deployOrigin}${publicationPath(options)}`,
    dataIdentical,
    regions: Object.fromEntries(
      regions.map(({ name, exactMismatchPercent, ...rest }) => [name, rest]),
    ),
  };
  write("summary.json", JSON.stringify(summary, null, 2) + "\n");

  const pad = (value: string | number) => String(value).padStart(10);
  console.log(`
Data identical: ${summary.dataIdentical ? "yes" : "no"}

            ${REGION_NAMES.map(pad).join("")}
Text lines  ${regions.map((r) => pad(r.textChangedLines)).join("")}
DOM lines   ${regions.map((r) => pad(r.domChangedLines)).join("")}
Pixels      ${regions.map((r) => pad(r.pixelsMismatched)).join("")}
Pixels %    ${regions.map((r) => pad(r.pixelMismatchPercent)).join("")}
Height px   ${regions.map((r) => pad(r.heightDelta)).join("")}   (deploy − prod)

Artifacts written to ${outputDirectory}`);
  for (const { name, mismatchBoxes } of regions) {
    if (!mismatchBoxes) continue;
    const crops = Math.min(mismatchBoxes.length, DETAIL_MAX_CROPS);
    const files =
      crops === 1
        ? `png/${name}.detail-1.png`
        : `png/${name}.detail-1.png to detail-${crops}.png`;
    console.log(
      `Small ${name} pixel differences in ${mismatchBoxes.length} place${mismatchBoxes.length === 1 ? "" : "s"}; zoomed crops: ${files}`,
    );
  }

  const visualDiffers = regions.filter(
    (r) =>
      r.exactMismatchPercent > options.threshold ||
      r.heightDelta !== 0 ||
      r.widthDelta !== 0,
  );
  const markupDiffers = regions.filter(
    (r) => r.domChangedLines > 0 || r.textChangedLines > 0,
  );
  const names = (list: typeof regions) => list.map((r) => r.name).join(", ");
  if (visualDiffers.length > 0) {
    console.error(`\nResult: renders differ (${names(visualDiffers)})`);
    process.exit(1);
  }
  if (markupDiffers.length > 0) {
    console.warn(
      `\nResult: renders look the same, but the DOM differs (${names(markupDiffers)}); see the .diff files in html/ and txt/`,
    );
    return;
  }
  console.log("\nResult: renders match");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
});
