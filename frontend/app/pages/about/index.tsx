import { Route } from ".react-router/types/app/pages/about/+types/index";
import aboutMarkdown from "@/../content/about.md?raw";
import type { PublicationMdast } from "@/apiv1/mdast";
import MetaPageHeader from "@/components/MetaPageHeader";
import MystmdRenderer, {
  isMystmdRendererLoaded,
  loadMystmdRenderer
} from "@/components/mystmd/LazyMystmdRenderer";
import { buildSitePageMdast } from "@/lib/mystmd/buildSitePageMdast.server";
import { headingsFromMdast } from "@/lib/mystmd/headings";
import { Suspense, useMemo } from "react";

const title = "About";

const subtitle =
  "An Astera Institute initiative to make the products of science as useful and reusable as possible";

// The page is fixed at build time, so each server process parses it once.
let aboutMdast: PublicationMdast | undefined;

function getAboutMdast(): PublicationMdast {
  if (!aboutMdast) {
    aboutMdast = buildSitePageMdast(aboutMarkdown);
    for (const { severity, message, line } of aboutMdast.messages ?? []) {
      console.warn(`about.md:${line ?? "?"}: ${severity}: ${message}`);
    }
  }
  return aboutMdast;
}

/**
 * Parses the page on the server, so the parser never reaches the browser, and
 * loads its renderer, so the page renders without suspending (see
 * PublicationView).
 */
export async function loader() {
  await loadMystmdRenderer();
  const { messages: _messages, ...mdast } = getAboutMdast();
  return { mdast };
}

export function meta() {
  return [
    { title: `${title} | The Stacks` },
    { property: "og:title", content: title },
    {
      property: "og:description",
      content: subtitle
    },
    {
      name: "description",
      content: subtitle
    }
  ];
}

export default function AboutPage({ loaderData }: Route.ComponentProps) {
  const { mdast } = loaderData;
  const sections = useMemo(
    () =>
      headingsFromMdast(mdast.tree).filter((heading) => heading.depth === 1),
    [mdast]
  );

  const renderer = (
    <MystmdRenderer
      fallback={<p>This page couldn’t load. Please reload to try again.</p>}
      mdast={mdast}
    />
  );

  return (
    <div>
      <MetaPageHeader
        title={title}
        subtitle={subtitle}
        className="bg-page-header"
      />
      {/* Same layout as the Terms and Privacy pages. */}
      <div className="max-w-container mx-auto grid w-full grid-cols-1 gap-x-18 gap-y-8 px-4 py-10 md:grid-cols-[20rem_auto] md:px-8 md:py-20">
        <nav
          aria-label="Table of contents"
          className="md:sticky md:top-28 md:self-start"
        >
          <ul className="text-fg-strong space-y-3 text-base font-semibold">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="hover:underline hover:underline-offset-4"
                >
                  {section.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {/* `mystmd` also tells entry.client to load the renderer before
            hydrating. A Suspense boundary only when it has not loaded: one
            around a server-rendered body breaks scrolling (see
            PublicationView). */}
        <article className="meta-page-body prose mystmd">
          {isMystmdRendererLoaded() ? (
            renderer
          ) : (
            <Suspense fallback={null}>{renderer}</Suspense>
          )}
        </article>
      </div>
    </div>
  );
}
