import ReferencePopover, {
  type ReferenceLinkInfo
} from "@/components/publication/ReferencePopover";
import { type ComponentPropsWithoutRef } from "react";

interface MystSpanProps extends ComponentPropsWithoutRef<"span"> {
  "data-link-infos"?: string;
}

/**
 * Custom <span> component for react-markdown.
 * Delegates to specialized components based on className.
 */
export default function MystSpan({
  children,
  className,
  ...props
}: MystSpanProps) {
  const classes = className?.split(/\s+/) || [];

  if (classes.includes("ref-link-wrapper")) {
    let dataLinkInfos: ReferenceLinkInfo[] = [];
    try {
      dataLinkInfos = JSON.parse(props["data-link-infos"] || "[]");
    } catch (e) {
      console.error("Failed to parse link infos for reference popover", e);
    }
    if (dataLinkInfos.length === 0) {
      return (
        <span className={className} {...props}>
          {children}
        </span>
      );
    }
    return <ReferencePopover linkInfos={dataLinkInfos} />;
  }
  return (
    <span className={className} {...props}>
      {children}
    </span>
  );
}
