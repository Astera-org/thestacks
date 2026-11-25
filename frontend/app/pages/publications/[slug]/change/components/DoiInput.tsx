import { namespaceIssueMessage, RequestError } from "@/api/errors";
import { Link2 } from "lucide-react";
import GenericInput, { type GenericInputProps } from "./GenericInput";

export const MANAGED_DOI_PREFIX = "10.82153";
export const TEST_MANAGED_DOI_PREFIX = "10.83972";

/** The DOI without its leading "10.", as the field and display show it. */
export function doiSuffix(doi: string): string {
  return doi.replace(/^10\./, "");
}

/** The message for a failed DOI save: the server's DOI issue when it sent one. */
export function doiSaveErrorMessage(err: unknown): string {
  if (err instanceof RequestError && err.apiError.kind === "validation") {
    const message = namespaceIssueMessage(err.apiError.issues, "doi");
    if (message) return message;
  }
  return err instanceof Error ? err.message : "Unable to save the DOI.";
}

/** The DOI field: "10." is a fixed prefix, and a pasted "10." is dropped. */
export default function DoiInput(
  props: Omit<
    GenericInputProps,
    "className" | "iconLeft" | "placeholder" | "prefix" | "transform"
  >
) {
  return (
    <GenericInput
      className="font-mono"
      iconLeft={{ Icon: Link2 }}
      placeholder={`${MANAGED_DOI_PREFIX.split(".")[1]}/abcd-1234`}
      prefix="10."
      transform={(v, caret) => {
        if (v.length > 3 && v.startsWith("10.")) {
          return { value: doiSuffix(v), caret: caret - 3 };
        }
        return { value: v, caret };
      }}
      {...props}
    />
  );
}
