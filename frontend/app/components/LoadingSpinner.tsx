import { cn } from "@/lib/utils";

export function LoadingSpinner({
  className,
  isDark,
  size
}: {
  className?: string;
  isDark?: boolean;
  size?: number;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 flex-none animate-spin rounded-full border-2 align-middle",
        isDark
          ? "border-gray-100/18 border-t-gray-100"
          : "border-carbon-800/18 border-t-carbon-800",
        className
      )}
      style={size ? { height: size, width: size } : undefined}
    />
  );
}
