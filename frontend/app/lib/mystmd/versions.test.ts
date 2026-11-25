import v2 from "@test/fixtures/mystmd/sample.v2.mdast.json";
import v3 from "@test/fixtures/mystmd/sample.v3.mdast.json";
import { MIGRATIONS } from "myst-migrate";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MYST_AST_VERSION, toRenderableVersion } from "./versions";

afterEach(() => vi.restoreAllMocks());

describe("MyST AST versions", () => {
  it("renders the AST version of the installed myst-migrate", () => {
    expect(MYST_AST_VERSION).toBe(MIGRATIONS.length);
  });

  it("upgrades an older payload to the current version", async () => {
    const original = structuredClone(v2);

    expect(await toRenderableVersion(v2)).toEqual(v3);
    expect(v2).toEqual(original);
  });

  it("leaves the current version unchanged", async () => {
    expect(await toRenderableVersion(v3)).toBe(v3);
  });

  it("renders a newer version anyway, with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const newer = { ...v3, version: MYST_AST_VERSION + 1 };

    expect(await toRenderableVersion(newer)).toBe(newer);
    expect(warn).toHaveBeenCalledOnce();
  });
});
