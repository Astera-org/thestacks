import { SUBTITLE_MAX_LEN } from "@/lib/validators/publications/publish";
import { ContributorV1, PublicationV1 } from "@/types/v1";
import { z } from "zod";
import { FieldSpec } from "./types";

export const FIELDS: Partial<Record<keyof PublicationV1, FieldSpec>> = {
  body: { schema: z.string() },
  title: { schema: z.string().max(255) },
  subtitle: { schema: z.string().max(SUBTITLE_MAX_LEN).nullable() },
  abstract: { schema: z.string().nullable() },
  slug: {
    schema: z.string(),
  },
  contributors: {
    schema: z.array(
      z.object({
        userId: z.string(),
        priority: z.int(),
        roles: z.array(z.string()),
      })
    ),
    // Responses carry affiliation objects; the request takes org ids.
    toRequest: (contributors) =>
      (contributors as ContributorV1[]).map((c) => ({
        ...c,
        affiliations: (c.affiliations ?? []).map((a) => a.orgId),
      })),
  },
  license: {
    schema: z.string(),
  },
  orgs: {
    schema: z.array(z.object({ orgId: z.string() })),
  },
  tags: {
    schema: z.array(z.string()),
  },
  importDocument: {
    schema: z
      .object({
        body: z.string(),
        url: z.string(),
        format: z.string(),
        filename: z.string().nullable().optional(),
        syncDate: z.string().nullable().optional(),
      })
      .nullable(),
  },
  // Mirrors PatchPublicationStrictSchema's `subjects` in raven.
  subjects: {
    schema: z
      .array(
        z.object({
          subject: z.string().min(1),
          subjectScheme: z.string().min(1).optional(),
        })
      )
      .min(1),
  },
  versionDesc: { schema: z.string().nullable() },
  feedbackFormEmbedSrc: { schema: z.string().max(255) },
  socialPostsEmbedSrc: { schema: z.string().max(255) },
  linkedAssets: {
    schema: z.array(
      z.object({
        type: z.string(),
        url: z.string(),
        name: z.string().nullable().optional(),
      })
    ),
  },
} as const;

export type FieldName = keyof typeof FIELDS;

export const FIELD_NAMES = Object.keys(FIELDS) as FieldName[];

/**
 * Which change-page section owns each field, for per-section save status.
 * fields.test.ts checks every field belongs to exactly one section.
 */
export const SECTION_FIELDS = {
  content: ["abstract", "body", "importDocument", "subtitle", "title"],
  details: [
    "contributors",
    "feedbackFormEmbedSrc",
    "license",
    "linkedAssets",
    "orgs",
    "slug",
    "socialPostsEmbedSrc",
    "subjects",
    "tags",
  ],
  versionDescription: ["versionDesc"],
} as const satisfies Record<string, readonly FieldName[]>;

/** Builds a PATCH body from field values, converting each to its request shape. */
export function toRequestBody(
  entries: Iterable<[FieldName, { value: unknown }]>
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [field, entry] of entries) {
    const toRequest = FIELDS[field]?.toRequest;
    body[field] = toRequest ? toRequest(entry.value) : entry.value;
  }
  return body;
}
