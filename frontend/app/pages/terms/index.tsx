import termsOfUseMarkdown from "@/../content/terms-of-use.md?raw";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import MetaPageHeader from "@/components/MetaPageHeader";
import { extractHeadings } from "@/lib/markdown";

const title = "Terms of Use";
const subtitle = "Last updated: September 28, 2026";

const sections = extractHeadings(termsOfUseMarkdown).filter(
  (heading) => heading.depth === 2
);

export function meta() {
  return [{ title: `${title} | The Stacks` }];
}

export default function TermsPage() {
  return (
    <div>
      <MetaPageHeader
        title={title}
        subtitle={subtitle}
        className="bg-page-header"
      />
      <div className="max-w-container mx-auto grid w-full grid-cols-1 gap-x-18 gap-y-8 px-4 py-10 md:grid-cols-[20rem_auto] md:px-8 md:py-20">
        <nav
          aria-label="Table of contents"
          className="md:sticky md:top-28 md:self-start"
        >
          <ol className="text-fg-strong space-y-3 text-base font-semibold tabular-nums">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="hover:underline hover:underline-offset-4"
                >
                  {index + 1}. {section.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="meta-page-body prose">
          <MarkdownRenderer markdown={termsOfUseMarkdown} />
        </div>
      </div>
    </div>
  );
}
