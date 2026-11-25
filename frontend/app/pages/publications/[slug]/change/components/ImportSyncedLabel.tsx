import { TimeFromNow } from "@/components/TimeFromNow";
import { ImportDocumentV1 } from "@/types/v1";

/**
 * "imported 3 weeks ago", or "imported for v1 3 weeks ago" when the doc was
 * last synced for an earlier version rather than this draft.
 */
export function ImportSyncedLabel({
  capitalize,
  importDocument,
}: {
  capitalize?: boolean;
  importDocument: Pick<
    ImportDocumentV1,
    "publicationVersionNumber" | "syncDate"
  >;
}) {
  const version = importDocument.publicationVersionNumber;
  return (
    <>
      {capitalize ? "Imported" : "imported"}
      {version ? ` for v${version}` : ""}{" "}
      <TimeFromNow date={importDocument.syncDate} lower />
    </>
  );
}
