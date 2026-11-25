import { LinkedAsset, LinkedAssetType } from "@/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LinkedAssets, { describeAssetSource } from "./LinkedAssets";

function asset(type: LinkedAssetType, name: string): LinkedAsset {
  return { type, name, url: `https://example.com/${name}` };
}

describe("describeAssetSource", () => {
  it("shortens GitHub URLs to the owner/repo", () => {
    expect(
      describeAssetSource("https://github.com/prism-science/logbook/tree/v1.0")
    ).toBe("GitHub · prism-science/logbook");
  });

  it("shows DOI links as a DOI", () => {
    expect(describeAssetSource("http://dx.doi.org/10.17504/protocols.io")).toBe(
      "DOI 10.17504/protocols.io"
    );
  });

  it("falls back to host and path", () => {
    expect(
      describeAssetSource("https://www.diffuse.science/logbook/beamtime/")
    ).toBe("diffuse.science/logbook/beamtime");
  });

  it("returns the raw URL instead of throwing on a malformed percent sequence", () => {
    const url = "https://example.com/a/%E0%A4%A";
    expect(describeAssetSource(url)).toBe(url);
  });

  it("returns the raw value when it is not a URL", () => {
    expect(describeAssetSource("not a url")).toBe("not a url");
  });
});

describe("LinkedAssets", () => {
  it("renders nothing without assets", () => {
    const { container } = render(<LinkedAssets linkedAssets={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("uses singular copy for a single asset", () => {
    render(
      <LinkedAssets linkedAssets={[asset(LinkedAssetType.Code, "repo")]} />
    );
    screen.getByRole("button", { name: "Additional assets 1 asset" });
  });

  it("collapses extra types into a +N circle listing the hidden types", () => {
    render(
      <LinkedAssets
        linkedAssets={[
          asset(LinkedAssetType.Code, "a"),
          asset(LinkedAssetType.Data, "b"),
          asset(LinkedAssetType.Material, "c"),
          asset(LinkedAssetType.Protocol, "d"),
          asset(LinkedAssetType.Protocol, "e"),
          asset(LinkedAssetType.Other, "f")
        ]}
      />
    );
    const overflow = screen.getByText("+2");
    expect(overflow.getAttribute("title")).toBe("Protocols, Other");
    screen.getByText("6 assets");
  });

  it("still renders when an asset URL is malformed", () => {
    render(
      <LinkedAssets
        linkedAssets={[
          {
            type: LinkedAssetType.Data,
            name: "Broken",
            url: "https://example.com/a/%E0%A4%A"
          }
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    screen.getByText("https://example.com/a/%E0%A4%A");
  });

  it("lists every asset as a new-tab link when opened", () => {
    render(
      <LinkedAssets
        linkedAssets={[
          asset(LinkedAssetType.Data, "first"),
          asset(LinkedAssetType.Data, "second")
        ]}
      />
    );
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const dialog = screen.getByRole("dialog", { name: "Additional assets" });
    const links = dialog.querySelectorAll("a");
    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link.getAttribute("target")).toBe("_blank"));
  });
});
