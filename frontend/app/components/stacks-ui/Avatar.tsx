import { assetUrl } from "@/api/utils";
import { cn } from "@/lib/utils";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

interface AvatarProps {
  src?: string | null;
  className?: string;
  /**
   * The fallback defaults to the initials of the first and last words of `alt` (e.g. "Jane Q. Doe" → "JD"); override it with this to show something else.
   */
  fallback?: string;
  alt?: string;
  iconColor?: string;
}

function getInitials(name?: string): string | undefined {
  const words = name?.trim().split(/\s+/).filter(Boolean);
  if (!words?.length) return undefined;
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

export default function Avatar(props: AvatarProps) {
  const { alt, className, fallback: fallbackInput, iconColor, src } = props;
  const resolvedSrc = assetUrl(src) ?? undefined;

  // Initials of the first and last words of the name passed via `alt`, shown
  // while the image loads or if it is missing / fails to load.
  const fallback = fallbackInput ?? getInitials(alt);

  return (
    <AvatarPrimitive.Root
      className={cn(
        "text-fg relative flex size-9 shrink-0 overflow-hidden rounded-full",
        className
      )}
    >
      <AvatarPrimitive.Image
        src={resolvedSrc}
        alt={alt}
        className="aspect-square size-full object-cover"
        loading="lazy"
        decoding="async"
        fetchPriority="low"
      />
      <AvatarPrimitive.Fallback
        className={cn(
          "bg-carbon-100 text-caption-20 flex size-full items-center justify-center font-mono tracking-widest uppercase"
        )}
        style={iconColor ? { backgroundColor: iconColor } : undefined}
      >
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
