import { expect, test } from "@playwright/test";
import { settle } from "@/utils";

/**
 * Contributor row as returned by the v0 publication endpoints: one row per
 * contributor-role pair, each carrying a single `role`.
 */
type ContributorRow = {
  user_id: number;
  role: string;
  first_name: string | null;
  last_name: string | null;
};

type PublicationSummary = {
  slug: string;
  contributors?: ContributorRow[];
};

/**
 * Collapses contributor-role rows into an ordered list of roles per user, in
 * the order the API returns them (which is the order the page renders them).
 */
function rolesByUser(rows: ContributorRow[]) {
  const roles = new Map<number, string[]>();
  for (const row of rows) {
    const list = roles.get(row.user_id) ?? [];
    list.push(row.role);
    roles.set(row.user_id, list);
  }
  return roles;
}

test.describe("publication contributors", () => {
  test("shows each contributor's roles", async ({ page, request }) => {
    // Pick a published publication that has contributors, preferring one where
    // a contributor has several roles so the merging of rows is covered too.
    const listResponse = await request.get("/api/publications", {
      params: { per_page: 20 },
    });
    expect(listResponse.ok()).toBeTruthy();
    const { items } = (await listResponse.json()) as {
      items: PublicationSummary[];
    };
    const withContributors = items.filter(
      (p) => (p.contributors?.length ?? 0) > 0,
    );
    test.skip(
      withContributors.length === 0,
      "No published publications with contributors are available.",
    );
    const publication =
      withContributors.find((p) =>
        [...rolesByUser(p.contributors!).values()].some((r) => r.length > 1),
      ) ?? withContributors[0];

    // Read the contributors from the publication endpoint the page itself uses.
    const pubResponse = await request.get(
      `/api/publications/${publication.slug}`,
    );
    expect(pubResponse.ok()).toBeTruthy();
    const { publication: detail } = (await pubResponse.json()) as {
      publication: { contributors: ContributorRow[] };
    };
    const expectedRoles = rolesByUser(detail.contributors);

    await page.goto(`/publications/${publication.slug}`, {
      waitUntil: "domcontentloaded",
    });
    await settle(page);

    // The section's cards are siblings of the "Contributors" title.
    const section = page.locator("#contributors").locator("xpath=..");
    await expect(section).toBeVisible();

    for (const [userId, roles] of expectedRoles) {
      const card = section.locator(`a[href="/users/${userId}"]`);
      await expect(card).toHaveCount(1);
      await expect(card).toContainText(roles.join(", "));
    }
  });
});
