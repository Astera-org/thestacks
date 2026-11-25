import { getPublication } from "@/api/publications";
import { loader, meta } from "@/pages/publications/[slug]/index";
import type { Contributor, Publication } from "@/types";
import { describe, expect, it, vi } from "vitest";
import { generatePublicationMetaTags } from "./publications";

vi.mock("@/api/publications", () => ({ getPublication: vi.fn() }));

function buildPublication(overrides: Partial<Publication> = {}): Publication {
  return {
    id: 1,
    publication_ulid: "01J0000000000000000000000A",
    slug: "test-publication",
    parent_id: null,
    template_id: null,
    latest_version_id: 1,
    title: "Test Publication",
    subtitle: "A test abstract.",
    abstract: "A test abstract.",
    doi: "10.1234/test-doi",
    version_doi: null,
    publisher: "Astera Institute",
    body: "",
    version_desc: null,
    version_number: 1,
    version_id: 1,
    state: "PUBLISHED",
    license: "CC BY",
    created_at: "2025-01-01T00:00:00.000Z",
    updated_at: null,
    contributors: [],
    references: [],
    pdf_url: null,
    tags: ["Method"],
    mediaAssets: [],
    ...overrides
  };
}

function metaContent(
  tags: ReturnType<typeof generatePublicationMetaTags>,
  name: string
) {
  const tag = tags.find((t) => "name" in t && t.name === name);
  return tag && "content" in tag ? tag.content : undefined;
}

function metaTagsNamed(
  tags: ReturnType<typeof generatePublicationMetaTags>,
  name: string
) {
  return tags.filter((t) => "name" in t && t.name === name);
}

function metaContents(
  tags: ReturnType<typeof generatePublicationMetaTags>,
  name: string
) {
  return metaTagsNamed(tags, name).map((t) =>
    "content" in t ? t.content : undefined
  );
}

function buildContributor(overrides: Partial<Contributor> = {}): Contributor {
  return {
    user_id: 1,
    first_name: "Ada",
    last_name: "Lovelace",
    priority: null,
    username: `user-${overrides.user_id ?? 1}`,
    roles: ["Author"],
    in_byline: true,
    ...overrides
  };
}

function buildMetaData(publication: Publication) {
  return {
    publication,
    title: publication.title,
    subtitle: publication.subtitle ?? "",
    abstract: publication.abstract,
    baseUrl: "https://thestacks.org",
    versionNumber: publication.version_number
  };
}

describe("generatePublicationMetaTags", () => {
  it("uses publication.publisher for citation_publisher", () => {
    const publication = buildPublication({ publisher: "Some Other Publisher" });
    const tags = generatePublicationMetaTags(buildMetaData(publication));
    expect(metaContent(tags, "citation_publisher")).toBe(
      "Some Other Publisher"
    );
  });

  it("falls back to Astera Institute when publication.publisher is null", () => {
    const publication = buildPublication({ publisher: null });
    const tags = generatePublicationMetaTags(buildMetaData(publication));
    expect(metaContent(tags, "citation_publisher")).toBe("Astera Institute");
  });

  it("orders authors by priority, then last name, like the Contributors section", () => {
    // York has two roles, so they have two rows with different priorities.
    const publication = buildPublication({
      contributors: [
        buildContributor({ user_id: 1, last_name: "York", priority: 3 }),
        buildContributor({ user_id: 2, last_name: "Baker", priority: null }),
        buildContributor({ user_id: 3, last_name: "Adams", priority: 2 }),
        buildContributor({ user_id: 1, last_name: "York", priority: 1 }),
        buildContributor({ user_id: 4, last_name: "Adler", priority: null })
      ]
    });
    const tags = generatePublicationMetaTags(buildMetaData(publication));

    const expected = ["Ada York", "Ada Adams", "Ada Adler", "Ada Baker"];
    expect(metaContents(tags, "citation_author")).toEqual(expected);
    expect(metaContents(tags, "dc.creator")).toEqual(expected);
  });

  it("orders non-byline contributors the same way", () => {
    const publication = buildPublication({
      contributors: [
        buildContributor({ user_id: 1, last_name: "York", priority: 1 }),
        buildContributor({
          user_id: 2,
          last_name: "Baker",
          priority: 3,
          in_byline: false
        }),
        buildContributor({
          user_id: 3,
          last_name: "Adams",
          priority: 2,
          in_byline: false
        })
      ]
    });
    const tags = generatePublicationMetaTags(buildMetaData(publication));

    expect(metaContents(tags, "citation_author")).toEqual(["Ada York"]);
    expect(metaContents(tags, "dc.contributor")).toEqual([
      "Ada Adams",
      "Ada Baker"
    ]);
  });

  it("does not emit citation_keywords", () => {
    const publication = buildPublication({
      tags: ["Method", "Feedback requested"]
    });
    const tags = generatePublicationMetaTags(buildMetaData(publication));
    expect(metaTagsNamed(tags, "citation_keywords")).toHaveLength(0);
  });

  it.each([
    {
      title: "Title with **bold** and _emphasis_",
      subtitle: "Abstract with `code` and [a link](https://example.com)",
      expectedTitle: "Title with bold and emphasis",
      expectedSubtitle: "Abstract with code and a link"
    },
    {
      title: String.raw`A \<gene\> study with \*literal\* text`,
      subtitle: String.raw`About \<protein\> and \_literal\_ text`,
      expectedTitle: "A <gene> study with *literal* text",
      expectedSubtitle: "About <protein> and _literal_ text"
    },
    {
      title: "cafe\u0301",
      subtitle: "cafe\u0301",
      expectedTitle: "caf\u00e9",
      expectedSubtitle: "caf\u00e9"
    }
  ])(
    "preserves loader-processed metadata: $expectedTitle",
    async ({ title, subtitle, expectedTitle, expectedSubtitle }) => {
      const publication = buildPublication({ title, subtitle });
      vi.mocked(getPublication).mockResolvedValue(publication);

      const data = await loader({
        params: { slug: publication.slug },
        request: new Request(
          `https://thestacks.org/publications/${publication.slug}`
        )
      });

      expect(data?.title).toBe(expectedTitle);
      expect(data?.subtitle).toBe(expectedSubtitle);
      const tags = meta({ loaderData: data });
      expect(metaContent(tags, "citation_title")).toBe(expectedTitle);
      expect(metaContent(tags, "citation_abstract")).toBe(expectedSubtitle);
    }
  );
});
