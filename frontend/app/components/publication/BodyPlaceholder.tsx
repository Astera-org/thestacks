import { Skeleton } from "@/components/Skeleton";

/** Stands in for the body while a MyST publication's AST or renderer loads. */
export default function BodyPlaceholder() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-4 block h-4 w-3/4 rounded" />
      <Skeleton className="mb-4 block h-4 w-full rounded" />
      <Skeleton className="block h-4 w-5/6 rounded" />
    </div>
  );
}
