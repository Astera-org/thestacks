import { Contributor, ContributorWithRoles } from "@/types";
import { describe, expect, it } from "vitest";
import {
  getContributorsWithRoles,
  sortedContributorsWithRoles
} from "./get-contributors-with-roles";

function makeContributor(overrides: Partial<Contributor>): Contributor {
  return {
    user_id: 1,
    first_name: "Ada",
    last_name: "Lovelace",
    username: "ada",
    priority: 0,
    roles: [],
    in_byline: false,
    ...overrides
  };
}

describe("getContributorsWithRoles", () => {
  it("returns an empty array for no contributors", () => {
    expect(getContributorsWithRoles([])).toEqual([]);
  });

  it("passes a single contributor through with cloned roles/affiliations", () => {
    const contributor = makeContributor({ roles: ["Author"] });
    const [result] = getContributorsWithRoles([contributor]);

    expect(result.roles).toEqual(["Author"]);
    expect(result.affiliations).toEqual([]);
    // Cloned, not the same array reference, so mutating the result can't
    // corrupt the source contributor.
    expect(result.roles).not.toBe(contributor.roles);
  });

  it("merges duplicate rows for the same user_id into one entry", () => {
    const rows = [
      makeContributor({ user_id: 1, roles: ["Author"] }),
      makeContributor({ user_id: 1, roles: ["Editor"] })
    ];

    const result = getContributorsWithRoles(rows);

    expect(result).toHaveLength(1);
    expect(result[0].roles).toEqual(["Author", "Editor"]);
  });

  it("keeps the lowest priority across duplicate rows", () => {
    const rows = [
      makeContributor({ user_id: 1, priority: 3 }),
      makeContributor({ user_id: 1, priority: 1 }),
      makeContributor({ user_id: 1, priority: 2 })
    ];

    const [result] = getContributorsWithRoles(rows);
    expect(result.priority).toBe(1);
  });

  // A missing priority never wins over a real one, and 0 is a real priority.
  it.each([
    { first: null, second: null, merged: null },
    { first: null, second: 3, merged: 3 },
    { first: 3, second: null, merged: 3 },
    { first: null, second: 0, merged: 0 },
    { first: 0, second: null, merged: 0 },
    { first: 0, second: 3, merged: 0 },
    { first: 3, second: 0, merged: 0 }
  ])(
    "merges priorities $first and $second into $merged",
    ({ first, second, merged }) => {
      const rows = [
        makeContributor({ user_id: 1, priority: first }),
        makeContributor({ user_id: 1, priority: second })
      ];

      const [result] = getContributorsWithRoles(rows);
      expect(result.priority).toBe(merged);
    }
  );

  it("leaves a multi-role contributor's missing priority null, like single-role contributors'", () => {
    // v0 rows from contributors added without a priority: York has two roles,
    // so their rows merge, with Adams's row in between; Adams and Baker have
    // one each.
    const rows = [
      makeContributor({ user_id: 1, last_name: "York", priority: null }),
      makeContributor({ user_id: 2, last_name: "Adams", priority: null }),
      makeContributor({ user_id: 1, last_name: "York", priority: null }),
      makeContributor({ user_id: 3, last_name: "Baker", priority: null })
    ];

    const result = getContributorsWithRoles(rows);

    expect(result.map((c) => [c.last_name, c.priority])).toEqual([
      ["York", null],
      ["Adams", null],
      ["Baker", null]
    ]);
  });

  it("ORs in_byline across duplicate rows", () => {
    const rows = [
      makeContributor({ user_id: 1, in_byline: false }),
      makeContributor({ user_id: 1, in_byline: true })
    ];

    const [result] = getContributorsWithRoles(rows);
    expect(result.in_byline).toBe(true);
  });

  it("merges affiliations from every duplicate row, not just the first", () => {
    const rows = [
      makeContributor({
        user_id: 1,
        affiliations: [
          { org_id: 1, name: "Org A", slug: "org-a", ror_id: null }
        ]
      }),
      makeContributor({
        user_id: 1,
        affiliations: [
          { org_id: 2, name: "Org B", slug: "org-b", ror_id: null }
        ]
      })
    ];

    const [result] = getContributorsWithRoles(rows);
    expect(result.affiliations.map((a) => a.org_id)).toEqual([1, 2]);
  });

  it("keeps distinct contributors separate, in first-seen order", () => {
    const rows = [
      makeContributor({ user_id: 2, username: "second" }),
      makeContributor({ user_id: 1, username: "first" }),
      makeContributor({ user_id: 2, username: "second", roles: ["Editor"] })
    ];

    const result = getContributorsWithRoles(rows);

    expect(result.map((c) => c.user_id)).toEqual([2, 1]);
    expect(result[0].roles).toEqual(["Editor"]);
  });

  it("tolerates missing roles/affiliations on the input row", () => {
    const rows = [
      makeContributor({
        user_id: 1,
        roles: undefined as unknown as string[]
      })
    ];

    expect(() => getContributorsWithRoles(rows)).not.toThrow();
    expect(getContributorsWithRoles(rows)[0].roles).toEqual([]);
  });

  it("collects roles from v0 rows that carry a single `role`", () => {
    const rows = [
      makeContributor({
        user_id: 1,
        roles: undefined as unknown as string[],
        role: "Author"
      }),
      makeContributor({
        user_id: 1,
        roles: undefined as unknown as string[],
        role: "Editor"
      }),
      makeContributor({
        user_id: 2,
        roles: undefined as unknown as string[],
        role: "Reviewer"
      })
    ];

    const result = getContributorsWithRoles(rows);

    expect(result).toHaveLength(2);
    expect(result[0].roles).toEqual(["Author", "Editor"]);
    expect(result[1].roles).toEqual(["Reviewer"]);
  });
});

describe("sortedContributorsWithRoles", () => {
  function makeWithRoles(
    overrides: Partial<ContributorWithRoles>
  ): ContributorWithRoles {
    return { ...makeContributor(overrides), affiliations: [], ...overrides };
  }

  function lastNames(contributors: ContributorWithRoles[]) {
    return contributors.map((c) => c.last_name);
  }

  it("returns an empty array for no contributors", () => {
    expect(sortedContributorsWithRoles([])).toEqual([]);
  });

  it("sorts by priority, lowest first", () => {
    const result = sortedContributorsWithRoles([
      makeWithRoles({ user_id: 1, last_name: "Adams", priority: 3 }),
      makeWithRoles({ user_id: 2, last_name: "Baker", priority: 1 }),
      makeWithRoles({ user_id: 3, last_name: "York", priority: 2 })
    ]);

    expect(lastNames(result)).toEqual(["Baker", "York", "Adams"]);
  });

  it("treats 0 as a real priority, not a missing one", () => {
    const result = sortedContributorsWithRoles([
      makeWithRoles({ user_id: 1, last_name: "Adams", priority: null }),
      makeWithRoles({ user_id: 2, last_name: "Baker", priority: 1 }),
      makeWithRoles({ user_id: 3, last_name: "York", priority: 0 })
    ]);

    expect(lastNames(result)).toEqual(["York", "Baker", "Adams"]);
  });

  it("puts contributors without a priority last, sorted by last name", () => {
    const result = sortedContributorsWithRoles([
      makeWithRoles({ user_id: 1, last_name: "York", priority: null }),
      makeWithRoles({ user_id: 2, last_name: "Baker", priority: 5 }),
      makeWithRoles({ user_id: 3, last_name: "Adams", priority: null })
    ]);

    expect(lastNames(result)).toEqual(["Baker", "Adams", "York"]);
  });

  it("sorts contributors with equal priority by last name", () => {
    const result = sortedContributorsWithRoles([
      makeWithRoles({ user_id: 1, last_name: "York", priority: 1 }),
      makeWithRoles({ user_id: 2, last_name: "Adams", priority: 1 })
    ]);

    expect(lastNames(result)).toEqual(["Adams", "York"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      makeWithRoles({ user_id: 1, last_name: "York", priority: 2 }),
      makeWithRoles({ user_id: 2, last_name: "Adams", priority: 1 })
    ];

    const result = sortedContributorsWithRoles(input);

    expect(result).not.toBe(input);
    expect(lastNames(input)).toEqual(["York", "Adams"]);
  });

  it("sorts a merged multi-role contributor without a priority by last name", () => {
    // York has two roles, so their rows merge. Before the merge fix the merged
    // priority became 0 and York sorted to the top.
    const merged = getContributorsWithRoles([
      makeContributor({ user_id: 1, last_name: "York", priority: null }),
      makeContributor({ user_id: 2, last_name: "Baker", priority: null }),
      makeContributor({ user_id: 1, last_name: "York", priority: null }),
      makeContributor({ user_id: 3, last_name: "Adams", priority: null })
    ]);

    const result = sortedContributorsWithRoles(merged);

    expect(lastNames(result)).toEqual(["Adams", "Baker", "York"]);
  });
});
