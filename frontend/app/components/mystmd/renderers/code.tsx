import CopyButton from "@/components/stacks-ui/CopyButton";
import { cn } from "@/lib/utils";
import hljs from "highlight.js/lib/common";
import type { GenericNode } from "myst-common";
import { useMemo } from "react";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/**
 * Highlighted synchronously, so the server and the client render the same
 * markup; highlight.js escapes the code it wraps.
 */
function highlight(value: string, lang: string | undefined): string {
  if (lang && hljs.getLanguage(lang)) {
    return hljs.highlight(value, { language: lang, ignoreIllegals: true })
      .value;
  }
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);
}

function Code({ node }: { node: GenericNode }) {
  const value = String(node.value ?? "");
  const lang = typeof node.lang === "string" ? node.lang : undefined;
  const html = useMemo(() => highlight(value, lang), [value, lang]);
  return (
    <div
      className="mystmd-code relative"
      id={typeof node.html_id === "string" ? node.html_id : undefined}
    >
      {typeof node.filename === "string" && (
        <div className="mystmd-code-filename">{node.filename}</div>
      )}
      <pre>
        <code
          className={cn("hljs", lang && `language-${lang}`)}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
      <CopyButton
        aria-label="Copy code"
        className="absolute top-3 right-3"
        text={value}
      />
    </div>
  );
}

export const CODE_RENDERERS = { code: Code };
