import { expect, test } from "@playwright/test";
import { PublicationPage } from "@/e2e/models/publication-page";
import { settle } from "@/utils";
import {
  attachMetrics,
  diffMetrics,
  getBrowserPerformanceEntries,
  getResizeListenerCount,
  installBrowserPerformanceObservers,
  installResizeListenerCounter,
  readCdpMetrics,
  resetBrowserPerformanceEntries,
} from "@/e2e/performance/metrics";

const PERFORMANCE_PUBLICATION_SLUG =
  process.env.PLAYWRIGHT_PERF_PUBLICATION_SLUG || "tardigrade-test";
const LIGHTBOX_PUBLICATION_SLUG =
  process.env.PLAYWRIGHT_PERF_LIGHTBOX_PUBLICATION_SLUG ||
  PERFORMANCE_PUBLICATION_SLUG;

const VIEWPORT_HEIGHT = 900;
const MOBILE_WIDTH = 700;
const DESKTOP_WIDTH = 1200;

test.describe(
  "publication runtime performance",
  { tag: "@performance" },
  () => {
    test.describe.configure({ mode: "serial" });

    test.beforeEach(async ({ browserName, page }) => {
      test.skip(
        browserName !== "chromium",
        "CDP performance metrics are only available in Chromium.",
      );
      await installBrowserPerformanceObservers(page);
    });

    test("captures publication resize metrics", async ({ page }, testInfo) => {
      await page.setViewportSize({
        width: DESKTOP_WIDTH,
        height: VIEWPORT_HEIGHT,
      });
      const publicationPage = new PublicationPage(
        page,
        PERFORMANCE_PUBLICATION_SLUG,
      );
      await publicationPage.goto();

      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Performance.enable");
      await resetBrowserPerformanceEntries(page);
      const before = await readCdpMetrics(cdp);
      const startedAt = await page.evaluate(() => performance.now());

      const widths = [];
      for (let width = DESKTOP_WIDTH; width >= MOBILE_WIDTH; width -= 20) {
        widths.push(width);
      }
      for (let width = MOBILE_WIDTH + 20; width <= DESKTOP_WIDTH; width += 20) {
        widths.push(width);
      }

      for (const width of widths) {
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(250);

      const finishedAt = await page.evaluate(() => performance.now());
      const after = await readCdpMetrics(cdp);
      const entries = await getBrowserPerformanceEntries(page);
      const metrics = {
        publicationSlug: PERFORMANCE_PUBLICATION_SLUG,
        resizeEvents: widths.length,
        elapsedMs: finishedAt - startedAt,
        cdpDelta: diffMetrics(before, after),
        layoutShiftCount: entries.layoutShifts.length,
        observedLayoutShiftScore: entries.layoutShifts.reduce(
          (sum, entry) => sum + entry.value,
          0,
        ),
        longAnimationFrameCount: entries.longAnimationFrames.length,
        longestAnimationFrameMs: Math.max(0, ...entries.longAnimationFrames),
        longTaskCount: entries.longTasks.length,
        longestTaskMs: Math.max(0, ...entries.longTasks),
      };

      await attachMetrics(testInfo, "publication-resize", metrics);
      expect(metrics.resizeEvents).toBeGreaterThan(0);
    });

    test("does not accumulate resize listeners across repeated client-side navigation", async ({
      page,
    }, testInfo) => {
      await installResizeListenerCounter(page);

      const publicationPath = `/publications/${PERFORMANCE_PUBLICATION_SLUG}`;
      await page.goto(publicationPath, { waitUntil: "domcontentloaded" });
      await page.locator("#publication-body").waitFor({ state: "visible" });

      await page.getByRole("link", { name: "Home" }).first().click();
      await page.waitForURL((url) => url.pathname === "/");
      await settle(page);

      const publicationLink = page
        .locator(`a[href="${publicationPath}"]`)
        .first();
      test.skip(
        (await publicationLink.count()) === 0,
        "The performance publication must be linked from the home page for client-side navigation.",
      );

      const baseline = await getResizeListenerCount(page);
      const listenerCounts: number[] = [];
      for (let index = 0; index < 10; index += 1) {
        await publicationLink.click();
        await page.locator("#publication-body").waitFor({ state: "visible" });
        await page.getByRole("link", { name: "Home" }).first().click();
        await page.waitForURL((url) => url.pathname === "/");
        await settle(page);
        listenerCounts.push(await getResizeListenerCount(page));
      }

      const metrics = {
        publicationSlug: PERFORMANCE_PUBLICATION_SLUG,
        navigationCycles: listenerCounts.length,
        baseline,
        listenerCounts,
        maximumGrowth: Math.max(...listenerCounts) - baseline,
      };
      await attachMetrics(testInfo, "resize-listener-lifecycle", metrics);

      expect(metrics.maximumGrowth).toBe(0);
    });

    test("does not render comment bubbles at stale breakpoint coordinates", async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({
        width: DESKTOP_WIDTH,
        height: VIEWPORT_HEIGHT,
      });
      const publicationPage = new PublicationPage(
        page,
        PERFORMANCE_PUBLICATION_SLUG,
      );
      await publicationPage.goto();

      const bubbles = page.locator('[id^="paragraph-group-"]');
      test.skip(
        (await bubbles.count()) === 0,
        "The performance publication needs at least one visible inline-comment bubble.",
      );

      await page.setViewportSize({
        width: MOBILE_WIDTH,
        height: VIEWPORT_HEIGHT,
      });
      await expect(bubbles).toHaveCount(0);

      await page.evaluate(() => {
        const perfWindow = window as typeof window & {
          __breakpointSamples: Array<{
            errorPx: number;
            activeTransitions: number;
          }>;
          __breakpointSamplingDone: boolean;
        };
        perfWindow.__breakpointSamples = [];
        perfWindow.__breakpointSamplingDone = false;

        window.addEventListener(
          "resize",
          () => {
            let framesRemaining = 45;
            const sample = () => {
              const group = document.querySelector<HTMLElement>(
                '[id^="paragraph-group-"]',
              );
              const publicationBody =
                document.getElementById("publication-body");
              if (group && publicationBody) {
                const commentId = group.id.replace("paragraph-group-", "");
                const anchor = document.querySelector<HTMLElement>(
                  `.comment-anchor-wrapper[data-comment-ids~="${commentId}"]`,
                );
                if (anchor) {
                  const expectedTop =
                    anchor.getBoundingClientRect().top -
                    publicationBody.getBoundingClientRect().top;
                  const actualTop = Number.parseFloat(group.style.top);
                  perfWindow.__breakpointSamples.push({
                    errorPx: Math.abs(actualTop - expectedTop),
                    activeTransitions: group
                      .getAnimations()
                      .filter((animation) => animation.playState === "running")
                      .length,
                  });
                }
              }

              framesRemaining -= 1;
              if (framesRemaining > 0) {
                requestAnimationFrame(sample);
              } else {
                perfWindow.__breakpointSamplingDone = true;
              }
            };
            requestAnimationFrame(sample);
          },
          { once: true },
        );
      });

      await page.setViewportSize({
        width: DESKTOP_WIDTH,
        height: VIEWPORT_HEIGHT,
      });
      await expect(bubbles.first()).toBeVisible();
      // A fixed wait would need to outlast 45 requestAnimationFrame ticks
      // (~751ms at a theoretical 60fps) with almost no slack, and would
      // silently truncate the sample set on a loaded or janky runner -
      // exactly the condition this test exists to catch. Wait for the
      // sampling loop to report it's actually done instead.
      await page.waitForFunction(
        () =>
          (window as typeof window & { __breakpointSamplingDone: boolean })
            .__breakpointSamplingDone,
        undefined,
        { timeout: 5_000 },
      );

      const samples = await page.evaluate(() => {
        const perfWindow = window as typeof window & {
          __breakpointSamples: Array<{
            errorPx: number;
            activeTransitions: number;
          }>;
        };
        return perfWindow.__breakpointSamples;
      });
      const metrics = {
        publicationSlug: PERFORMANCE_PUBLICATION_SLUG,
        sampledFrames: samples.length,
        wrongCoordinateFrames: samples.filter((sample) => sample.errorPx > 2)
          .length,
        maximumCoordinateErrorPx: Math.max(
          0,
          ...samples.map((sample) => sample.errorPx),
        ),
        framesWithActiveTransitions: samples.filter(
          (sample) => sample.activeTransitions > 0,
        ).length,
      };
      await attachMetrics(testInfo, "comment-breakpoint", metrics);

      expect(metrics.sampledFrames).toBeGreaterThan(0);
      expect(metrics.wrongCoordinateFrames).toBe(0);
    });

    test("sizes an aspect-ratio iframe on the lightbox first frame", async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({
        width: DESKTOP_WIDTH,
        height: VIEWPORT_HEIGHT,
      });
      const publicationPage = new PublicationPage(
        page,
        LIGHTBOX_PUBLICATION_SLUG,
      );
      await publicationPage.goto();

      const figures = page
        .locator("#publication-body figure")
        .filter({ has: page.locator("iframe") })
        .filter({ has: page.locator('button[aria-label="Expand"]') });
      let figureIndex = -1;
      for (let index = 0; index < (await figures.count()); index += 1) {
        const hasAspectRatio = await figures
          .nth(index)
          .locator("iframe")
          .evaluate((iframe) =>
            Array.from(iframe.attributes).some(
              (attribute) =>
                attribute.name.includes("aspect") &&
                // CSS aspect-ratio (and thus this attribute, copied from the
                // MyST directive) accepts either a "w/h" fraction or a bare
                // decimal number.
                /^\s*\d+(?:\.\d+)?\s*(?:\/\s*\d+(?:\.\d+)?\s*)?$/.test(
                  attribute.value,
                ),
            ),
          );
        if (hasAspectRatio) {
          figureIndex = index;
          break;
        }
      }
      test.skip(
        figureIndex === -1,
        "The lightbox performance publication needs an expandable iframe with an aspect-ratio data attribute.",
      );

      await page.setViewportSize({ width: 900, height: 700 });
      await resetBrowserPerformanceEntries(page);
      await page.evaluate(() => {
        const perfWindow = window as typeof window & {
          __lightboxSizeSamples: Array<{ width: number; height: number }>;
        };
        perfWindow.__lightboxSizeSamples = [];

        // Guards against starting a second, overlapping sampling loop: Radix
        // Dialog's portal/focus-trap effects can commit the dialog DOM across
        // more than one React commit, so a second mutation batch can arrive
        // before the first sample's requestAnimationFrame has fired. The
        // guard is armed synchronously here rather than by checking
        // __lightboxSizeSamples.length, which would still be 0 during that
        // window.
        let samplingStarted = false;
        const observer = new MutationObserver(() => {
          const iframe = document.querySelector<HTMLIFrameElement>(
            '[role="dialog"] iframe',
          );
          if (!iframe || samplingStarted) return;
          samplingStarted = true;

          let framesRemaining = 30;
          const sample = () => {
            const style = getComputedStyle(iframe);
            perfWindow.__lightboxSizeSamples.push({
              width: Number.parseFloat(style.width),
              height: Number.parseFloat(style.height),
            });
            framesRemaining -= 1;
            if (framesRemaining > 0) {
              requestAnimationFrame(sample);
            } else {
              observer.disconnect();
            }
          };
          requestAnimationFrame(sample);
        });
        observer.observe(document.body, { childList: true, subtree: true });
      });

      const figure = figures.nth(figureIndex);
      await figure.locator('button[aria-label="Expand"]').click();
      await page
        .locator('[role="dialog"] iframe')
        .waitFor({ state: "visible" });
      await page.waitForTimeout(600);

      const samples = await page.evaluate(() => {
        const perfWindow = window as typeof window & {
          __lightboxSizeSamples: Array<{ width: number; height: number }>;
        };
        return perfWindow.__lightboxSizeSamples;
      });
      const entries = await getBrowserPerformanceEntries(page);
      const first = samples[0];
      const final = samples[samples.length - 1];
      const firstFrameDeltaPx =
        first && final
          ? Math.max(
              Math.abs(first.width - final.width),
              Math.abs(first.height - final.height),
            )
          : Number.POSITIVE_INFINITY;
      const metrics = {
        publicationSlug: LIGHTBOX_PUBLICATION_SLUG,
        sampledFrames: samples.length,
        firstSize: first,
        finalSize: final,
        firstFrameDeltaPx,
        distinctComputedSizes: new Set(
          samples.map(
            (sample) =>
              `${sample.width.toFixed(1)}x${sample.height.toFixed(1)}`,
          ),
        ).size,
        layoutShiftCount: entries.layoutShifts.length,
        observedLayoutShiftScore: entries.layoutShifts.reduce(
          (sum, entry) => sum + entry.value,
          0,
        ),
      };
      await attachMetrics(testInfo, "lightbox-first-frame", metrics);

      expect(metrics.sampledFrames).toBeGreaterThan(0);
      expect(metrics.firstFrameDeltaPx).toBeLessThanOrEqual(0.5);
    });
  },
);
