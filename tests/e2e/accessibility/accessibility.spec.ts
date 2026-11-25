import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { PublicationPage } from "@/e2e/models/publication-page";
import { settle } from "@/utils";

const PUBLICATION_SLUG =
  process.env.PLAYWRIGHT_A11Y_PUBLICATION_SLUG || "tardigrade-test";

const staticRoutes = [
  { path: "/", name: "Home" },
  { path: "/login", name: "Log in" },
  { path: "/register", name: "Sign up" },
  { path: "/about", name: "About" },
];

/**
 * Runs axe over the whole page, attaches the full results, and fails with one
 * line per violation so the report says what to fix without opening the JSON.
 */
async function expectNoViolations(page: Page, testInfo: TestInfo) {
  const results = await new AxeBuilder({ page }).analyze();
  await testInfo.attach("axe-results", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
  const summary = results.violations.map(
    (v) =>
      `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}×, e.g. ${v.nodes[0]?.target.join(" ")})`,
  );
  expect(summary, `Accessibility violations on ${page.url()}`).toEqual([]);
}

test.describe("accessibility", { tag: "@accessibility" }, () => {
  for (const route of staticRoutes) {
    test(`${route.name} (${route.path}) has no violations`, async ({
      page,
    }, testInfo) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await settle(page);
      await expectNoViolations(page, testInfo);
    });
  }

  test("publication has no violations", async ({ page }, testInfo) => {
    await new PublicationPage(page, PUBLICATION_SLUG).goto();
    await expectNoViolations(page, testInfo);
  });
});
