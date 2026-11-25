import { ImportStatusResponse, ImportUpload } from "@/apiv1/imports";
import { describe, expect, it } from "vitest";
import { isBodyBehindUploads } from "./is-body-behind-uploads";

function upload(n: number, status: ImportUpload["status"]): ImportUpload {
  return {
    id: `u${n}`,
    ref: `raven-media://media-${n}`,
    status,
    url: status === "completed" ? `https://bucket/${n}.png` : null,
    error: null,
  };
}

function importStatus(
  settled: boolean,
  ...uploads: ImportUpload[]
): ImportStatusResponse {
  return { publicationId: "p1", versionId: "v1", settled, uploads };
}

const withRef = ':::image{src="raven-media://media-1"}\n:::';
const withUrl = ':::image{src="https://bucket/1.png"}\n:::';

describe("isBodyBehindUploads", () => {
  it("is true for a body fetched before its upload finished", () => {
    expect(
      isBodyBehindUploads(withRef, importStatus(true, upload(1, "completed")))
    ).toBe(true);
  });

  it.each([
    ["the body has the upload's URL", withUrl, true, "completed"],
    ["the import hasn't settled", withRef, false, "completed"],
    ["the upload failed, so the server kept its ref", withRef, true, "failed"],
  ] as const)("is false when %s", (_, body, settled, status) => {
    expect(
      isBodyBehindUploads(body, importStatus(settled, upload(1, status)))
    ).toBe(false);
  });

  it("is false without a body or an import status", () => {
    const settled = importStatus(true, upload(1, "completed"));
    expect(isBodyBehindUploads(undefined, settled)).toBe(false);
    expect(isBodyBehindUploads(withRef, undefined)).toBe(false);
  });
});
