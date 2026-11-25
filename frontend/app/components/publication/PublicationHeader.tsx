import Link from "@/components/Link";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import LinkedAssets from "@/components/publication/LinkedAssets";
import PublicationTag from "@/components/publication/PublicationTag";
import PublicationVersionDropdown from "@/components/publication/PublicationVersionDropdown";
import Button from "@/components/stacks-ui/Button";
import CopyButton from "@/components/stacks-ui/CopyButton";
import OrganizationBadge from "@/components/stacks-ui/OrganizationBadge";
import { useOpenEditor } from "@/hooks/useOpenEditor";
import { usePublicationLayout } from "@/hooks/usePublicationLayout";
import { getLicense } from "@/lib/licenses";
import { Publication } from "@/types";
import dayjs from "dayjs";

interface PublicationHeaderProps {
  publication: Publication;
  selectedVersionId: number | null;
  selectedVersionNum: number | null;
  isPublicationEditor?: boolean;
}

export default function PublicationHeader(props: PublicationHeaderProps) {
  const {
    publication,
    selectedVersionNum,
    isPublicationEditor = false
  } = props;

  const { heroRef } = usePublicationLayout();

  const { openEditor, isOpening } = useOpenEditor(publication.slug);

  const license = getLicense(publication.license);
  const LicenseIcon = license?.icon;

  return (
    <div className="bg-pub-header" ref={heroRef}>
      <div className="max-w-container mx-auto w-full px-4 md:px-8 md:py-5">
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="py-14 md:col-span-8 md:py-16 md:pr-18">
            <div className="mb-8 flex justify-between">
              {publication.tags && publication.tags.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {publication.tags.map((tag) => (
                    <PublicationTag key={tag} tag={tag} variant="header" />
                  ))}
                </div>
              )}
              {isPublicationEditor && (
                <Button
                  aria-busy={isOpening}
                  disabled={isOpening}
                  onClick={openEditor}
                  className="hidden gap-2 md:inline-flex"
                >
                  Edit
                  {isOpening && <LoadingSpinner isDark />}
                </Button>
              )}
            </div>
            <section>
              <h1 className="text-headline-60 text-fg-strong font-serif">
                <MarkdownRenderer markdown={publication.title} />
              </h1>
              {publication.subtitle && (
                <h2 className="text-body-50 mt-10">
                  <MarkdownRenderer markdown={publication.subtitle} />
                </h2>
              )}
            </section>
          </div>
          <div className="flex flex-col gap-4 border-current pb-14 md:col-span-4 md:gap-8 md:border-l md:py-8 md:pl-12">
            <div className="flex flex-col gap-6 border-b border-current pb-4 md:pb-8">
              <div className="text-caption-40 font-mono">
                Published {dayjs(publication.created_at).format("MMM D, YYYY")}
              </div>
              {publication.orgs && publication.orgs.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  <OrganizationBadge organization={publication.orgs[0]} />
                </div>
              )}
            </div>

            {/* License. */}
            {license && (
              <div className="border-b border-current pb-4 md:pb-8">
                <Link
                  to={license.link}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 hover:underline hover:underline-offset-4"
                >
                  {LicenseIcon && (
                    <LicenseIcon className="h-5 w-auto shrink-0" />
                  )}
                  {license.name}
                </Link>
              </div>
            )}

            {/* Linked assets. */}
            {publication.linked_assets &&
              publication.linked_assets.length > 0 && (
                <div className="border-b border-current pb-4 md:pb-8">
                  <LinkedAssets linkedAssets={publication.linked_assets} />
                </div>
              )}

            {/* DOI and version dropdown. */}
            {publication.doi && (
              <div className="text-caption-40 flex items-center gap-2 font-mono">
                <span>DOI: {publication.doi}</span>
                <CopyButton
                  text={`https://doi.org/${publication.doi}`}
                  tooltipContent="Copy DOI"
                  className="size-6"
                />
              </div>
            )}
            {publication.versions?.length ? (
              <PublicationVersionDropdown
                versions={publication.versions}
                currentVersionNum={selectedVersionNum}
                conceptDoi={publication.doi}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
