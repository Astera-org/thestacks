import type { Location } from "react-router";
import { describe, expect, it } from "vitest";
import { withAuthRedirect } from "./navigation";

function createLocation(pathname: string): Location {
  return {
    pathname,
    search: "",
    hash: "",
    state: null,
    key: "test"
  };
}

describe("withAuthRedirect", () => {
  it.each(["/login/", "/register/", "/forgot-password/", "/reset-password/"])(
    "does not preserve a trailing-slash auth path (%s)",
    (pathname) => {
      expect(withAuthRedirect(createLocation(pathname))).toEqual({});
    }
  );

  it("compares auth paths case-insensitively", () => {
    expect(withAuthRedirect(createLocation("/REGISTER/"))).toEqual({});
  });

  it("preserves a non-auth path as the redirect origin", () => {
    const location = createLocation("/publications/example/");

    expect(withAuthRedirect(location)).toEqual({ from: location });
  });
});
