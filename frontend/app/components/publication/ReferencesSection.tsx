import BoxedCollapsible from "@/components/publication/BoxedCollapsible";
import type { Reference } from "@/types";

/** A reference to list; a MyST bibliography entry may have no URL. */
export type ListedReference = Omit<Reference, "url"> & { url?: string };

interface ReferencesSectionProps {
  references: ListedReference[];
  /** Body reference numbers matching each entry. Falls back to index+1. */
  referenceNumbers?: number[];
  /** Controlled open state of the whole references section. */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
}

export default function ReferencesSection({
  references,
  referenceNumbers,
  isOpen = false,
  onOpenChange,
  className
}: ReferencesSectionProps) {
  // Nothing to show — don't render the section at all.
  if (references.length === 0) {
    return null;
  }

  // The body reference number for a given position in the ordered list,
  // falling back to its 1-based index. Preserves the original numbering logic.
  const numberAt = (index: number) =>
    referenceNumbers ? referenceNumbers[index] : index + 1;

  return (
    <BoxedCollapsible
      id="references"
      title="References"
      label="references"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      className={className}
    >
      <div className="flex flex-col gap-3">
        {references.map((reference, index) => (
          <ReferenceCard
            key={reference.url ?? `n${numberAt(index)}`}
            reference={reference}
            number={numberAt(index)}
          />
        ))}
      </div>
    </BoxedCollapsible>
  );
}

function ReferenceCard({
  reference,
  number
}: {
  reference: ListedReference;
  number: number;
}) {
  return (
    <div className="bg-surface text-body-30 text-gray-blue-600 flex items-start gap-2 rounded-xl p-4 md:p-6">
      <div className="me-3 font-mono md:me-8">
        {String(number).padStart(2, "0")}
      </div>
      <div className="min-w-0">
        <span>{reference.text}</span>{" "}
        {reference.url && (
          <a
            className="break-all underline underline-offset-4"
            href={reference.url}
            target="_blank"
            rel="noopener"
          >
            {reference.url}
          </a>
        )}
      </div>
    </div>
  );
}
