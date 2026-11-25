import { MarkdownIcon } from "@/components/icons";
import IconButton from "@/components/stacks-ui/IconButton";
import { savePublicationToDownloads } from "@/lib/exportToMyst";
import type { Publication } from "@/types";
import { ComponentPropsWithRef } from "react";

interface ExportGoogleDocButtonProps extends Omit<
  ComponentPropsWithRef<"button">,
  "size"
> {
  publication: Publication;
  intent?: "outline" | "outlineInverted";
  size?: "sm" | "md";
}

export default function ExportGoogleDocButton(
  props: ExportGoogleDocButtonProps
) {
  const {
    publication,
    className,
    onClick,
    intent = "outline",
    size = "md",
    ...rest
  } = props;

  return (
    <IconButton
      aria-label="Export to markdown"
      intent={intent}
      size={size}
      pill
      icon={<MarkdownIcon />}
      className={className}
      onClick={(e) => {
        savePublicationToDownloads(publication);
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
