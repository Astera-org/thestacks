import { Locator, type Page } from "@playwright/test";

export class SettingsPage {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto("/account/settings");
  }

  async goToProfileView() {
    await this.page
      .getByRole("button", { name: "Profile information" })
      .click();
  }

  /**
   * @returns The ORCID link/status button in the profile settings form.
   */
  get orcidButton(): Locator {
    return this.page.getByTestId("orcid-link-button");
  }
}
