import { licenseToLink } from "@/lib/licenses";
import {
  getContributorsWithRoles,
  sortedContributorsWithRoles
} from "@/lib/utils/get-contributors-with-roles";
import { LinkedAssetType, type Publication } from "@/types";
import dayjs from "dayjs";

// ─────────────────────────────────────────────────────────────────────────────
// Date formatting utilities
// ─────────────────────────────────────────────────────────────────────────────

export function dateToSlashYYYYMMDD(
  dateStr: string | null | undefined
): string | null {
  if (!dateStr) return null;
  return dayjs(dateStr).format("YYYY/MM/DD");
}

export function dateToDashYYYYMMDD(
  dateStr: string | null | undefined
): string | null {
  if (!dateStr) return null;
  return dayjs(dateStr).format("YYYY-MM-DD");
}

export function dateToIso8601(
  dateStr: string | null | undefined
): string | null {
  if (!dateStr) return null;
  return dayjs(dateStr).toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Contributor utilities
// ─────────────────────────────────────────────────────────────────────────────

function contributorToObject(contributor: Publication["contributors"][0]) {
  const full_name = `${contributor.first_name ?? ""} ${
    contributor.last_name ?? ""
  }`.trim();
  // TODO Add email, institution, ORCID if available
  return {
    full_name,
    first_name: contributor.first_name ?? "",
    last_name: contributor.last_name ?? "",
    user_id: contributor.user_id
  };
}

// One entry per contributor, in the order the Contributors section shows them,
// so citations and metadata list authors the same way the page does.
function sortedContributors(publication: Publication) {
  return sortedContributorsWithRoles(
    getContributorsWithRoles(publication.contributors ?? [])
  );
}

export function contributorsToAuthors(publication: Publication | null) {
  if (!publication) return [];
  const contributors = sortedContributors(publication);
  const byline = contributors.filter((c) => c.in_byline);
  // If no byline contributors, fall back to all contributors
  return (byline.length > 0 ? byline : contributors).map(contributorToObject);
}

export function contributorsNonByline(publication: Publication | null) {
  if (!publication) return [];
  const contributors = sortedContributors(publication);
  const nonByline = contributors.filter((c) => !c.in_byline);
  if (nonByline.length === contributors.length) {
    // No byline contributors, so they are all treated as authors
    return [];
  }
  return nonByline.map(contributorToObject);
}

export function publicationUrls(
  publication: Publication | null,
  selectedVersionNum: number | null,
  baseUrl: string = typeof window !== "undefined"
    ? window.location.origin
    : "https://thestacks.org"
) {
  if (!publication) {
    return {
      basePublicationUrl: baseUrl,
      versionedPublicationUrl: baseUrl
    };
  }
  const verPart =
    selectedVersionNum && !Number.isNaN(selectedVersionNum)
      ? `/v${selectedVersionNum}`
      : "";
  // the URLs should be absolute
  const basePublicationUrl = `${baseUrl}/publications/${publication.slug}`;
  const versionedPublicationUrl = `${basePublicationUrl}${verPart}`;
  return {
    basePublicationUrl,
    versionedPublicationUrl
  };
}

/**
 * Prefer the version-specific DOI over the concept DOI, since the version
 * DOI points to the exact content being cited.
 */
export function publicationDoi(publication: Publication | null): string | null {
  if (!publication) return null;
  return publication.version_doi || publication.doi;
}

export function publicationCreatedAndModifiedDates(
  publication: Publication | null,
  selectedVersionNum: number | null
) {
  if (!publication) return { createdAt: null, modifiedAt: null };
  const createdAt = publication.created_at;
  const version = selectedVersionNum
    ? publication.versions?.find((v) => {
        return v.version_number === selectedVersionNum;
      })
    : publication.versions?.[0] || null;
  const modifiedAt = version ? version.created_at : publication.created_at;
  return { createdAt, modifiedAt };
}

/**
 * Generate JSON-LD structured data for a publication.
 * Accepts pre-processed title and abstract text to avoid async operations.
 */
export function publicationToLinkedData(
  publication: Publication | null,
  selectedVersionNum: number | null,
  titleText: string,
  abstractText: string,
  baseUrl: string = "https://thestacks.org"
) {
  if (!publication) return null;

  const { basePublicationUrl } = publicationUrls(
    publication,
    selectedVersionNum,
    baseUrl
  );

  const keywords =
    publication.tags && publication.tags.length > 0
      ? publication.tags
      : ["Uncategorized"];

  const authors = contributorsToAuthors(publication);
  const otherContributors = contributorsNonByline(publication);
  const { createdAt, modifiedAt } = publicationCreatedAndModifiedDates(
    publication,
    selectedVersionNum
  );
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "@id": `https://doi.org/${publication.doi}`,
    identifier: {
      "@type": "PropertyValue",
      propertyID: "DOI",
      value: publication.doi
    },
    isAccessibleForFree: true,
    version:
      selectedVersionNum != null
        ? selectedVersionNum.toString()
        : publication.version_number?.toString() || "",
    name: titleText,
    headline: titleText,
    url: basePublicationUrl,
    datePublished: dateToIso8601(createdAt),
    dateModified: dateToIso8601(modifiedAt),
    abstract: abstractText,
    inLanguage: "en",
    license: licenseToLink(publication?.license) || "",
    keywords,
    // TODO
    // image: ["{urls to figures in pub}"],

    /* ------------ Component parts ------------ */
    hasPart:
      publication.linked_assets
        ?.filter(
          (la) =>
            la.type === LinkedAssetType.Code ||
            la.type === LinkedAssetType.Data ||
            la.type === LinkedAssetType.CodeAndData
        )
        .map((la) => {
          if (la.type === LinkedAssetType.Code) {
            return {
              "@type": "SoftwareSourceCode",
              name: la.name,
              description: la.name,
              url: la.url
            };
          }
          return {
            "@type": "Dataset",
            name: la.name,
            description: la.name,
            url: la.url
          };
        }) || [],
    /* ------------ Citations ------------ */
    citation:
      publication.references?.map((ref) => ({
        "@type": "ScholarlyArticle",
        "@id": ref.url
      })) || [],

    /* ------------ Publisher ------------ */
    publisher: {
      "@type": "Organization",
      // TODO: What should be the ROR URL here?
      // "@id": "{ROR URL}",
      name: "The Stacks",
      // identifier: {
      //   "@type": "PropertyValue",
      //   propertyID: "{identifier, (e.g., ROR)}",
      //   value: "{identifier URL}"
      // },
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/og-image.png`
      }
      // TODO
      // sameAs: "{link to other sites/identifiers (e.g., social media account)}"
    },

    /* ------------ Authors & contributors ------------ */
    author: authors.map((a) => ({
      "@type": "Person",
      // TODO
      // "@id": "{full orcid url for byline author}",
      name: a.full_name
      // TODO
      // affiliation: {
      //   "@type": "Organization",
      //   "@id": "{identifier (e.g., ROR)}",
      //   name: "{organization name}"
      // }
    })),
    contributor: otherContributors.map((a) => ({
      "@type": "Person",
      // TODO
      // "@id": "{full orcid url for byline author}",
      name: a.full_name
      // TODO
      // affiliation: {
      //   "@type": "Organization",
      //   "@id": "{identifier (e.g., ROR)}",
      //   name: "{organization name}"
      // }
    })),

    /* ------------ Encodings ------------ */
    encoding: [
      {
        "@type": "MediaObject",
        contentUrl: basePublicationUrl,
        encodingFormat: "text/html"
      },
      {
        "@type": "MediaObject",
        contentUrl: `${basePublicationUrl}.md`,
        encodingFormat: "text/markdown"
      },
      {
        "@type": "MediaObject",
        contentUrl: `${basePublicationUrl}.json`,
        encodingFormat: "application/json"
      },
      {
        "@type": "MediaObject",
        contentUrl: publication.pdf_url,
        encodingFormat: "application/pdf"
      }
    ]
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SSR Meta Tag Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Meta tag object for React Router v7's meta export.
 */
export type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { tagName: "link"; rel: string; href: string; type?: string }
  | { "script:ld+json": Record<string, unknown> };

/**
 * Data prepared by the loader for meta tag generation.
 */
export interface PublicationMetaData {
  publication: Publication;
  title: string; // Pre-processed plain text title
  subtitle: string; // Pre-processed plain text subtitle
  abstract: string; // Pre-processed plain text abstract
  baseUrl: string; // Base URL for absolute URLs
  versionNumber: number | null;
}

/**
 * Generate all meta tags for a publication page (SSR-compatible).
 * Returns an array of meta tag objects for React Router v7's meta export.
 */
export function generatePublicationMetaTags(
  data: PublicationMetaData
): MetaTag[] {
  const { publication, title, subtitle, abstract, baseUrl, versionNumber } =
    data;

  const tags: MetaTag[] = [];

  // Helper to add meta tags conditionally
  const addMeta = (name: string, content: string | null | undefined) => {
    if (!content || String(content).trim() === "") return;
    const isProperty = name.startsWith("og:") || name.startsWith("article:");
    if (isProperty) {
      tags.push({ property: name, content: String(content) });
    } else {
      tags.push({ name, content: String(content) });
    }
  };

  // Helper to add link tags
  const addLink = (
    rel: string,
    href: string | null | undefined,
    type?: string
  ) => {
    if (!href || String(href).trim() === "") return;
    const linkTag: MetaTag = { tagName: "link", rel, href };
    if (type) {
      (
        linkTag as { tagName: "link"; rel: string; href: string; type: string }
      ).type = type;
    }
    tags.push(linkTag);
  };

  // Page title
  tags.push({ title: `${title} | The Stacks` });

  // Robots directive
  if (!publication || publication.state !== "PUBLISHED") {
    addMeta("robots", "noindex, nofollow");
    return tags; // Don't add other meta tags for non-published publications
  }

  addMeta("robots", "index, follow, max-image-preview:large");
  addMeta("type", "article");

  // Computed values
  const pubUrls = publicationUrls(publication, versionNumber, baseUrl);
  const { createdAt, modifiedAt } = publicationCreatedAndModifiedDates(
    publication,
    versionNumber
  );
  const authors = contributorsToAuthors(publication);
  const nonBylineContributors = contributorsNonByline(publication);

  // ─────────────────────────────────────────────────────────────────────────
  // Dublin Core (DC) metadata
  // ─────────────────────────────────────────────────────────────────────────
  addMeta("dc.format", "text/html");
  addMeta("dc.language", "en");
  addMeta("dc.title", title);
  addMeta("dc.identifier", publication.doi || "");
  addMeta("dc.date", dateToDashYYYYMMDD(createdAt));
  addMeta("dc.modified", dateToDashYYYYMMDD(modifiedAt));
  addMeta("dc.publisher", "The Stacks");
  addMeta("dc.rights", publication.license || "");
  addMeta("dc.license", licenseToLink(publication.license) || "");
  addMeta("dc.accessRights", "open");
  addMeta("dc.description", subtitle);
  if (Array.isArray(publication.tags) && publication.tags.length > 0) {
    addMeta("dc.subject", publication.tags.join("; "));
  }
  authors.forEach((a) => {
    addMeta("dc.creator", a.full_name);
  });
  nonBylineContributors.forEach((c) => {
    addMeta("dc.contributor", c.full_name);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PRISM metadata
  // ─────────────────────────────────────────────────────────────────────────
  addMeta("prism.publicationName", "The Stacks");
  addMeta("prism.publicationDate", dateToDashYYYYMMDD(publication.created_at));
  addMeta("prism.doi", publication.doi || "");
  addMeta(
    "prism.versionIdentifier",
    publication.version_number?.toString() || ""
  );
  addMeta("prism.url", pubUrls.basePublicationUrl);

  // ─────────────────────────────────────────────────────────────────────────
  // Citation metadata (Google Scholar, etc.)
  // ─────────────────────────────────────────────────────────────────────────
  addMeta("citation_title", title);
  addMeta("citation_journal_title", "The Stacks");
  addMeta("citation_abstract", subtitle);
  addMeta("citation_publisher", publication.publisher || "Astera Institute");
  addMeta(
    "citation_publication_date",
    dateToSlashYYYYMMDD(publication.created_at)
  );
  addMeta("citation_online_date", dateToSlashYYYYMMDD(publication.created_at));
  addMeta("citation_version", publication.version_number?.toString() || "");
  addMeta("citation_public_url", pubUrls.basePublicationUrl);
  addMeta("citation_full_html_url", pubUrls.basePublicationUrl);
  addMeta("citation_pdf_url", publication.pdf_url);
  addMeta("citation_doi", publication.doi);
  addMeta("citation_date", dateToSlashYYYYMMDD(publication.created_at));

  if (authors.length === 0) {
    addMeta("citation_author", "Anonymous");
  } else {
    authors.forEach((a) => {
      addMeta("citation_author", a.full_name || "Anonymous");
    });
  }

  addMeta("citation_fulltext_html_url", pubUrls.versionedPublicationUrl);
  addMeta("citation_abstract_html_url", pubUrls.versionedPublicationUrl);
  addMeta("citation_language", "en");

  // ─────────────────────────────────────────────────────────────────────────
  // Twitter Card metadata
  // ─────────────────────────────────────────────────────────────────────────
  addMeta("twitter:card", "summary_large_image");
  addMeta("twitter:image:alt", "thestacks.org logo");
  addMeta("twitter:site", "@arcadiaresearch");
  addMeta("twitter:title", title);
  addMeta("twitter:description", subtitle);
  // TODO: Add twitter:image when available

  // ─────────────────────────────────────────────────────────────────────────
  // Article metadata
  // ─────────────────────────────────────────────────────────────────────────
  addMeta("article:published_time", dateToIso8601(createdAt));
  addMeta("article:modified_time", dateToIso8601(modifiedAt));

  // ─────────────────────────────────────────────────────────────────────────
  // Open Graph metadata
  // ─────────────────────────────────────────────────────────────────────────
  addMeta("og:title", title);
  addMeta("og:description", subtitle);
  addMeta("og:url", pubUrls.basePublicationUrl);
  addMeta("og:type", "article");
  addMeta("og:updated_time", dateToIso8601(modifiedAt));
  // TODO: Add og:image when available

  // ─────────────────────────────────────────────────────────────────────────
  // Basic description meta tag
  // ─────────────────────────────────────────────────────────────────────────
  addMeta("description", subtitle);

  // ─────────────────────────────────────────────────────────────────────────
  // Link tags
  // ─────────────────────────────────────────────────────────────────────────
  addLink("canonical", pubUrls.basePublicationUrl);
  const licenseLink = licenseToLink(publication.license);
  if (licenseLink) {
    addLink("license", licenseLink);
  }
  addLink("alternate", publication.pdf_url, "application/pdf");
  addLink("alternate", `${pubUrls.basePublicationUrl}.md`, "text/markdown");
  addLink(
    "alternate",
    `${pubUrls.basePublicationUrl}.json`,
    "application/json"
  );

  // ─────────────────────────────────────────────────────────────────────────
  // JSON-LD structured data
  // ─────────────────────────────────────────────────────────────────────────
  const linkedData = publicationToLinkedData(
    publication,
    versionNumber,
    title,
    abstract || subtitle,
    baseUrl
  );
  if (linkedData) {
    tags.push({ "script:ld+json": linkedData });
  }

  return tags;
}
