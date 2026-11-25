import OrcidLogo from "@/components/icons/OrcidLogo";
import { cn } from "@/lib/utils";

interface OrcidProfileLinkProps {
  orcid: string;
  /** Also render the iD as visible link text. Defaults to icon-only. */
  showId?: boolean;
  iconClassName?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Link to a user's public ORCID profile page.
 */
export default function OrcidProfileLink({
  orcid,
  showId = false,
  iconClassName = "size-6 md:size-7",
  className,
  ...rest
}: OrcidProfileLinkProps) {
  return (
    <a
      href={`https://orcid.org/${orcid}`}
      title={`View ORCID profile: ${orcid}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex shrink-0 items-center gap-2", className)}
      {...rest}
    >
      <OrcidLogo className={iconClassName} />
      {showId && orcid}
    </a>
  );
}
