import { ShareIcon } from "@/components/icons";
import ShareButton from "@/components/publication/ShareButton";
import IconButton from "@/components/stacks-ui/IconButton";

interface ShareProfileButtonProps {
  /** Title used when sharing, e.g. the profile name. */
  title: string;
  /** Absolute URL of the profile to share. */
  url: string;
}

/** Icon button that opens the share popover for a profile, labelled "Share". */
export default function ShareProfileButton(props: ShareProfileButtonProps) {
  const { title, url } = props;

  return (
    <div className="flex items-center gap-3">
      <ShareButton
        asChild
        publicationTitle={title}
        publicationUrl={url}
        aria-label="Share"
      >
        <IconButton
          intent="secondary"
          size="md"
          pill
          icon={<ShareIcon />}
          className="bg-transparent"
        />
      </ShareButton>
      <span className="text-caption-40 font-mono">Share</span>
    </div>
  );
}
