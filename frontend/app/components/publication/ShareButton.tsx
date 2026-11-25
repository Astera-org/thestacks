import {
  BlueskyIcon,
  FacebookIcon,
  LinkedInIcon,
  RedditIcon,
  ShareIcon,
  TwitterXIcon
} from "@/components/icons";
import IconButton from "@/components/stacks-ui/IconButton";
import {
  Popover,
  PopoverContent,
  PopoverItem,
  PopoverTrigger
} from "@/components/stacks-ui/Popover";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Mail } from "lucide-react";
import { ComponentPropsWithRef, useMemo } from "react";

interface ShareButtonProps extends ComponentPropsWithRef<
  typeof PopoverTrigger
> {
  publicationTitle: string;
  publicationUrl: string;
  intent?: "outline" | "outlineInverted";
  size?: "sm" | "md";
}

export default function ShareButton(props: ShareButtonProps) {
  const {
    publicationTitle,
    publicationUrl,
    className,
    children,
    intent = "outline",
    size = "md",
    ...rest
  } = props;

  const isMd = useBreakpoint("md");

  const shareLinks = useMemo(
    () => [
      {
        label: "Bluesky",
        icon: BlueskyIcon,
        href: `https://bsky.app/intent/compose?text=${publicationUrl}`
      },
      {
        label: "Reddit",
        icon: RedditIcon,
        href: `https://reddit.com/submit?url=${publicationUrl}`
      },
      {
        label: "Facebook",
        icon: FacebookIcon,
        href: `https://www.facebook.com/sharer/sharer.php?u=${publicationUrl}`
      },
      {
        label: "LinkedIn",
        icon: LinkedInIcon,
        href: `https://www.linkedin.com/shareArticle?url=${publicationUrl}`
      },
      {
        label: "X",
        icon: TwitterXIcon,
        href: `https://twitter.com/intent/tweet?url=${publicationUrl}`
      },
      {
        label: "Email",
        icon: Mail,
        href: `mailto:?subject=${publicationTitle}&body=${publicationUrl}`
      }
    ],
    [publicationUrl, publicationTitle]
  );

  return (
    <Popover>
      <PopoverTrigger asChild {...rest}>
        {children ?? (
          <IconButton
            aria-label="Share"
            intent={intent}
            size={size}
            pill
            icon={<ShareIcon />}
            className={className}
          />
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={isMd ? 10 : 20}
        className="me-2 md:me-0"
      >
        <div className="flex flex-col gap-1">
          {shareLinks.map((link) => (
            <PopoverItem key={link.label} asChild>
              <a href={link.href} rel="noopener noreferrer" target="_blank">
                <link.icon width={16} height={16} />
                {link.label}
              </a>
            </PopoverItem>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
