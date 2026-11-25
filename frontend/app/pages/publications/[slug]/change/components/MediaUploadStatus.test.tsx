import { ImportStatusResponse, ImportUpload } from "@/apiv1/imports";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaUploadStatus } from "./MediaUploadStatus";

function upload(id: string, status: ImportUpload["status"]): ImportUpload {
  return { id, ref: `raven-media://${id}`, status, url: null, error: null };
}

const UPLOADING: ImportStatusResponse = {
  publicationId: "p1",
  versionId: "v1",
  settled: false,
  uploads: [upload("a", "completed"), upload("b", "active")],
};

describe("MediaUploadStatus", () => {
  it("links how much of the media has uploaded to the figures", () => {
    render(<MediaUploadStatus uploadState={UPLOADING} />);

    const link = screen.getByRole("link", {
      name: "50% media uploaded: show figures",
    });
    expect(link.getAttribute("href")).toBe("#figures");
  });

  it("isn't shown without any uploads", () => {
    const { container } = render(
      <MediaUploadStatus uploadState={{ ...UPLOADING, uploads: [] }} />
    );

    expect(container.innerHTML).toBe("");
  });
});
