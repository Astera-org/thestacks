import { cn } from "@/lib/utils";

/**
 * Skeleton component to show a loading state for text or other elements.
 * Since the skeleton is a span of text, it will inherit the font size and line height of its parent element.
 * This allows it to be used in place of text elements without affecting the layout.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "skeleton pointer-events-none relative inline-block w-full overflow-hidden bg-gray-900/20 select-none",
        className
      )}
    >
      &nbsp;
    </span>
  );
}
