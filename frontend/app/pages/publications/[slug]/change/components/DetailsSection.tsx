import {
  issueMessages,
  namespaceIssueMessage,
  type ValidationIssue,
} from "@/api/errors";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Button from "@/components/stacks-ui/Button";
import Select from "@/components/stacks-ui/Select";
import Tooltip from "@/components/stacks-ui/Tooltip";
import {
  Commit,
  EditPublicationStatus,
} from "@/hooks/use-edit-publication/types";
import { PUBLICATION_TYPE_TAGS } from "@/lib/constants";
import {
  FOS_SUBJECT_OPTIONS,
  FOS_SUBJECT_SCHEME,
  fosSubjectLabel,
  withFosSubject,
} from "@/lib/fos-subjects";
import { cn } from "@/lib/utils";
import { ContributorV1, PublicationV1 } from "@/types/v1";
import { Check, Link2, XIcon } from "lucide-react";
import { z } from "zod";
import { useCandidateOrgs } from "../useCandidateOrgs";
import AdditionalAssets from "./AdditionalAssets";
import ContributorsInline from "./ContributorsInline";
import DoiRow from "./DoiRow";
import FieldError from "./FieldError";
import GenericInput from "./GenericInput";
import Row from "./Row";
import Section from "./Section";
import { SelectOrganizations } from "./SelectOrganizations";
import SlugField from "./SlugField";
import TagEditor from "./TagEditor";

export const LICENSES = ["CC BY", "CC0"];

const LICENSE_TIPS: Record<string, string> = {
  "CC BY":
    "CC BY 4.0: others can share and adapt your work as long as they give you credit. Most common for research.",
  CC0: "CC0: you waive all copyright; anyone can use your work for any purpose without restriction. Best for raw data.",
};

const urlSchema = z.url().or(z.literal(""));

export default function DetailsSection({
  collapsed,
  onCommit,
  contributors,
  fieldErrors,
  isReadOnly,
  onToggleCollapse,
  publication,
  publicationId,
  status,
}: {
  collapsed: boolean;
  onCommit: Commit;
  contributors: ContributorV1[];
  fieldErrors: ValidationIssue[] | null;
  isReadOnly?: boolean;
  onToggleCollapse: () => void;
  publication: PublicationV1 | undefined;
  publicationId: string;
  status: EditPublicationStatus;
}) {
  const isPreviouslyPublished = publication?.state === "PUBLISHED";
  const { data: candidateOrgs, isPending: candidateOrgsLoading } =
    useCandidateOrgs(publication, status);

  const checks = publication
    ? [
        Boolean(publication.license),
        Boolean(publication.slug),
        Boolean(publication.doi),
        contributors.some((c) => c.inByline),
        Boolean(publication.tags?.length),
        Boolean(publication.orgs?.length),
      ]
    : [];
  const filled = checks.filter(Boolean).length;

  const fosSubject = publication?.subjects?.find(
    (s) => s.subjectScheme === FOS_SUBJECT_SCHEME
  )?.subject;
  // Show a stored subject outside the list (e.g. one set by an admin) as is.
  const subjectOptions =
    fosSubject && !FOS_SUBJECT_OPTIONS.some((o) => o.value === fosSubject)
      ? [
          { value: fosSubject, label: fosSubjectLabel(fosSubject) },
          ...FOS_SUBJECT_OPTIONS,
        ]
      : FOS_SUBJECT_OPTIONS;
  const subjectError = namespaceIssueMessage(fieldErrors, "subjects");

  return (
    <Section
      collapsed={collapsed}
      id="details"
      kicker="Describe your pub"
      note="Slug, DOI, subject, and license are locked after release and can't change. Other details can still be updated."
      right={
        publication && (
          <div className="text-caption-20 text-fg flex items-center gap-2.5 font-mono">
            <span aria-hidden className="flex gap-1">
              {checks.map((done, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-1.5 rounded-full",
                    done ? "bg-carbon-800" : "bg-carbon-200"
                  )}
                />
              ))}
            </span>
            {filled} of {checks.length} set
          </div>
        )
      }
      status={status}
      title="Details"
      onToggleCollapse={onToggleCollapse}
    >
      {!publication ? (
        <div className="flex w-full items-center justify-center p-2">
          <LoadingSpinner size={24} />
        </div>
      ) : (
        <>
          <div className="-mt-7" id="newpub_contributors">
            <ContributorsInline
              candidateOrgs={candidateOrgs?.items}
              candidateOrgsLoading={candidateOrgsLoading}
              contributors={contributors}
              disabled={isReadOnly}
              fieldErrors={fieldErrors}
              pubOrgs={publication.orgs}
              onCommit={onCommit}
            />
          </div>

          <div className="border-border mt-8 border-t pt-8">
            <Row
              hint={
                isPreviouslyPublished
                  ? "Locked after first release"
                  : "Pick the Creative Commons license governing how your work can be used."
              }
              id="newpub_license"
              label="License"
              locked={isPreviouslyPublished}
              required={!isPreviouslyPublished}
            >
              <div
                aria-label="License"
                className="flex flex-wrap gap-2"
                role="group"
              >
                {LICENSES.map((l) => {
                  const active = publication.license === l;
                  if (isPreviouslyPublished && !active) return null;
                  return (
                    <Tooltip key={l} label={LICENSE_TIPS[l]}>
                      <Button
                        aria-pressed={active}
                        className="gap-1.5"
                        disabled={isReadOnly || isPreviouslyPublished}
                        intent={active ? "primary" : "outline"}
                        onClick={() => onCommit("license", l)}
                      >
                        {active && <Check aria-hidden className="size-3.5" />}
                        {l}
                      </Button>
                    </Tooltip>
                  );
                })}
              </div>
              <FieldError
                message={namespaceIssueMessage(fieldErrors, "license")}
              />
            </Row>

            <Row
              hint="Where this pub lives and who's notified on release."
              id="newpub_orgs"
              label="Community"
              optional
            >
              <SelectOrganizations
                disabled={isReadOnly}
                publication={publication}
                status={status}
                onCommit={onCommit}
              />
              <FieldError
                message={namespaceIssueMessage(fieldErrors, "orgs")}
              />
            </Row>

            <Row
              hint="Add at least one tag. Tags classify your pub (Resource, Perspective, Feedback…) and help readers discover it. Type to create a new tag, or choose from common and suggested tags."
              id="newpub_tags"
              label="Tags"
              optional
            >
              <TagEditor
                disabled={isReadOnly}
                invalid={Boolean(namespaceIssueMessage(fieldErrors, "tags"))}
                /** @todo: suggested tags */
                suggested={[]}
                tags={publication.tags ?? []}
                // "Informative failure" replaces "Negative data".
                types={PUBLICATION_TYPE_TAGS.filter(
                  (t) => t !== "Negative data"
                )}
                onCommit={onCommit}
              />
              <FieldError
                message={namespaceIssueMessage(fieldErrors, "tags")}
              />
            </Row>

            <Row
              hint={
                isPreviouslyPublished ? (
                  "Locked after first release"
                ) : (
                  <>
                    Part of the public URL. Auto-generated from your title; edit
                    any time before release.{" "}
                    <strong className="text-fg-strong font-medium">
                      Permanent after publishing.
                    </strong>
                  </>
                )
              }
              id="newpub_slug"
              label="Slug"
              locked={isPreviouslyPublished}
              required={!isPreviouslyPublished}
            >
              <SlugField
                disabled={isReadOnly || isPreviouslyPublished}
                error={namespaceIssueMessage(fieldErrors, "slug")}
                title={publication.title}
                value={publication.slug}
                onChange={(v) => onCommit("slug", v)}
              />
            </Row>

            <div className="border-border border-t pt-8" id="newpub_doi">
              <DoiRow
                disabled={isReadOnly || isPreviouslyPublished}
                isPreviouslyPublished={isPreviouslyPublished}
                publication={publication}
                publicationId={publicationId}
                status={status}
              />
            </div>

            <Row
              hint={
                isPreviouslyPublished
                  ? "Locked after first release"
                  : "The field this pub belongs to. Deposited as metadata during DOI registration."
              }
              id="newpub_subjects"
              label="Subject"
              locked={isPreviouslyPublished}
              required={!isPreviouslyPublished}
            >
              <Select
                aria-invalid={Boolean(subjectError)}
                aria-label="Subject"
                disabled={isReadOnly || isPreviouslyPublished}
                options={subjectOptions}
                placeholder="Select a field…"
                // "" rather than undefined keeps the select controlled; Radix
                // shows the placeholder for it.
                value={fosSubject ?? ""}
                onValueChange={(s) =>
                  onCommit(
                    "subjects",
                    withFosSubject(publication.subjects ?? [], s)
                  )
                }
              />
              <FieldError message={subjectError} />
            </Row>

            <Row
              hint="Link related outputs that live outside The Stacks, such as code, data, protocols, or materials."
              id="newpub_linked_assets"
              label="Additional assets"
              optional
            >
              <AdditionalAssets
                assets={publication.linkedAssets ?? []}
                disabled={isReadOnly}
                fieldErrors={fieldErrors}
                onCommit={onCommit}
              />
              <FieldError
                message={issueMessages(fieldErrors, ["linked_assets"])}
              />
            </Row>

            <Row
              hint="Embed a feedback form on the published pub page (e.g. a Tally or Typeform link)."
              id="newpub_feedback_form_embed_src"
              label="Feedback"
              optional
            >
              <GenericInput
                aria-label="Feedback form link"
                disabled={isReadOnly}
                error={namespaceIssueMessage(
                  fieldErrors,
                  "feedback_form_embed_src"
                )}
                iconLeft={{ Icon: Link2 }}
                iconRight={
                  publication.feedbackFormEmbedSrc
                    ? {
                        Icon: XIcon,
                        label: "Clear feedback form link",
                        onClickChangeText: () => "",
                      }
                    : undefined
                }
                placeholder="Link for feedback form embed"
                validation={(v) =>
                  urlSchema.safeParse(v).success ? null : "Enter a valid URL"
                }
                value={publication.feedbackFormEmbedSrc ?? ""}
                onChangeValue={(v) => onCommit({ feedbackFormEmbedSrc: v })}
              />
            </Row>

            <Row
              hint="Embed a social feed on the published pub page (e.g. a Twitter/X thread or Bluesky post link)."
              id="newpub_social_posts_embed_src"
              label="Social"
              optional
            >
              <GenericInput
                aria-label="Social posts link"
                disabled={isReadOnly}
                error={namespaceIssueMessage(
                  fieldErrors,
                  "social_posts_embed_src"
                )}
                iconLeft={{ Icon: Link2 }}
                iconRight={
                  publication.socialPostsEmbedSrc
                    ? {
                        Icon: XIcon,
                        label: "Clear social posts link",
                        onClickChangeText: () => "",
                      }
                    : undefined
                }
                placeholder="Link for social posts embed"
                validation={(v) =>
                  urlSchema.safeParse(v).success ? null : "Enter a valid URL"
                }
                value={publication.socialPostsEmbedSrc ?? ""}
                onChangeValue={(v) => onCommit({ socialPostsEmbedSrc: v })}
              />
            </Row>
          </div>
        </>
      )}
    </Section>
  );
}
