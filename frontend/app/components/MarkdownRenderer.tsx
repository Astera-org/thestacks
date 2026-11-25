import {
  markdownToAnchorSafeHtmlSync,
  markdownToHtmlSync
} from "@/lib/markdown";
import { useMemo } from "react";

interface MarkdownRendererProps {
  markdown: string;
  isAnchorChild?: boolean; // If true, the rendered HTML will be safe to use as the child of an anchor.
}

export default function MarkdownRenderer({
  markdown,
  isAnchorChild
}: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (isAnchorChild) {
      return markdownToAnchorSafeHtmlSync(markdown);
    } else {
      return markdownToHtmlSync(markdown);
    }
  }, [markdown, isAnchorChild]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
