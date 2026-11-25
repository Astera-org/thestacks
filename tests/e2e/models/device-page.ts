import { Locator, type Page } from "@playwright/test";

/** The device authorization page (`/device`) the CLI sends users to. */
export class DevicePage {
  readonly codeInput: Locator;
  readonly continueButton: Locator;
  readonly confirmHeading: Locator;
  readonly approveButton: Locator;
  readonly denyButton: Locator;
  readonly connectedHeading: Locator;
  readonly deniedHeading: Locator;
  readonly alert: Locator;

  constructor(public readonly page: Page) {
    this.codeInput = page.getByLabel("Device code");
    this.continueButton = page.getByRole("button", { name: "Continue" });
    this.confirmHeading = page.getByRole("heading", {
      name: "Connect The Stacks CLI?",
    });
    this.approveButton = page.getByRole("button", { name: "Approve" });
    this.denyButton = page.getByRole("button", { name: "Deny" });
    this.connectedHeading = page.getByRole("heading", {
      name: "Device connected",
    });
    this.deniedHeading = page.getByRole("heading", { name: "Request denied" });
    this.alert = page.getByRole("alert");
  }

  /** Opens `/device`, with `userCode` as the `user_code` link parameter if given. */
  async goto(userCode?: string) {
    const query = userCode ? `?user_code=${encodeURIComponent(userCode)}` : "";
    await this.page.goto(`/device${query}`);
  }

  /** The code shown on the confirmation screen, e.g. "ABCD-1234". */
  shownCode(code: string): Locator {
    return this.page.getByText(code, { exact: true });
  }

  async submitCode(code: string) {
    await this.codeInput.fill(code);
    await this.continueButton.click();
  }
}
