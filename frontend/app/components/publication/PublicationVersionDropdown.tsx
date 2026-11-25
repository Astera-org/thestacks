import { ArrowUpIcon } from "@/components/icons";
import Button from "@/components/stacks-ui/Button";
import CopyButton from "@/components/stacks-ui/CopyButton";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger
} from "@/components/stacks-ui/Dropdown";
import useAppNavigate from "@/hooks/useAppNavigate";
import { cn } from "@/lib/utils";
import { VersionInfo } from "@/types";
import dayjs from "dayjs";
import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";

interface PublicationVersionDropdownProps {
  versions: VersionInfo[];
  currentVersionNum: number | null;
  conceptDoi?: string | null;
  className?: string;
}

function VersionDoi({ doi }: { doi: string }) {
  return (
    <div
      className="text-caption-30 text-gray-blue-200 flex w-full cursor-default items-center justify-between gap-2"
      // Stop the copy click from overlapping with the enclosing menu item's select.
      onClick={(e) => e.stopPropagation()}
    >
      <span>
        DOI: <span className="underline">{doi}</span>
      </span>
      <CopyButton
        text={`https://doi.org/${doi}`}
        tooltipContent="Copy DOI"
        className="size-6"
      />
    </div>
  );
}

export default function PublicationVersionDropdown(
  props: PublicationVersionDropdownProps
) {
  const {
    className,
    currentVersionNum,
    conceptDoi,
    versions: propVersions
  } = props;

  const versions = useMemo(
    () =>
      [...propVersions].sort((a, b) => b.version_number! - a.version_number!),
    [propVersions]
  );

  const hasVersionDoi = useMemo(() => versions.some((v) => v.doi), [versions]);

  const { slug } = useParams();
  const navigate = useAppNavigate();

  const { selectedVersion, isMostRecent, newerCount } = useMemo(() => {
    const selectedVersion =
      versions.find((v) => v.version_number === currentVersionNum) ??
      versions[0];
    const mostRecentVerNum = Math.max(
      ...versions.map((v) => v.version_number!)
    );
    const isMostRecent = selectedVersion.version_number! === mostRecentVerNum;
    const newerCount = isMostRecent
      ? 0
      : mostRecentVerNum - selectedVersion.version_number!;
    return { selectedVersion, isMostRecent, newerCount };
  }, [versions, currentVersionNum]);

  const [isOpen, setIsOpen] = useState<boolean>(() => !isMostRecent);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(!isMostRecent);
  }, [isMostRecent]);

  if (!versions || versions.length === 0) return null;

  return (
    <Dropdown open={isOpen} onOpenChange={setIsOpen}>
      <DropdownTrigger asChild>
        <Button
          intent="secondary"
          className={cn("w-full justify-between gap-2", className)}
        >
          <span>Version {selectedVersion.version_number}</span>
          <span className="flex items-center gap-2">
            {isMostRecent ? (
              <span>Current</span>
            ) : (
              <span className="bg-peach-900 text-warm-sand-100 rounded-full px-2 py-px text-sm">
                {newerCount} newer
              </span>
            )}
            <ArrowUpIcon
              className={cn(
                "size-5 transition-transform",
                !isOpen && "rotate-180"
              )}
            />
          </span>
        </Button>
      </DropdownTrigger>
      <DropdownContent className="w-(--radix-dropdown-menu-trigger-width) min-w-0 overflow-hidden">
        <div className="flex max-h-50 flex-col gap-1 overflow-y-auto">
          {versions.map((version) => {
            const isSelected =
              selectedVersion.version_number! === version.version_number!;
            return (
              <DropdownItem
                key={version.id}
                className={cn(
                  "flex-col items-start gap-1 font-mono",
                  isSelected && "bg-gray-blue-700"
                )}
                onSelect={() =>
                  navigate(`/publications/${slug}/v${version.version_number}`, {
                    replace: true
                  })
                }
              >
                <span>
                  Version {version.version_number!}:{" "}
                  {dayjs(version.created_at).format("MMM D, YYYY")}
                </span>
                {/* Release notes for this version, when present. */}
                {version.version_desc && (
                  <span className="text-caption-30 text-gray-blue-200">
                    {version.version_desc}
                  </span>
                )}
                {/* DOI for this version, when present. */}
                {version.doi && <VersionDoi doi={version.doi} />}
              </DropdownItem>
            );
          })}
        </div>
        {conceptDoi && hasVersionDoi && (
          <>
            <div className="bg-gray-blue-700 mx-4 my-2 h-px" />
            <DropdownItem
              key="concept-doi"
              className={cn("flex-col items-start gap-1 font-mono")}
              onSelect={() =>
                navigate(`/publications/${slug}`, {
                  replace: true
                })
              }
            >
              <span className="text-gray-blue-200 flex items-center gap-2">
                <Info className="size-4 shrink-0" />
                <span className="text-fg-inverted">
                  Reference all versions?
                </span>
              </span>
              <VersionDoi doi={conceptDoi} />
            </DropdownItem>
          </>
        )}
      </DropdownContent>
    </Dropdown>
  );
}
