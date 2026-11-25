import type { PublicationMdast } from "@/apiv1/mdast";
import { loadMystmdRenderer } from "@/components/mystmd/LazyMystmdRenderer";
import { useTrackCommittedLocation } from "@/hooks/useCommittedLocation";
import type { Publication } from "@/types";
import { act, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicationView from "./PublicationView";

// Holds the renderer's chunk back until the test releases it.
let releaseChunk: () => void;
const chunk = new Promise<void>((resolve) => (releaseChunk = resolve));
vi.mock("@/components/mystmd/MystmdRenderer", async () => {
  await chunk;
  return { default: () => <h2 id="methods">Methods</h2> };
});

const publication = {
  slug: "how-ravens-plan-ahead",
  body: "",
  references: [],
  content: { format: "myst" }
} as unknown as Publication;

/** The publication page under `App`, which tracks committed locations. */
function Page() {
  useTrackCommittedLocation();
  return (
    <PublicationView mdast={{} as PublicationMdast} publication={publication} />
  );
}

// Each router gets its own location key, as browser history entries do.
const pageRouter = (key: string) =>
  createMemoryRouter([{ path: "/", element: <Page /> }], {
    initialEntries: [{ pathname: "/", hash: "#methods", key }]
  });

describe("PublicationView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scrolls to the hash target once the lazy MyST renderer mounts", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await act(async () => {
      render(<RouterProvider router={pageRouter("late")} />);
    });
    expect(screen.getByLabelText("Loading")).toBeTruthy();
    expect(scrollIntoView).not.toHaveBeenCalled();

    // Under act, React resumes a component suspended on `use` only when the
    // promise settles inside an awaited act.
    await act(async () => {
      releaseChunk();
      await loadMystmdRenderer();
    });
    const heading = await screen.findByRole("heading", { name: "Methods" });
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(scrollIntoView.mock.contexts[0]).toBe(heading);
  });

  // Runs after the test above, so the renderer is already loaded.
  it("leaves a body rendered with the location to ScrollRestoration", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    await act(async () => {
      render(<RouterProvider router={pageRouter("with-location")} />);
    });

    expect(screen.getByRole("heading", { name: "Methods" })).toBeTruthy();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
