import arcadiaScienceCSL from "@/../assets/arcadia-science.csl?raw";
import { QuoteIcon } from "@/components/icons";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import CopyButton from "@/components/stacks-ui/CopyButton";
import IconButton from "@/components/stacks-ui/IconButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/stacks-ui/Popover";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { markdownToTextSync } from "@/lib/markdown";
import {
  contributorsToAuthors,
  publicationDoi,
  publicationUrls
} from "@/lib/publications";
import { Publication } from "@/types";
import { Cite, plugins } from "@citation-js/core";
import "@citation-js/plugin-bibtex";
import "@citation-js/plugin-csl";
import "@citation-js/plugin-doi";
import { ComponentPropsWithRef, useMemo } from "react";

function registerArcadiaCSLTemplate() {
  const config = plugins.config.get("@csl");
  config.styles.add("arcadia-science", arcadiaScienceCSL);
}

// Register before any render: citation-js throws for an unknown style, and
// the citation below would silently fall back to its error state.
registerArcadiaCSLTemplate();

// Structured names stop citation-js from guessing where a name splits, which
// it gets wrong for multi-word family names.
function toCslName(firstName: string, lastName: string) {
  const given = firstName.trim();
  const family = lastName.trim();
  if (given && family) return { given, family };
  // A single name part can't be split into given/family; print it as-is.
  return { literal: given || family };
}

interface CiteButtonProps extends ComponentPropsWithRef<typeof PopoverTrigger> {
  publication: Publication;
  intent?: "outline" | "outlineInverted";
  size?: "sm" | "md";
}

export default function CiteButton(props: CiteButtonProps) {
  const {
    publication,
    className,
    intent = "outline",
    size = "md",
    ...rest
  } = props;

  const isMd = useBreakpoint("md");

  // We need to de-duplicate the authors because the backend returns
  // duplicate authors for some reason. TODO: Fix this in the backend.
  const authors = useMemo(() => {
    const seen = new Set<string>();
    return contributorsToAuthors(publication).flatMap((c) => {
      if (seen.has(c.full_name)) return [];
      seen.add(c.full_name);
      return [toCslName(c.first_name, c.last_name)];
    });
  }, [publication]);

  const publicationUrl = useMemo(() => {
    // Always cite versioned URLs
    const { versionedPublicationUrl } = publicationUrls(
      publication,
      publication.version_number
    );
    return versionedPublicationUrl;
  }, [publication]);

  // Prefer the version DOI over the concept DOI, falling back to the
  // concept DOI when no version DOI is available.
  const doi = publicationDoi(publication);

  // Create a formatted Arcadia citation. Citations are generated while the
  // publication toolbar renders, so a citation-js failure must not escape.
  const arcadiaCitation = useMemo(() => {
    try {
      const citation = new Cite({
        title: publication.title,
        URL: publicationUrl,
        issued: {
          "date-parts": [[new Date(publication.created_at).getFullYear()]]
        },
        author: authors.map((name) => name),
        DOI: doi
      });
      const markdown = citation.format("bibliography", {
        format: "text",
        style: "arcadia-science",
        lang: "en-US"
      });
      // Shown as Markdown so title emphasis stays italic on screen; copied as
      // plain text so the clipboard doesn't get literal `_`/`*` markers.
      return { markdown, text: markdownToTextSync(markdown) };
    } catch (error) {
      console.error("Failed to generate citation", error);
      return null;
    }
  }, [authors, doi, publication.created_at, publication.title, publicationUrl]);

  // Create a formatted BibTeX citation.
  const bibtexCitation = useMemo<string | null>(() => {
    try {
      const pubDate = new Date(publication.created_at);

      // Create citation object.
      const citation = new Cite({
        title: markdownToTextSync(publication.title),
        URL: publicationUrl,
        issued: {
          "date-parts": [
            [pubDate.getFullYear(), pubDate.getMonth() + 1, pubDate.getDate()]
          ]
        },
        author: authors.map((name) => name),
        type: "article-journal",
        DOI: doi,
        publisher: publication.publisher || "Astera Institute",
        "container-title": "The Stacks"
      });

      let formattedText = citation.format("bibtex");

      // Sanitize citation text.
      formattedText = formattedText.endsWith("\n")
        ? formattedText.slice(0, -1)
        : formattedText;

      formattedText = formattedText.replaceAll("\\textbackslash{}", "");

      return formattedText;
    } catch (error) {
      console.error("Failed to generate BibTeX citation", error);
      return null;
    }
  }, [
    authors,
    doi,
    publication.created_at,
    publication.publisher,
    publication.title,
    publicationUrl
  ]);

  const unavailable = (
    <p className="text-fg-inverted font-sans text-[14px] leading-4">
      Citation unavailable
    </p>
  );

  return (
    <Popover>
      <PopoverTrigger asChild {...rest}>
        <IconButton
          aria-label="Cite"
          intent={intent}
          size={size}
          pill
          icon={<QuoteIcon />}
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent
        align="center"
        collisionPadding={8}
        sideOffset={isMd ? 10 : 20}
        className="w-[calc(100vw-16px)] p-4 md:w-auto md:max-w-132 md:min-w-132"
      >
        <div className="flex flex-col gap-3">
          {/* Arcadia citation. */}
          {arcadiaCitation === null ? (
            unavailable
          ) : (
            <div className="flex items-start gap-4">
              <div className="text-fg-inverted font-sans text-[14px] leading-4 wrap-break-word [&_a]:underline [&_a]:underline-offset-4">
                <MarkdownRenderer markdown={arcadiaCitation.markdown} />
              </div>
              <CopyButton
                text={arcadiaCitation.text}
                tooltipContent="Copy citation"
                className="bg-gray-blue-700 hover:bg-gray-blue-600"
                tooltipVariant="light"
              />
            </div>
          )}
          {/* BibTeX citation. */}
          <div className="flex flex-col gap-2">
            <div className="text-gray-blue-200 flex items-start font-mono text-[13px] leading-5 font-medium uppercase">
              BibTeX
            </div>
            {bibtexCitation === null ? (
              unavailable
            ) : (
              <div className="flex items-start gap-4">
                <pre className="overflow-x-auto">
                  <code className="hljs scrollbar-hide bg-sky-blue-300 rounded-lg p-3 font-mono text-[12px] leading-4 font-light">
                    {bibtexCitation}
                  </code>
                </pre>
                <CopyButton
                  text={bibtexCitation}
                  tooltipContent="Copy BibTeX"
                  className="bg-gray-blue-700 hover:bg-gray-blue-600"
                  tooltipVariant="light"
                />
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
