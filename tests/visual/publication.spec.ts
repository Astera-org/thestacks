import { expect, test, waitForStablePage } from "./harness";
import { recordedPublications, TIMELINE } from "./recordings.ts";

// Every publication recorded in publications/ (see record-publication.ts and
// fixture-server.ts), served from its recorded API responses, as a full page.
// Each needs at least one comment: the test opens comments and waits for one.
const RECORDINGS = recordedPublications();

// Collapsibles left closed (by summary text), so the closed state stays covered.
const KEEP_CLOSED = ["An explicitly closed details block"];

// Mobile also emulates touch, so hover-only styles render as on a phone.
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
};

for (const [name, options] of Object.entries(VIEWPORTS)) {
  test.describe(name, () => {
    test.use(options);

    for (const { slug, recordedAt, source } of RECORDINGS) {
      // Comments start collapsed: the toggle assertion below fails otherwise.
      // The report shows when and where the recording was taken.
      const recorded = {
        annotation: {
          type: "recorded",
          description: `${recordedAt} from ${source}`,
        },
      };
      test(`${slug} with comments open`, recorded, async ({ page }) => {
        // A long page's scrolls and full-page captures take tens of seconds
        // under parallel load, past the default 30s; slow() triples it.
        test.slow();
        // Comment times are relative to now; pin now to the recordings' timeline.
        await page.clock.setFixedTime(new Date(TIMELINE.now));

        const comments = page.waitForResponse((response) =>
          new URL(response.url()).pathname.startsWith(
            "/api/comments/publication/",
          ),
        );
        const response = await page.goto(`/publications/${slug}`);
        expect(response?.status(), "status of the publication page").toBe(200);

        // The navbar's sign-up link only renders once the page has hydrated.
        await page
          .locator('header[data-vt="navbar"] a[href="/register"]')
          .waitFor({ state: "attached" });
        await comments;

        const toggle = page.locator('button[aria-controls="comments-content"]');
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await page
          .locator("#comments-content [data-comment-id]")
          .first()
          .waitFor();
        // Open the body's collapsibles (nested ones too), so the content behind
        // them is compared as well; KEEP_CLOSED ones stay as authored.
        await page
          .locator("#publication-body details")
          .evaluateAll((elements: HTMLDetailsElement[], keepClosed) => {
            for (const details of elements) {
              const summary = details.querySelector(":scope > summary");
              const text = summary?.textContent?.trim() ?? "";
              if (!keepClosed.includes(text)) details.open = true;
            }
          }, KEEP_CLOSED);
        // The click scrolled to the toggle; capture from the top, since sticky
        // elements and the TOC follow the scroll position.
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await waitForStablePage(page);

        // Embeds get blank local responses (see harness.ts); mask their boxes.
        // A long page takes seconds per capture, and a new baseline needs two
        // matching ones; the default 5s fits only one.
        await expect(page).toHaveScreenshot(`${slug}-${name}-comments.png`, {
          fullPage: true,
          mask: [page.locator("#publication-body :is(iframe, video, audio)")],
          timeout: 30_000,
        });
      });
    }
  });
}
