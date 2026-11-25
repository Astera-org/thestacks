import { namespaceIssueMessage, ValidationIssue } from "@/api/errors";
import { EditPublicationStatus } from "@/hooks/use-edit-publication/types";
import { useId } from "react";
import FieldError from "./FieldError";
import FieldLabel from "./FieldLabel";
import Section from "./Section";
import { TextAreaField } from "./TextAreaField";

export function VersionDescription({
  collapsed,
  fieldErrors,
  onChange,
  onToggleCollapse,
  status,
  versionDescription,
}: {
  collapsed: boolean;
  fieldErrors: ValidationIssue[] | null;
  onChange: (newValue: string) => void;
  onToggleCollapse: () => void;
  status: EditPublicationStatus;
  versionDescription: string;
}) {
  const inputId = useId();
  const errorId = useId();
  const error = namespaceIssueMessage(fieldErrors, "versionDesc");

  return (
    <Section
      collapsed={collapsed}
      id="newpub_versionDesc"
      kicker="Change notes"
      note="Describe what changed in this version and why. Readers see this note in the version history."
      status={status}
      title="Version description"
      onToggleCollapse={onToggleCollapse}
    >
      <FieldLabel htmlFor={inputId} required>
        Version description
      </FieldLabel>
      <TextAreaField
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        boxed
        className="min-h-[calc(3lh+1.5rem)] w-full"
        id={inputId}
        placeholder="What changed since the last release?"
        value={versionDescription}
        onChangeValue={onChange}
      />
      <FieldError id={errorId} message={error} />
    </Section>
  );
}
