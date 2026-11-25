import type { SelectOption } from "@/components/stacks-ui/Select";
import type { DoiMetadataSubjectV1 } from "@/types/v1";

/** The DataCite `subjectScheme` for the OECD Fields of Science and Technology. */
export const FOS_SUBJECT_SCHEME = "Fields of Science and Technology (FOS)";

/** The OECD Fields of Science and Technology a pub can be filed under. */
export const FOS_SUBJECTS = [
  "FOS: Natural sciences",
  "FOS: Mathematics",
  "FOS: Computer and information sciences",
  "FOS: Physical sciences",
  "FOS: Chemical sciences",
  "FOS: Earth and related environmental sciences",
  "FOS: Biological sciences",
  "FOS: Other natural sciences",

  "FOS: Engineering and technology",
  "FOS: Electrical engineering, electronic engineering, information engineering",
  "FOS: Mechanical engineering",
  "FOS: Chemical engineering",
  "FOS: Materials engineering",
  "FOS: Medical engineering",
  "FOS: Environmental engineering",
  "FOS: Environmental biotechnology",
  "FOS: Industrial biotechnology",
  "FOS: Nano-technology",
  "FOS: Other engineering and technologies",

  "FOS: Medical and health sciences",
  "FOS: Basic medicine",
  "FOS: Clinical medicine",
  "FOS: Health sciences",
  "FOS: Medical biotechnology",
  "FOS: Other medical sciences"
] as const;

/** The subject's name without the `FOS: ` prefix, for display. */
export function fosSubjectLabel(subject: string): string {
  return subject.replace(/^FOS: /, "");
}

/** {@link FOS_SUBJECTS} as select options, labelled without the prefix. */
export const FOS_SUBJECT_OPTIONS: SelectOption<string>[] = FOS_SUBJECTS.map(
  (subject) => ({ value: subject, label: fosSubjectLabel(subject) })
);

/**
 * Sets the pub's FOS subject. A PATCH replaces the whole list, so subjects in
 * other schemes are kept rather than dropped.
 */
export function withFosSubject(
  subjects: DoiMetadataSubjectV1[],
  subject: string
): DoiMetadataSubjectV1[] {
  return [
    { subject, subjectScheme: FOS_SUBJECT_SCHEME },
    ...subjects.filter((s) => s.subjectScheme !== FOS_SUBJECT_SCHEME)
  ];
}
