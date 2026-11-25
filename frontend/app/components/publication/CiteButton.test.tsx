import type { Contributor, Publication } from "@/types";
import { Cite } from "@citation-js/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CiteButton from "./CiteButton";

// The plugin-bibtex `doi` field is verbatim, so markup in a DOI reaches the
// BibTeX output unescaped.
const HOSTILE_DOI = '10.1234/<img src="x" onerror="alert(1)">';

function buildPublication(overrides: Partial<Publication> = {}): Publication {
  return {
    id: 1,
    publication_ulid: "01J0000000000000000000000A",
    slug: "how-ravens-plan-ahead",
    parent_id: null,
    template_id: null,
    latest_version_id: 1,
    title: "How ravens plan ahead",
    subtitle: null,
    abstract: "",
    doi: null,
    version_doi: null,
    publisher: null,
    body: "",
    version_desc: null,
    version_number: 1,
    version_id: 1,
    state: "PUBLISHED",
    license: "CC BY",
    created_at: "2026-01-15T00:00:00.000Z",
    updated_at: null,
    contributors: [],
    references: [],
    pdf_url: null,
    mediaAssets: [],
    ...overrides
  };
}

async function openCitePopover(publication: Publication) {
  render(<CiteButton publication={publication} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Cite" }));
  });
}

const bibtexCode = () => document.querySelector("pre > code");

function buildContributor(overrides: Partial<Contributor> = {}): Contributor {
  return {
    user_id: 1,
    first_name: "",
    last_name: "",
    priority: null,
    username: "contributor",
    roles: ["Author"],
    in_byline: true,
    ...overrides
  };
}

// Clicks a copy button and returns what it wrote to the clipboard.
async function copiedText(label: string) {
  const writeText = vi.fn().mockResolvedValue(undefined);
  // jsdom has no Clipboard API.
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: label }));
  });
  return writeText.mock.calls[0]?.[0] as string | undefined;
}

describe("CiteButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders BibTeX as text, not markup", async () => {
    await openCitePopover(buildPublication({ version_doi: HOSTILE_DOI }));

    const code = bibtexCode();
    expect(code?.querySelector("img")).toBeNull();
    expect(code?.textContent).toContain(HOSTILE_DOI);
  });

  it("renders a hostile single-part author name as text, not markup", async () => {
    const hostileName = "<img/src=x/onerror=alert(1)>";
    await openCitePopover(
      buildPublication({
        contributors: [
          buildContributor({ first_name: hostileName, last_name: "" })
        ]
      })
    );

    // The hostile name should not appear in the DOM as an element, rather as text
    expect(document.querySelector("img")).toBeNull();
    expect(bibtexCode()?.textContent).toContain(hostileName);
  });

  it("copies the same BibTeX it displays", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // jsdom has no Clipboard API.
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await openCitePopover(buildPublication({ version_doi: HOSTILE_DOI }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy BibTeX" }));
    });

    expect(writeText).toHaveBeenCalledWith(bibtexCode()?.textContent);
  });

  // "bibliography" builds the Arcadia citation; "bibtex" builds the BibTeX one.
  it.each([
    { failing: ["bibliography"], copyButtons: ["Copy BibTeX"] },
    { failing: ["bibtex"], copyButtons: ["Copy citation"] },
    { failing: ["bibliography", "bibtex"], copyButtons: [] }
  ])(
    "falls back for each citation whose formatting throws: $failing",
    async ({ failing, copyButtons }) => {
      const format = Cite.prototype.format;
      vi.spyOn(Cite.prototype, "format").mockImplementation(function (
        this: unknown,
        ...args: unknown[]
      ) {
        if (failing.includes(args[0] as string)) {
          throw new Error("citation-js failed");
        }
        return format.apply(this, args);
      });
      vi.spyOn(console, "error").mockImplementation(() => {});

      await openCitePopover(buildPublication());

      expect(screen.getAllByText("Citation unavailable")).toHaveLength(
        failing.length
      );
      const copyLabels = screen
        .queryAllByRole("button", { name: /^Copy / })
        .map((button) => button.getAttribute("aria-label"));
      expect(copyLabels).toEqual(copyButtons);
    }
  );

  it("formats authors with the Arcadia template from their stored name parts", async () => {
    await openCitePopover(
      buildPublication({
        // Underscores in the DOI must survive the Markdown stripping.
        version_doi: "10.1234/abc_def",
        contributors: [
          buildContributor({
            user_id: 1,
            priority: 1,
            first_name: "Mary Jane",
            last_name: "Smith"
          }),
          // Guessing from "Ana Garcia Lopez" would give family "Lopez".
          buildContributor({
            user_id: 2,
            priority: 2,
            first_name: "Ana",
            last_name: "Garcia Lopez"
          })
        ]
      })
    );

    expect(await copiedText("Copy citation")).toBe(
      "Smith MJ, Garcia Lopez A. (2026). How ravens plan ahead. https://doi.org/10.1234/abc_def"
    );
  });

  it("copies the citation without Markdown emphasis but keeps it italic on screen", async () => {
    await openCitePopover(
      buildPublication({ title: "_C. elegans_ forage at night" })
    );

    expect(document.querySelector("em")?.textContent).toBe("C. elegans");
    const copied = await copiedText("Copy citation");
    expect(copied).toContain("C. elegans forage at night");
    expect(copied).not.toContain("_");
  });
});
