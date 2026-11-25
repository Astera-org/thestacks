import type { DoiMetadataSubjectV1 } from "@/types/v1";
import { describe, expect, it } from "vitest";
import { FOS_SUBJECT_SCHEME, withFosSubject } from "./fos-subjects";

const BIOLOGY = {
  subject: "FOS: Biological sciences",
  subjectScheme: FOS_SUBJECT_SCHEME
};
const NEUROSCIENCE = { subject: "Neuroscience" };

describe("withFosSubject", () => {
  it("replaces the FOS subject and keeps subjects in other schemes", () => {
    expect(withFosSubject([BIOLOGY, NEUROSCIENCE], "FOS: Mathematics")).toEqual(
      [
        { subject: "FOS: Mathematics", subjectScheme: FOS_SUBJECT_SCHEME },
        NEUROSCIENCE
      ]
    );
  });

  it("adds the FOS subject to an empty list", () => {
    expect(withFosSubject([], "FOS: Mathematics")).toEqual([
      { subject: "FOS: Mathematics", subjectScheme: FOS_SUBJECT_SCHEME }
    ]);
  });

  it("returns a new list and leaves the one passed in unchanged", () => {
    const subjects: DoiMetadataSubjectV1[] = Object.freeze([
      Object.freeze({ ...BIOLOGY }),
      Object.freeze({ ...NEUROSCIENCE })
    ]) as DoiMetadataSubjectV1[];

    const result = withFosSubject(subjects, "FOS: Mathematics");

    expect(result).not.toBe(subjects);
    expect(subjects).toEqual([BIOLOGY, NEUROSCIENCE]);
  });
});
