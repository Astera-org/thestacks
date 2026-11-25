import { expect, Locator, type Page } from "@playwright/test";
import { settle } from "@/utils";

export class LoginPage {
  private readonly username: string;
  private readonly password: string;

  private readonly loginButton: Locator;
  private readonly usernameTextField: Locator;
  private readonly passwordTextField: Locator;
  private readonly submitButton: Locator;

  constructor(public readonly page: Page) {
    const username = process.env.PLAYWRIGHT_TEST_USER_USERNAME || "";
    const password = process.env.PLAYWRIGHT_TEST_USER_PASSWORD || "";

    if (!username || !password) {
      throw new Error(
        "PLAYWRIGHT_TEST_USER_USERNAME and PLAYWRIGHT_TEST_USER_PASSWORD must be set",
      );
    }

    this.username = username;
    this.password = password;

    this.loginButton = this.page.getByText("Log in");
    this.usernameTextField = this.page.getByLabel("Username or Email");
    this.passwordTextField = this.page.getByLabel("Password", { exact: true });
    this.submitButton = this.page.getByRole("button", { name: "Log in" });
  }

  async goto() {
    await this.page.goto("/");
  }

  /**
   * Logs in with the test user credentials, clicking the navbar's "Log in"
   * link first if not already on `/login`.
   *
   * @param expectedUrl - The URL to wait for after a successful login. The
   * post-login redirect target depends on how the user got to `/login`, so
   * this defaults to "/" to match a plain, origin-less login.
   */
  async login(expectedUrl = "/") {
    if (!this.page.url().includes("/login")) {
      await this.loginButton.click();
      await this.page.waitForURL("/login");
    }

    await expect(this.usernameTextField).toBeVisible();
    await expect(this.passwordTextField).toBeVisible();

    await this.usernameTextField.click();
    await this.usernameTextField.fill(this.username);

    await this.passwordTextField.click();
    await this.passwordTextField.fill(this.password);

    await this.submitButton.click();
    await this.page.waitForURL(expectedUrl);
    await settle(this.page);
  }
}
