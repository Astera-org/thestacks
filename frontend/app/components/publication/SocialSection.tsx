import BoxedCollapsible from "@/components/publication/BoxedCollapsible";

interface SocialSectionProps {
  /** Embed URL for the social posts iframe. Section is hidden when absent. */
  embedSrc?: string | null;
  /** Number of social posts, shown next to the title. Hidden when null. */
  postsCount?: number | null;
  /** Controlled open state of the whole social section. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
}

export default function SocialSection({
  embedSrc,
  postsCount,
  isOpen = false,
  onOpenChange,
  className
}: SocialSectionProps) {
  // No embed configured — don't render the section at all.
  if (!embedSrc) {
    return null;
  }

  return (
    <BoxedCollapsible
      id="social"
      label="social"
      title={
        <span>
          Social{" "}
          {postsCount !== null && postsCount !== undefined && (
            <span className="text-fg-muted">({postsCount})</span>
          )}
        </span>
      }
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className={className}
    >
      <iframe
        src={embedSrc}
        title="Social posts"
        className="h-128 w-full border-0"
      />
    </BoxedCollapsible>
  );
}
