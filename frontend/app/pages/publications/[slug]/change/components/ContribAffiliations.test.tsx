import {
  ContributorAffiliationV1,
  OrganizationV1,
  OrgOnPubV1,
} from "@/types/v1";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContribAffiliations from "./ContribAffiliations";

function org(id: string, name: string): OrganizationV1 {
  return { id, name, slug: id, rorId: null, createdAt: "" };
}

const ORGS = [org("o1", "Arcadia Science"), org("o2", "Astera Institute")];
const ARCADIA: ContributorAffiliationV1 = {
  orgId: "o1",
  name: "Arcadia Science",
  slug: "o1",
  rorId: null,
  avatar: undefined,
};

function renderAffiliations(
  affiliations: ContributorAffiliationV1[] = [],
  props: {
    locked?: boolean;
    candidateOrgs?: OrganizationV1[];
    defaultOrgs?: OrgOnPubV1[];
  } = {}
) {
  const onChange = vi.fn();
  render(
    <ContribAffiliations
      affiliations={affiliations}
      candidateOrgs={props.candidateOrgs ?? ORGS}
      contributorName="Ada Lovelace"
      defaultOrgs={props.defaultOrgs}
      locked={props.locked}
      onChange={onChange}
    />
  );
  return onChange;
}

function openPicker() {
  fireEvent.click(
    screen.getByRole("button", { name: "Add an affiliation for Ada Lovelace" })
  );
}

describe("ContribAffiliations", () => {
  it("shows a placeholder and the add button when empty", () => {
    renderAffiliations();

    expect(screen.getByText("Select affiliations…")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /Remove affiliation/ })
    ).toBeNull();
  });

  it("removes an affiliation", () => {
    const onChange = renderAffiliations([ARCADIA]);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove affiliation: Arcadia Science",
      })
    );

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("adds an affiliation picked from the list, leaving out existing ones", () => {
    const onChange = renderAffiliations([ARCADIA]);
    openPicker();

    expect(screen.getByText("Suggested")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Arcadia Science" })
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Astera Institute" }));

    expect(onChange).toHaveBeenCalledWith([
      ARCADIA,
      expect.objectContaining({ orgId: "o2", name: "Astera Institute" }),
    ]);
  });

  it("filters by the search query and explains when nothing matches", () => {
    renderAffiliations();
    openPicker();

    const search = screen.getByRole("textbox", {
      name: "Search organizations for Ada Lovelace",
    });
    fireEvent.change(search, { target: { value: "aster" } });
    expect(screen.getByText("Matches")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Astera Institute" })
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Arcadia Science" })
    ).toBeNull();

    fireEvent.change(search, { target: { value: "Whitehead" } });
    expect(screen.getByText(/No organization matches/)).toBeDefined();
  });

  it("shows the pub's orgs as defaults, with an unclipped badge, when empty", () => {
    const longName = "Howard Hughes Medical Institute Janelia Research Campus";
    renderAffiliations([], {
      defaultOrgs: [{ orgId: "o3", slug: "o3", name: longName }],
    });

    expect(screen.queryByText("Select affiliations…")).toBeNull();
    // An exact match means the badge is not inside the truncated label.
    expect(screen.getByText(longName).classList).toContain("truncate");
    expect(screen.getByText("Default")).toBeDefined();
  });

  it("hides the defaults once an affiliation is set", () => {
    renderAffiliations([ARCADIA], {
      defaultOrgs: [{ orgId: "o2", slug: "o2", name: "Astera Institute" }],
    });

    expect(screen.queryByText("Default")).toBeNull();
    expect(screen.queryByText("Astera Institute")).toBeNull();
  });

  it("is read-only when locked", () => {
    renderAffiliations([ARCADIA], { locked: true });

    expect(screen.getByText("Arcadia Science")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
