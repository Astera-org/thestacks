import { expect, type Page, test } from "@playwright/test";
import { DevicePage } from "@/e2e/models/device-page";
import { LoginPage } from "@/e2e/models/login-page";
import { authenticateTestUser, isTestUserConfigured } from "@/utils";

// Better Auth's device-authorization endpoints. They're mocked so each test
// controls the code's state, without needing a real CLI login in progress.
// The verify endpoint is `GET /device?user_code=…`; the regex keeps it from
// matching `/device/approve` and `/device/deny`.
const VERIFY_ENDPOINT = /\/api\/auth2\/device(\?|$)/;
const DECISION_ENDPOINTS = {
  approve: "**/api/auth2/device/approve",
  deny: "**/api/auth2/device/deny",
} as const;

const USER_CODE = "ABCD1234";
const SHOWN_CODE = "ABCD-1234";

type MockResponse =
  | { status: number; json: Record<string, unknown> }
  | "network-error";

/** A Better Auth device endpoint error, as `APIError` sends it. */
function deviceError(status: number, error: string): MockResponse {
  return { status, json: { error, error_description: error } };
}

async function fulfill(
  route: Parameters<Parameters<Page["route"]>[1]>[0],
  response: MockResponse,
) {
  if (response === "network-error") return route.abort("failed");
  return route.fulfill(response);
}

/**
 * Answers the verify endpoint with `response`, and returns the `user_code`
 * values it was called with.
 */
async function mockVerify(page: Page, response: MockResponse) {
  const userCodes: (string | null)[] = [];
  await page.route(VERIFY_ENDPOINT, (route) => {
    userCodes.push(
      new URL(route.request().url()).searchParams.get("user_code"),
    );
    return fulfill(route, response);
  });
  return userCodes;
}

const PENDING: MockResponse = {
  status: 200,
  json: { user_code: USER_CODE, status: "pending" },
};

/**
 * Answers the approve or deny endpoint with `response`, and returns the
 * request bodies it received.
 */
async function mockDecision(
  page: Page,
  action: keyof typeof DECISION_ENDPOINTS,
  response: MockResponse,
) {
  const bodies: unknown[] = [];
  await page.route(DECISION_ENDPOINTS[action], (route) => {
    bodies.push(route.request().postDataJSON());
    return fulfill(route, response);
  });
  return bodies;
}

test.describe("device authorization", () => {
  test.skip(
    !isTestUserConfigured(),
    "Skipping device authorization tests: test user credentials are not configured.",
  );

  test("a signed-out user returns to the linked code after logging in", async ({
    page,
  }) => {
    const verifiedCodes = await mockVerify(page, PENDING);
    const devicePage = new DevicePage(page);

    await devicePage.goto(USER_CODE);
    await page.waitForURL("/login");

    await new LoginPage(page).login(`/device?user_code=${USER_CODE}`);

    await expect(devicePage.confirmHeading).toBeVisible();
    await expect(devicePage.shownCode(SHOWN_CODE)).toBeVisible();
    expect(verifiedCodes).toContain(USER_CODE);
  });

  test.describe("signed in", () => {
    let devicePage: DevicePage;

    test.beforeEach(async ({ page }) => {
      // `page.request` shares the browser's cookies, so this signs the page in.
      await authenticateTestUser(page.request);
      devicePage = new DevicePage(page);
    });

    test.describe("checking a code", () => {
      test("a pending code opens the confirmation screen", async ({ page }) => {
        const verifiedCodes = await mockVerify(page, PENDING);

        await devicePage.goto();
        // Typed the way people copy it: lower case, with the dash.
        await devicePage.submitCode("abcd-1234");

        await expect(devicePage.confirmHeading).toBeFocused();
        await expect(devicePage.shownCode(SHOWN_CODE)).toBeVisible();
        await expect(devicePage.approveButton).toBeEnabled();
        expect(verifiedCodes).toEqual([USER_CODE]);
      });

      const rejectedCodes: {
        name: string;
        response: MockResponse;
        message: string;
      }[] = [
        {
          name: "an expired code",
          response: deviceError(400, "expired_token"),
          message: "That code has expired.",
        },
        {
          name: "an already-approved code",
          response: {
            status: 200,
            json: { user_code: USER_CODE, status: "approved" },
          },
          message: "That code has already been used.",
        },
        {
          name: "an already-denied code",
          response: {
            status: 200,
            json: { user_code: USER_CODE, status: "denied" },
          },
          message: "That code has already been used.",
        },
        {
          name: "an unknown code",
          response: deviceError(400, "invalid_request"),
          message: "That code is invalid or expired.",
        },
        {
          name: "a server error",
          response: deviceError(500, "internal_server_error"),
          message: "Something went wrong on our end.",
        },
        {
          name: "a network failure",
          response: "network-error",
          message: "We couldn't reach the server.",
        },
      ];

      for (const { name, response, message } of rejectedCodes) {
        test(`${name} stays on the entry form with an error`, async ({
          page,
        }) => {
          await mockVerify(page, response);

          await devicePage.goto();
          await devicePage.submitCode(USER_CODE);

          await expect(devicePage.alert).toContainText(message);
          await expect(devicePage.codeInput).toBeEnabled();
          await expect(devicePage.confirmHeading).toBeHidden();
          await expect(devicePage.approveButton).toBeHidden();
        });
      }

      test("a rejected linked code falls back to the entry form", async ({
        page,
      }) => {
        await mockVerify(page, deviceError(400, "expired_token"));

        await devicePage.goto(USER_CODE);

        await expect(devicePage.alert).toContainText("That code has expired.");
        await expect(devicePage.codeInput).toBeEnabled();
        await expect(devicePage.approveButton).toBeHidden();
      });
    });

    test.describe("deciding", () => {
      test.beforeEach(async ({ page }) => {
        await mockVerify(page, PENDING);
        await devicePage.goto(USER_CODE);
        await expect(devicePage.confirmHeading).toBeVisible();
      });

      test("approving shows that the device is connected", async ({ page }) => {
        const bodies = await mockDecision(page, "approve", {
          status: 200,
          json: { success: true },
        });

        await devicePage.approveButton.click();

        await expect(devicePage.connectedHeading).toBeFocused();
        await expect(devicePage.deniedHeading).toBeHidden();
        expect(bodies).toEqual([{ userCode: USER_CODE }]);
      });

      test("denying shows that the request was denied", async ({ page }) => {
        const bodies = await mockDecision(page, "deny", {
          status: 200,
          json: { success: true },
        });

        await devicePage.denyButton.click();

        await expect(devicePage.deniedHeading).toBeFocused();
        await expect(devicePage.connectedHeading).toBeHidden();
        expect(bodies).toEqual([{ userCode: USER_CODE }]);
      });

      const failures: {
        action: keyof typeof DECISION_ENDPOINTS;
        name: string;
        response: MockResponse;
        message: string;
      }[] = [
        {
          action: "approve",
          name: "the code expired",
          response: deviceError(400, "expired_token"),
          message: "That code has expired.",
        },
        {
          action: "approve",
          name: "the code belongs to another account",
          response: deviceError(403, "access_denied"),
          message: "This code was opened by a different account.",
        },
        {
          action: "approve",
          name: "the server errors",
          response: deviceError(500, "internal_server_error"),
          message: "Something went wrong on our end.",
        },
        {
          action: "approve",
          name: "the network fails",
          response: "network-error",
          message: "We couldn't reach the server.",
        },
        {
          action: "deny",
          name: "the server errors",
          response: deviceError(500, "internal_server_error"),
          message: "Something went wrong on our end.",
        },
        {
          action: "deny",
          name: "the network fails",
          response: "network-error",
          message: "We couldn't reach the server.",
        },
      ];

      for (const { action, name, response, message } of failures) {
        test(`a failed ${action} when ${name} shows an error, not a result`, async ({
          page,
        }) => {
          await mockDecision(page, action, response);

          await devicePage[`${action}Button`].click();

          await expect(devicePage.alert).toContainText(message);
          // Still on the confirmation screen, so the user can try again.
          await expect(devicePage.confirmHeading).toBeVisible();
          await expect(devicePage.approveButton).toBeEnabled();
          await expect(devicePage.denyButton).toBeEnabled();
          await expect(devicePage.connectedHeading).toBeHidden();
          await expect(devicePage.deniedHeading).toBeHidden();
        });
      }
    });
  });
});
