import { getPublication } from "@/api/publications";
import { getPublicationMdast, type PublicationMdast } from "@/apiv1/mdast";
import type { Publication } from "@/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loader } from "./index";

vi.mock("@/api/publications", () => ({ getPublication: vi.fn() }));
vi.mock("@/apiv1/mdast", () => ({ getPublicationMdast: vi.fn() }));

const mdast = { schema: 1, version: 3 } as PublicationMdast;

function publication(format?: string): Publication {
  return {
    slug: "ravens",
    title: "Ravens",
    subtitle: null,
    abstract: "",
    version_number: 2,
    content: format ? { format } : undefined
  } as Publication;
}

function load() {
  return loader({
    params: { slug: "ravens" },
    request: new Request("https://thestacks.org/publications/ravens")
  });
}

afterEach(() => vi.clearAllMocks());

describe("the publication loader", () => {
  it("fetches the AST of a MyST publication", async () => {
    vi.mocked(getPublication).mockResolvedValue(publication("myst"));
    vi.mocked(getPublicationMdast).mockResolvedValue(mdast);

    expect((await load())?.mdast).toBe(mdast);
    expect(getPublicationMdast).toHaveBeenCalledWith("ravens", 2);
  });

  it("makes no AST request for other publications", async () => {
    vi.mocked(getPublication).mockResolvedValue(publication("gdoc"));

    expect((await load())?.mdast).toBeNull();
    expect(getPublicationMdast).not.toHaveBeenCalled();
  });

  it("falls back to the older renderer when the AST request fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getPublication).mockResolvedValue(publication("myst"));
    vi.mocked(getPublicationMdast).mockRejectedValue(new Error("down"));

    expect((await load())?.mdast).toBeNull();
  });
});
