import { describe, expect, it } from "vitest";
import { FIELD_NAMES, SECTION_FIELDS, toRequestBody } from "./fields";

describe("SECTION_FIELDS", () => {
  it("assigns every editable field to exactly one section", () => {
    const assigned = Object.values(SECTION_FIELDS).flat();
    expect([...assigned].sort()).toEqual([...FIELD_NAMES].sort());
  });
});

describe("toRequestBody", () => {
  it("sends contributor affiliations as org ids", () => {
    const body = toRequestBody([
      [
        "contributors",
        {
          value: [
            {
              userId: "u1",
              roles: ["Writing"],
              inByline: true,
              priority: 1,
              affiliations: [
                { orgId: "o1", name: "Org 1", slug: "org-1", rorId: null },
                { orgId: "o2", name: "Org 2", slug: "org-2", rorId: null },
              ],
            },
            { userId: "u2", roles: ["Editing"], inByline: false, priority: 2 },
          ],
        },
      ],
    ]);

    expect(body.contributors).toEqual([
      expect.objectContaining({ userId: "u1", affiliations: ["o1", "o2"] }),
      expect.objectContaining({ userId: "u2", affiliations: [] }),
    ]);
  });

  it("sends other fields as-is", () => {
    expect(toRequestBody([["title", { value: "A title" }]])).toEqual({
      title: "A title",
    });
  });
});
