import { ImportDocumentV1 } from "@/types/v1";
import { describe, expect, it } from "vitest";
import { linkedGoogleDoc } from "./linked-google-doc";

const DOC: ImportDocumentV1 = {
  body: "",
  format: "gdoc",
  url: "https://docs.google.com/document/d/abc/edit",
  syncDate: "2026-10-29T00:00:00.000Z",
  filename: "doc.html",
  publicationVersionNumber: 0,
  diagnostics: [],
  id: "",
};

describe("linkedGoogleDoc", () => {
  it("returns a draft's Google Doc", () => {
    expect(linkedGoogleDoc(DOC)).toEqual(DOC);
  });

  it("ignores a MyST document, which has no URL", () => {
    expect(linkedGoogleDoc({ ...DOC, format: "mystmd", url: "" })).toBeNull();
  });

  it("returns null without an import document", () => {
    expect(linkedGoogleDoc(undefined)).toBeNull();
  });
});
