import { describe, expect, it } from "vitest";
import type { Route } from "./+types/redirect-to-edit";
import { loader } from "./redirect-to-edit";

/** Runs the loader and returns the redirect `Response` it throws. */
function redirectFrom(pubId: string, search = ""): Response {
  const request = new Request(
    `https://thestacks.org/publications/${encodeURIComponent(pubId)}/change${search}`
  );
  try {
    loader({ params: { pubId }, request } as Route.LoaderArgs);
  } catch (thrown) {
    return thrown as Response;
  }
  throw new Error("Expected the loader to throw a redirect");
}

describe("the /change to /edit redirect", () => {
  it("sends a temporary redirect to the editor and keeps the query string", () => {
    const response = redirectFrom(
      "01j0000000000000000000000a",
      "?tab=settings&x=1"
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/publications/01j0000000000000000000000a/edit?tab=settings&x=1"
    );
  });

  it("encodes the id so it reaches /edit unchanged", () => {
    const response = redirectFrom("a/b?c#d");

    expect(response.headers.get("Location")).toBe(
      "/publications/a%2Fb%3Fc%23d/edit"
    );
  });
});
