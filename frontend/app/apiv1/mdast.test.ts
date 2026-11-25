import { RequestError } from "@/api/errors";
import { http } from "@/apiv1/client";
import v2 from "@test/fixtures/mystmd/sample.v2.mdast.json";
import v3 from "@test/fixtures/mystmd/sample.v3.mdast.json";
import type { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDraftMdast, getPublicationMdast, MDAST_ACCEPT } from "./mdast";

vi.mock("@/apiv1/client", () => ({ http: { get: vi.fn() } }));

function httpError(status: number): RequestError {
  return new RequestError({ kind: "http", status, message: "No" }, {
    response: { status }
  } as AxiosError);
}

afterEach(() => vi.mocked(http.get).mockReset());

describe("MyST AST requests", () => {
  it("name the schema and version this renderer understands", async () => {
    vi.mocked(http.get).mockResolvedValue({ data: v3 });

    expect(await getPublicationMdast("ravens", 2)).toEqual(v3);
    expect(http.get).toHaveBeenCalledWith(
      "/publications/p/ravens/versions/v2",
      { headers: { Accept: MDAST_ACCEPT } }
    );
    expect(MDAST_ACCEPT).toBe(
      "application/vnd.thestacks.mdast+json; schema=1; version=3"
    );
  });

  it("address the draft by publication ULID and upgrade an older AST", async () => {
    vi.mocked(http.get).mockResolvedValue({ data: v2 });

    expect(await getDraftMdast("01J0000000000000000000000A")).toEqual(v3);
    expect(vi.mocked(http.get).mock.calls[0]![0]).toBe(
      "/publications/id/01J0000000000000000000000A/draft"
    );
  });

  it.each([406, 422])("fall back on %i", async (status) => {
    vi.mocked(http.get).mockRejectedValue(httpError(status));

    expect(await getPublicationMdast("ravens", 1)).toBeNull();
  });

  it("fall back on a schema they do not know", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(http.get).mockResolvedValue({ data: { ...v3, schema: 2 } });

    expect(await getPublicationMdast("ravens", 1)).toBeNull();
  });

  it("pass other errors on", async () => {
    vi.mocked(http.get).mockRejectedValue(httpError(500));

    await expect(getPublicationMdast("ravens", 1)).rejects.toThrow();
  });
});
