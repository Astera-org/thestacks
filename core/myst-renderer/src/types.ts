export type MediaAsset = {
  id: string;
  byteSize: number;
  mimeType: string;
  kind: "file" | "audio" | "image" | "video";
  publicUrl: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  rotation: number | null;
};
