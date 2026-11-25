import { expect, test } from "@playwright/test";

function metaNameSelector(name: string) {
  return `meta[name="${name}"]`;
}

function expectMetaContent(page: any, name: string, content: string | RegExp) {
  return expect(page.locator(metaNameSelector(name)).first()).toHaveAttribute(
    "content",
    content,
  );
}

function expectMetaCount(page: any, name: string, count: number) {
  return expect(page.locator(metaNameSelector(name))).toHaveCount(count);
}

function expectMetaProperty(page: any, name: string, content: string | RegExp) {
  return expect(page.locator(`meta[property="${name}"]`)).toHaveAttribute(
    "content",
    content,
  );
}

test("has indexing metadata", async ({ page }) => {
  await page.goto("/publications/method-glass-box-umap");

  await expect(page).toHaveTitle(
    "From black box to glass box: Making UMAP interpretable with exact feature contributions | The Stacks",
  );
  await expectMetaContent(
    page,
    "robots",
    "index, follow, max-image-preview:large",
  );
  await expectMetaContent(page, "type", "article");
  await expectMetaContent(page, "dc.format", "text/html");
  await expectMetaContent(page, "dc.language", "en");
  await expectMetaContent(page, "dc.identifier", "10.57844/arcadia-tnr4-7n9h");
  await expectMetaContent(page, "dc.date", "2025-10-29");
  await expectMetaContent(page, "dc.modified", "2025-12-01");
  await expectMetaContent(page, "dc.publisher", "The Stacks");
  await expectMetaContent(page, "dc.rights", "CC BY");
  await expectMetaContent(
    page,
    "dc.license",
    "https://creativecommons.org/licenses/by/4.0/",
  );
  await expectMetaContent(page, "dc.accessRights", "open");
  await expectMetaContent(page, "dc.subject", "Method; not actively updating");
  await expectMetaContent(page, "prism.publicationName", "The Stacks");
  await expectMetaContent(page, "prism.publicationDate", "2025-10-29");
  await expectMetaContent(page, "prism.doi", "10.57844/arcadia-tnr4-7n9h");
  await expectMetaContent(page, "prism.versionIdentifier", "3");
  await expectMetaContent(
    page,
    "prism.url",
    /.*\/publications\/method-glass-box-umap$/,
  );
  await expectMetaContent(page, "citation_journal_title", "The Stacks");
  await expectMetaContent(page, "citation_publisher", "The Stacks");
  await expectMetaContent(page, "citation_publication_date", "2025/10/29");
  await expectMetaContent(page, "citation_online_date", "2025/10/29");
  await expectMetaContent(page, "citation_version", "3");
  await expectMetaContent(
    page,
    "citation_public_url",
    /.*\/publications\/method-glass-box-umap$/,
  );
  await expectMetaContent(
    page,
    "citation_full_html_url",
    /.*\/publications\/method-glass-box-umap$/,
  );
  await expectMetaContent(
    page,
    "citation_pdf_url",
    /.*\/publications\/method-glass-box-umap\/.*\.pdf$/,
  );
  await expectMetaContent(page, "citation_doi", "10.57844/arcadia-tnr4-7n9h");
  await expectMetaContent(page, "citation_date", "2025/10/29");
  await expectMetaContent(
    page,
    "citation_fulltext_html_url",
    /.*\/publications\/method-glass-box-umap$/,
  );
  await expectMetaContent(
    page,
    "citation_abstract_html_url",
    /.*\/publications\/method-glass-box-umap$/,
  );
  await expectMetaContent(page, "citation_language", "en");
  await expectMetaContent(page, "twitter:card", "summary_large_image");
  await expectMetaContent(page, "twitter:image:alt", "thestacks.org logo");
  await expectMetaContent(page, "twitter:site", "@arcadiaresearch");
  // TODO: These values are different in production.
  // await expectMetaProperty(
  //   page,
  //   "article:published_time",
  //   "2025-10-30T01:30:00.000Z"
  // );
  // await expectMetaProperty(
  //   page,
  //   "article:modified_time",
  //   "2025-12-02T02:30:00.000Z"
  // );

  await expectMetaProperty(
    page,
    "og:url",
    /.*\/publications\/method-glass-box-umap$/,
  );
  await expectMetaProperty(page, "og:type", "article");
  // TODO: This value is different in production.
  // await expectMetaProperty(page, "og:updated_time", "2025-12-02T02:30:00.000Z");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /.*\/publications\/method-glass-box-umap$/,
  );
  await expect(page.locator('link[rel="license"]')).toHaveAttribute(
    "href",
    "https://creativecommons.org/licenses/by/4.0/",
  );
  const alternatePdf = page.locator('link[rel="alternate"]').nth(0);
  await expect(alternatePdf).toHaveAttribute(
    "href",
    "https://thestacks-01.s3.us-west-2.amazonaws.com/publications/method-glass-box-umap/method-glass-box-umap_v3.pdf",
  );
  await expect(alternatePdf).toHaveAttribute("type", "application/pdf");
  const alternateMd = page.locator('link[rel="alternate"]').nth(1);
  await expect(alternateMd).toHaveAttribute(
    "href",
    /.*\/publications\/method-glass-box-umap\.md$/,
  );
  await expect(alternateMd).toHaveAttribute("type", "text/markdown");
  await expectMetaCount(page, "dc.creator", 2);
  await expectMetaCount(page, "dc.contributor", 3);
  await expectMetaCount(page, "citation_author", 2);
  await expectMetaContent(
    page,
    "dc.title",
    "From black box to glass box: Making UMAP interpretable with exact feature contributions",
  );
  await expectMetaContent(
    page,
    "citation_title",
    "From black box to glass box: Making UMAP interpretable with exact feature contributions",
  );
  await expectMetaContent(
    page,
    "twitter:title",
    "From black box to glass box: Making UMAP interpretable with exact feature contributions",
  );
  await expectMetaProperty(
    page,
    "og:title",
    "From black box to glass box: Making UMAP interpretable with exact feature contributions",
  );
  await expectMetaContent(
    page,
    "description",
    "We transform UMAP from a black box into a glass box. By learning the embedding function with a certain type of deep network, we can compute equivalent linear mappings of the input features that exactly reconstruct each embedding, revealing the heretofore hidden logic of UMAP.",
  );
  await expectMetaContent(
    page,
    "dc.description",
    "We transform UMAP from a black box into a glass box. By learning the embedding function with a certain type of deep network, we can compute equivalent linear mappings of the input features that exactly reconstruct each embedding, revealing the heretofore hidden logic of UMAP.",
  );
  await expectMetaContent(
    page,
    "citation_abstract",
    "We transform UMAP from a black box into a glass box. By learning the embedding function with a certain type of deep network, we can compute equivalent linear mappings of the input features that exactly reconstruct each embedding, revealing the heretofore hidden logic of UMAP.",
  );
  await expectMetaContent(
    page,
    "twitter:description",
    "We transform UMAP from a black box into a glass box. By learning the embedding function with a certain type of deep network, we can compute equivalent linear mappings of the input features that exactly reconstruct each embedding, revealing the heretofore hidden logic of UMAP.",
  );
  await expectMetaProperty(
    page,
    "og:description",
    "We transform UMAP from a black box into a glass box. By learning the embedding function with a certain type of deep network, we can compute equivalent linear mappings of the input features that exactly reconstruct each embedding, revealing the heretofore hidden logic of UMAP.",
  );

  // Indexing metadata should not appear on other pages
  await page.getByRole("link", { name: "Home" }).first().click();
  await expect(page).toHaveTitle("The Stacks");
  await expectMetaCount(page, "dc.identifier", 0);
  await expectMetaCount(page, "dc.creator", 0);
});
