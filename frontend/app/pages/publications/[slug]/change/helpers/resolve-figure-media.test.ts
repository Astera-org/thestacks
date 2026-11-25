import { ImportUpload } from "@/apiv1/imports";
import { MediaAssetV1 } from "@/types/v1";
import { describe, expect, it } from "vitest";
import fakeStacksPub from "./__fixtures__/fake-stacks-pub.md?raw";
import { extractFigures } from "./extract-figures";
import { createFigureMediaResolver } from "./resolve-figure-media";

const S3 = "https://bucket.s3.amazonaws.com";

function upload(
  n: number,
  status: ImportUpload["status"],
  url: string | null = null
): ImportUpload {
  return {
    id: `u${n}`,
    ref: `raven-media://media-${n}`,
    status,
    url,
    error: null,
  };
}

function asset(publicUrl: string): MediaAssetV1 {
  return {
    id: publicUrl,
    byteSize: 1024,
    mimeType: "image/png",
    kind: "image",
    publicUrl,
    width: 10,
    height: 10,
    durationMs: null,
    rotation: null,
  };
}

const uploads = [
  upload(1, "pending"),
  upload(2, "active"),
  upload(3, "completed", `${S3}/3.png`),
  upload(4, "failed"),
];
const mediaAssets = [asset(`${S3}/3.png`), asset(`${S3}/saved-earlier.png`)];
const resolve = createFigureMediaResolver({ uploads, mediaAssets });

describe("createFigureMediaResolver", () => {
  it.each([
    ["raven-media://media-1", "pending"],
    ["raven-media://media-2", "uploading"],
    ["raven-media://media-4", "failed"],
  ] as const)("reports the upload's progress for %s", (src, status) => {
    expect(resolve(src)).toEqual({
      status,
      upload: uploads.find((u) => u.ref === src),
      asset: null,
    });
  });

  it("finds the stored file for a ref whose upload has finished", () => {
    expect(resolve("raven-media://media-3")).toEqual({
      status: "ready",
      upload: uploads[2],
      asset: mediaAssets[0],
    });
  });

  it("matches an uploaded URL once it has replaced the ref", () => {
    expect(resolve(`${S3}/3.png`)).toEqual({
      status: "ready",
      upload: uploads[2],
      asset: mediaAssets[0],
    });
  });

  it("matches files stored outside the current import", () => {
    expect(resolve(`${S3}/saved-earlier.png`)).toEqual({
      status: "ready",
      upload: null,
      asset: mediaAssets[1],
    });
  });

  it("flags refs the current import doesn't know", () => {
    expect(resolve("raven-media://media-9").status).toBe("unresolved");
  });

  it.each([
    ["data:image/png;base64,iVBORw0KGgo=", "embedded"],
    ["https://successteam.typeform.com/to/AR5B4r6L", "external"],
    ["http://example.com/a.png", "external"],
    ["Paste the Google Drive URL of the image here", "invalid"],
    ["/images/a.png", "invalid"],
    ["javascript:alert(1)", "invalid"],
    [null, "missing"],
  ] as const)("classifies %s as %s", (src, status) => {
    expect(resolve(src)).toEqual({ status, upload: null, asset: null });
  });

  it("resolves every medium in an imported document", () => {
    const resolveImported = createFigureMediaResolver({
      uploads: [
        upload(1, "completed", `${S3}/1.png`),
        upload(2, "completed", `${S3}/2.html`),
        upload(3, "active"),
        upload(4, "failed"),
        upload(5, "pending"),
      ],
      mediaAssets: [asset(`${S3}/1.png`), asset(`${S3}/2.html`)],
    });

    const statuses = extractFigures(fakeStacksPub).flatMap(
      ({ label, media }) =>
        media ? [[label, resolveImported(media.src).status]] : []
    );

    expect(statuses).toEqual([
      ["Figure 1", "ready"],
      ["Figure 2", "ready"],
      ["Figure 3", "uploading"],
      ["Figure 4", "failed"],
      ["Video 1", "pending"],
      [null, "external"],
      [null, "external"],
    ]);
  });
});
