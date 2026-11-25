import { FOS_SUBJECT_SCHEME } from "@/lib/fos-subjects";
import { describe, expect, it } from "vitest";
import {
  buildPublishSchema,
  getSubtitleTextLength,
  SUBTITLE_TEXT_TOO_LONG_MESSAGE
} from "./publish";

function subtitleIssues(subtitle: string | null) {
  const result = buildPublishSchema(false).safeParse({ subtitle });
  return (result.error?.issues ?? [])
    .filter((issue) => issue.path[0] === "subtitle")
    .map((issue) => issue.message);
}

describe("buildPublishSchema subtitle", () => {
  it("allows 280 characters of text", () => {
    expect(subtitleIssues("a".repeat(280))).toEqual([]);
  });

  it("rejects more than 280 characters of text", () => {
    expect(subtitleIssues("a".repeat(281))).toEqual([
      SUBTITLE_TEXT_TOO_LONG_MESSAGE
    ]);
  });

  it("does not count markdown toward the 280-character limit", () => {
    expect(subtitleIssues(`**${"a".repeat(280)}**`)).toEqual([]);
  });

  it("still rejects more than 300 raw characters", () => {
    expect(subtitleIssues(`[${"a".repeat(10)}](${"b".repeat(300)})`)).toEqual([
      "Subtitle must be 300 characters or less, including formatting"
    ]);
  });
});

/** A draft that passes every other publish rule. */
const READY_DRAFT = {
  slug: "a-pub",
  title: "A pub",
  subtitle: null,
  abstract: null,
  body: "Body",
  license: "CC BY",
  contributors: [{ inByline: true }],
  state: "DRAFT",
  versionDesc: "First version",
  subjects: [
    { subject: "FOS: Biological sciences", subjectScheme: FOS_SUBJECT_SCHEME }
  ]
};

function publishIssues(overrides: Record<string, unknown>) {
  const result = buildPublishSchema(false).safeParse({
    ...READY_DRAFT,
    ...overrides
  });
  return (result.error?.issues ?? []).map(({ path, message }) => ({
    path,
    message
  }));
}

const SUBJECTS_REQUIRED = {
  path: ["subjects"],
  message: "Subject is required to publish"
};

describe("buildPublishSchema subjects", () => {
  it("passes on first release when the draft has a subject", () => {
    expect(publishIssues({})).toEqual([]);
  });

  it.each([
    ["an empty list", []],
    [
      "only a blank FOS subject",
      [{ subject: "  ", subjectScheme: FOS_SUBJECT_SCHEME }]
    ],
    ["only a non-FOS keyword subject", [{ subject: "Neuroscience" }]],
    ["no subjects", undefined]
  ])("fails on first release with %s", (_, subjects) => {
    expect(publishIssues({ subjects })).toEqual([SUBJECTS_REQUIRED]);
  });

  it("exempts a previously published pub", () => {
    expect(publishIssues({ state: "PUBLISHED", subjects: [] })).toEqual([]);
  });
});

describe("getSubtitleTextLength", () => {
  it("counts the text without markdown", () => {
    expect(getSubtitleTextLength("A _very_ **bold** claim")).toBe(
      "A very bold claim".length
    );
    expect(getSubtitleTextLength(null)).toBe(0);
  });
});
