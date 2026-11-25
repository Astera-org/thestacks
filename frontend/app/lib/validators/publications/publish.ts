import { FOS_SUBJECT_SCHEME } from "@/lib/fos-subjects";
import { markdownToTextSync } from "@/lib/markdown";
import { z } from "zod";

/** Raw length, markdown included; matches the database column. */
export const SUBTITLE_MAX_LEN = 300;
/** Visible length once markdown is stripped; required for publishing. */
export const SUBTITLE_TEXT_MAX_LEN = 280;
export const SUBTITLE_TEXT_TOO_LONG_MESSAGE = `Subtitle must be ${SUBTITLE_TEXT_MAX_LEN} characters or less, not counting formatting`;

export function getSubtitleTextLength(subtitle: string | null | undefined) {
  return markdownToTextSync(subtitle ?? "").length;
}
const VERSION_DESC_MIN_LEN = 5;

const contributorInBylineSchema = z.object({
  inByline: z.union([z.boolean(), z.number()])
});
const BYLINE_ISSUE = {
  message: "At least one contributor must be in the byline",
  path: ["contributors"]
};
const VERSION_DESCRIPTION_ISSUE = {
  message: "Version description required for new versions of a published pub",
  path: ["versionDesc"]
};
// Only the first release needs a FOS subject, since subjects lock after it;
// a keyword in another scheme doesn't count, as the select shows only FOS. On
// `["subjects"]` itself, not an item, so the release checklist's Fix link
// reaches the row (`#newpub_subjects`).
const SUBJECTS_ISSUE = {
  message: "Subject is required to publish",
  path: ["subjects"]
};
/**
 * Validates a fully-assembled publication (draft version + contributors)
 * against the rules required to publish it. Callers compile the object from
 * whatever source they have (DB rows, an in-progress edit, etc.) and pass it
 * through as-is — this schema only knows about the shape, not where it came
 * from, so it can be reused anywhere publish-readiness needs checking.
 */
export function buildPublishSchema(showVersionDesc: boolean) {
  return z
    .object({
      slug: z.string().trim().min(1, "Slug is required to publish"),
      title: z.string().trim().min(1, "Title is required to publish"),
      subtitle: z
        .string()
        .nullable()
        .refine((v) => (v ?? "").trim().length <= SUBTITLE_MAX_LEN, {
          message: `Subtitle must be ${SUBTITLE_MAX_LEN} characters or less, including formatting`
        })
        .refine((v) => getSubtitleTextLength(v) <= SUBTITLE_TEXT_MAX_LEN, {
          message: SUBTITLE_TEXT_TOO_LONG_MESSAGE
        }),
      abstract: z.string().nullable(),
      body: z.string().trim().min(1, "Body is required to publish"),
      version_desc: showVersionDesc
        ? z
            .string()
            .nullable()
            .refine((v) => (v ?? "").trim().length >= VERSION_DESC_MIN_LEN, {
              message: `Version description must be at least ${VERSION_DESC_MIN_LEN} characters long`
            })
        : z.string().nullable().optional(),
      license: z.string().nullable(),
      contributors: z.array(contributorInBylineSchema),
      state: z.string(),
      versionDesc: z.string().nullable(),
      subjects: z
        .array(
          z.object({
            subject: z.string(),
            subjectScheme: z.string().optional()
          })
        )
        .optional()
    })
    .refine((data) => data.contributors.some((c) => c.inByline), BYLINE_ISSUE)
    .refine(
      (data) => data.state !== "PUBLISHED" || data.versionDesc,
      VERSION_DESCRIPTION_ISSUE
    )
    .refine(
      (data) =>
        data.state === "PUBLISHED" ||
        (data.subjects ?? []).some(
          (s) =>
            s.subjectScheme === FOS_SUBJECT_SCHEME &&
            s.subject.trim().length > 0
        ),
      SUBJECTS_ISSUE
    );
}
