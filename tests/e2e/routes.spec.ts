import { ConsoleMessage, expect, Page, test } from "@playwright/test";

/**
 * Static routes that don't require authentication or dynamic parameters.
 */
const publicStaticRoutes = [
  { path: "/", name: "Home" },
  { path: "/login", name: "Log in" },
  { path: "/register", name: "Sign up" },
  { path: "/about", name: "About" },
  { path: "/terms", name: "Terms" },
  { path: "/privacy-policy", name: "Privacy Policy" },
];

/**
 * Routes that require authentication. These should redirect to login.
 */
const authRequiredRoutes = [
  { path: "/account/settings", name: "Account Settings" },
  { path: "/account/notifications", name: "Account Notifications" },
  { path: "/account/publications", name: "Account Publications" },
];

const ignoredErrorMessagePatterns = [
  "Failed to load resource",
  "favicon",
  // This message appears for the `/publications/[slug]` route because of an iframe (likely TypeForm).
  "Potential permissions policy violation",
];

function getConsoleErrors(page: Page): string[] {
  const consoleErrors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (
      msg.type() === "error" &&
      !ignoredErrorMessagePatterns.some((pattern) =>
        msg.text().includes(pattern),
      )
    ) {
      consoleErrors.push(msg.text());
    }
  });
  return consoleErrors;
}

test.describe("loads public static routes successfully", () => {
  for (const route of publicStaticRoutes) {
    test(`${route.name} (${route.path}) loads successfully`, async ({
      page,
    }) => {
      const response = await page.goto(route.path, {
        waitUntil: "domcontentloaded",
      });
      expect(response).not.toBeNull();
      expect(response!.status()).toBeGreaterThanOrEqual(200);
      expect(response!.status()).toBeLessThan(300);

      const criticalErrors = getConsoleErrors(page);
      expect(
        criticalErrors,
        `Console errors found on ${route.path}`,
      ).toHaveLength(0);

      const body = page.locator("body");
      await expect(body).not.toBeEmpty();
    });
  }
});

test.describe("redirects to login for auth-required routes", () => {
  for (const route of authRequiredRoutes) {
    test(`${route.name} (${route.path}) handles unauthenticated access`, async ({
      page,
    }) => {
      const response = await page.goto(route.path, {
        waitUntil: "domcontentloaded",
      });
      expect(response).not.toBeNull();
      // The redirect can land after the initial document, so wait it out.
      await page.waitForURL(/\/login/);

      const criticalErrors = getConsoleErrors(page);
      expect(
        criticalErrors,
        `Console errors found on ${route.path}`,
      ).toHaveLength(0);
    });
  }
});

test.describe("loads dynamic routes with sample data successfully", () => {
  test("Publication page loads for existing publication", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // `count()` doesn't auto-wait, so give the list a chance to render first.
    const publicationLink = page.locator('a[href^="/publications/"]').first();
    await publicationLink.waitFor({ state: "attached" }).catch(() => {});
    const hasPublications = (await publicationLink.count()) > 0;

    if (hasPublications) {
      const href = await publicationLink.getAttribute("href");
      const response = await page.goto(href!, {
        waitUntil: "domcontentloaded",
      });

      expect(response).not.toBeNull();
      expect(response!.status()).toBeGreaterThanOrEqual(200);
      expect(response!.status()).toBeLessThan(300);

      const criticalErrors = getConsoleErrors(page);
      expect(criticalErrors, `Console errors found`).toHaveLength(0);
    } else {
      test.skip();
    }
  });

  test("can load user profile page for existing user", async ({ page }) => {
    const response = await page.goto("/users/wasim.amiri", {
      waitUntil: "domcontentloaded",
    });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeGreaterThanOrEqual(200);
    expect(response!.status()).toBeLessThan(300);

    const criticalErrors = getConsoleErrors(page);
    expect(criticalErrors, `Console errors found`).toHaveLength(0);
  });

  test("can load organization page for Arcadia Science", async ({ page }) => {
    const response = await page.goto("/organizations/arcadia-science", {
      waitUntil: "domcontentloaded",
    });
    expect(response).not.toBeNull();
    expect(response!.status()).toBeGreaterThanOrEqual(200);
    expect(response!.status()).toBeLessThan(300);

    const criticalErrors = getConsoleErrors(page);
    expect(criticalErrors, `Console errors found`).toHaveLength(0);
  });
});

test.describe("handles error cases successfully", () => {
  test("redirects to 404 page for non-existent route", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-12345", {
      waitUntil: "domcontentloaded",
    });

    expect(response).not.toBeNull();
    expect([200, 404]).toContain(response!.status());
    await expect(page.getByText("Page not found")).toBeVisible();

    const criticalErrors = getConsoleErrors(page);
    expect(criticalErrors, `Console errors found`).toHaveLength(0);
  });

  test("redirects to 404 page for non-existent publication", async ({
    page,
  }) => {
    const slug = "non-existent-slug-12345";
    const response = await page.goto(`/publications/${slug}`, {
      waitUntil: "domcontentloaded",
    });

    expect(response).not.toBeNull();
    expect([200, 302, 404]).toContain(response!.status());
    expect(response!.url()).toContain(`/publications/${slug}`);
    await expect(page.getByText("Page not found")).toBeVisible();

    const criticalErrors = getConsoleErrors(page);
    expect(criticalErrors, `Console errors found`).toHaveLength(0);
  });
});
