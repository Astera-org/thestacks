/**
 * Types for the DataCite REST API response to:
 *   GET https://api.datacite.org/dois/{id}
 *   GET https://api.test.datacite.org/dois/{id}
 *
 * Derived from the OpenAPI definition (REST API v2.3.0), `DoiDetailItem`.
 * Media type: application/vnd.api+json
 *
 * Write-only properties (`event`) are omitted, since they never appear in a
 * GET response. Everything the spec marks `readOnly` is kept and annotated.
 * The spec declares no required properties other than `data.type`, so
 * fields are optional here; see the note at the bottom of the file if you'd
 * rather narrow that.
 */

// ---------------------------------------------------------------------------
// Top level
// ---------------------------------------------------------------------------

export interface DoiDetailItem {
  data: DoiResource;
}

export interface DoiResource {
  /** The DOI name, e.g. "10.5438/0014". Read-only. */
  id?: string;
  type: "dois";
  attributes?: DoiAttributes;
  /** Read-only. */
  relationships?: DoiRelationships;
}

// ---------------------------------------------------------------------------
// Attributes (the spec composes these with allOf)
// ---------------------------------------------------------------------------

export interface DoiAttributes
  extends
    DoiIdentifierProperties,
    DoiPropertiesMetadata,
    DoiPropertiesXml,
    DoiPropertiesOther,
    DoiPropertiesStats,
    DoiPropertiesDates {}

export interface DoiIdentifierProperties {
  /** The full DOI name. */
  doi?: string;
  /** The DOI prefix. */
  prefix?: string;
  /** The DOI suffix. Read-only. */
  suffix?: string;
  /** Equivalent to the AlternateIdentifier property in the metadata schema. */
  identifiers?: Identifier[];
  alternateIdentifiers?: AlternateIdentifier[];
}

export interface Identifier {
  identifier?: string;
  identifierType?: string;
}

export interface AlternateIdentifier {
  alternateIdentifierType?: string;
  alternateIdentifier?: string;
}

export interface DoiPropertiesXml {
  /** Full DataCite Metadata Schema XML, Base64-encoded. */
  xml?: string;
}

export interface DoiPropertiesOther {
  /** The landing page URL of the DOI. */
  url?: string;
  /** Content URLs associated with the DOI. */
  contentUrl?: string[];
  /** Version of the stored metadata, incremented once per update. Read-only. */
  metadataVersion?: number;
  /** DataCite Metadata Schema version of the stored metadata, as a URL. */
  schemaVersion?: string;
  /** The system used to create the DOI. Read-only. */
  source?: DoiSource;
  /** True if the DOI is in Findable state. Read-only. */
  isActive?: boolean;
  /** Read-only. */
  state?: DoiState;
  /** Legacy attribute for EZID compatibility. Read-only. */
  reason?: string;
}

export interface DoiPropertiesDates {
  /** Date the DOI record was created in the DataCite system. Read-only. */
  created?: string;
  /** Date the DOI was registered in the global handle server. Read-only. */
  registered?: string;
  /** Date the DOI was last updated. Read-only. */
  updated?: string;
}

// ---------------------------------------------------------------------------
// Metadata properties (DataCite Metadata Schema 4.x)
// ---------------------------------------------------------------------------

export interface DoiPropertiesMetadata {
  creators?: Creator[];
  titles?: Title[];
  /**
   * A bare string unless the request sets `?publisher=true`, in which case
   * the object form with the publisher identifier is returned.
   */
  publisher?: Publisher | string;
  /** Read-only. */
  container?: Container;
  publicationYear?: number;
  subjects?: Subject[];
  contributors?: Contributor[];
  dates?: DateEntry[];
  language?: string;
  types?: Types;
  relatedIdentifiers?: RelatedIdentifier[];
  relatedItems?: RelatedItem[];
  sizes?: string[];
  formats?: string[];
  version?: string;
  rightsList?: Rights[];
  descriptions?: Description[];
  geoLocations?: GeoLocation[];
  fundingReferences?: FundingReference[];
}

export interface NameIdentifier {
  nameIdentifier?: string;
  nameIdentifierScheme?: string;
  schemeUri?: string;
}

/** Set `?affiliation=true` to get the identifier fields populated. */
export interface Affiliation {
  affiliationIdentifier?: string;
  affiliationIdentifierScheme?: string;
  name?: string;
  schemeUri?: string;
}

export interface Creator {
  nameType?: NameType;
  nameIdentifiers?: NameIdentifier[];
  name?: string;
  givenName?: string;
  familyName?: string;
  affiliation?: Affiliation[];
  lang?: string;
}

export interface Contributor extends Creator {
  contributorType?: ContributorType;
}

export interface Title {
  title?: string;
  titleType?: TitleType;
  lang?: string;
}

export interface Publisher {
  name?: string;
  publisherIdentifier?: string;
  publisherIdentifierScheme?: string;
  schemeUri?: string;
  lang?: string;
}

export interface Container {
  type?: string;
  identifier?: string;
  identifierType?: string;
  title?: string;
  volume?: string;
  issue?: string;
  firstPage?: string;
  lastPage?: string;
}

export interface Subject {
  subject?: string;
  subjectScheme?: string;
  schemeUri?: string;
  valueUri?: string;
  lang?: string;
  classificationCode?: string;
}

export interface DateEntry {
  date?: string;
  dateType?: DateType;
  dateInformation?: string;
}

export interface Types {
  resourceTypeGeneral?: ResourceTypeGeneral;
  resourceType?: string;
  /** Read-only. */
  schemaOrg?: string;
  /** Read-only. */
  bibtex?: string;
  /** Read-only. */
  citeproc?: string;
  /** Read-only. */
  ris?: string;
}

export interface RelatedIdentifier {
  relatedIdentifier?: string;
  relatedIdentifierType?: RelatedIdentifierType;
  relationType?: RelationType;
  resourceTypeGeneral?: ResourceTypeGeneral;
  relatedMetadataScheme?: string;
  schemeUri?: string;
  schemeType?: string;
  relationTypeInformation?: string;
}

export interface RelatedItemIdentifier {
  relatedItemIdentifier?: string;
  relatedItemIdentifierType?: RelatedIdentifierType;
  relatedMetadataScheme?: string;
  schemeURI?: string;
  schemeType?: string;
}

export interface RelatedItemCreator {
  name?: string;
  givenName?: string;
  familyName?: string;
  nameType?: NameType;
}

export interface RelatedItemContributor extends RelatedItemCreator {
  contributorType?: ContributorType;
}

export interface RelatedItem {
  relatedItemType?: ResourceTypeGeneral;
  relationType?: RelationType;
  relatedItemIdentifier?: RelatedItemIdentifier;
  relationTypeInformation?: string;
  creators?: RelatedItemCreator[];
  titles?: Pick<Title, "title" | "titleType">[];
  volume?: string;
  issue?: string;
  number?: string;
  numberType?: NumberType;
  firstPage?: string;
  lastPage?: string;
  publisher?: string;
  /** A string here, unlike the top-level `publicationYear`. */
  publicationYear?: string;
  edition?: string;
  contributors?: RelatedItemContributor[];
}

export interface Rights {
  rights?: string;
  rightsUri?: string;
  schemeUri?: string;
  rightsIdentifier?: string;
  rightsIdentifierScheme?: string;
  lang?: string;
}

export interface Description {
  description?: string;
  descriptionType?: DescriptionType;
  lang?: string;
}

export interface GeoLocationPoint {
  pointLongitude?: number;
  pointLatitude?: number;
}

export interface GeoLocationBox {
  westBoundLongitude?: number;
  eastBoundLongitude?: number;
  southBoundLatitude?: number;
  northBoundLatitude?: number;
}

export type GeoLocationPolygonPoint =
  { polygonPoint?: GeoLocationPoint } | { inPolygonPoint?: GeoLocationPoint };

export interface GeoLocation {
  geoLocationBox?: GeoLocationBox;
  geoLocationPlace?: string;
  geoLocationPoint?: GeoLocationPoint;
  geoLocationPolygon?: GeoLocationPolygonPoint[];
}

export interface FundingReference {
  funderName?: string;
  funderIdentifier?: string;
  funderIdentifierType?: FunderIdentifierType;
  awardNumber?: string;
  awardUri?: string;
  awardTitle?: string;
}

// ---------------------------------------------------------------------------
// Usage and citation statistics (all read-only, sourced from Event Data)
// ---------------------------------------------------------------------------

export interface MonthlyTotal {
  yearMonth?: string;
  total?: number;
}

export interface YearlyTotal {
  year?: string;
  total?: number;
}

export interface DoiPropertiesStats {
  viewCount?: number;
  viewsOverTime?: MonthlyTotal[];
  downloadCount?: number;
  downloadsOverTime?: MonthlyTotal[];
  referenceCount?: number;
  citationCount?: number;
  citationsOverTime?: YearlyTotal[];
  partCount?: number;
  partOfCount?: number;
  versionCount?: number;
  versionOfCount?: number;
  /** Data describing the landing page, used by link checking. Read-only. */
  landingPage?: LandingPage;
}

export interface LandingPage {
  checked?: string;
  url?: string;
  contentType?: string;
  error?: string;
  redirectCount?: number;
  redirectUrls?: string[];
  downloadLatency?: number;
  hasSchemaOrg?: boolean;
  schemaOrgid?: string;
  dcIdentifier?: string;
  citationDoi?: string;
  bodyhasPid?: boolean;
}

// ---------------------------------------------------------------------------
// Relationships (JSON:API resource linkage)
// ---------------------------------------------------------------------------

export interface DataObject {
  id?: string;
  type?: string;
}

export interface ToOneRelationship {
  data?: DataObject;
}

export interface ToManyRelationship {
  data?: DataObject[];
}

export interface DoiRelationships {
  /** The DataCite client (repository) associated with the DOI. */
  client?: ToOneRelationship;
  /** The DataCite provider (Direct Member or Consortium Organization). */
  provider?: ToOneRelationship;
  /** Legacy attribute for media support. */
  media?: ToOneRelationship;
  references?: ToManyRelationship;
  citations?: ToManyRelationship;
  parts?: ToManyRelationship;
  partOf?: ToManyRelationship;
  versions?: ToManyRelationship;
  versionOf?: ToManyRelationship;
}

// ---------------------------------------------------------------------------
// Controlled vocabularies
// ---------------------------------------------------------------------------

export type DoiState = "findable" | "registered" | "draft";

export type DoiSource = "mds" | "api" | "fabricaForm" | "fabrica" | "ez";

export type NameType = "Personal" | "Organizational";

export type TitleType =
  "AlternativeTitle" | "Subtitle" | "TranslatedTitle" | "Other";

export type DateType =
  | "Accepted"
  | "Available"
  | "Copyrighted"
  | "Collected"
  | "Coverage"
  | "Created"
  | "Issued"
  | "Submitted"
  | "Updated"
  | "Valid"
  | "Withdrawn"
  | "Other";

export type DescriptionType =
  | "Abstract"
  | "Methods"
  | "SeriesInformation"
  | "TableOfContents"
  | "TechnicalInfo"
  | "Other";

export type NumberType = "Article" | "Chapter" | "Report" | "Other";

export type FunderIdentifierType =
  "Crossref Funder ID" | "GRID" | "ISNI" | "ROR" | "Other";

export type ResourceTypeGeneral =
  | "Audiovisual"
  | "Award"
  | "Book"
  | "BookChapter"
  | "Collection"
  | "ComputationalNotebook"
  | "ConferencePaper"
  | "ConferenceProceeding"
  | "DataPaper"
  | "Dataset"
  | "Dissertation"
  | "Event"
  | "Image"
  | "Instrument"
  | "InteractiveResource"
  | "Journal"
  | "JournalArticle"
  | "Model"
  | "OutputManagementPlan"
  | "PeerReview"
  | "PhysicalObject"
  | "Poster"
  | "Preprint"
  | "Presentation"
  | "Project"
  | "Report"
  | "Service"
  | "Software"
  | "Sound"
  | "Standard"
  | "StudyRegistration"
  | "Text"
  | "Workflow"
  | "Other";

export type ContributorType =
  | "ContactPerson"
  | "DataCollector"
  | "DataCurator"
  | "DataManager"
  | "Distributor"
  | "Editor"
  | "HostingInstitution"
  | "Producer"
  | "ProjectLeader"
  | "ProjectManager"
  | "ProjectMember"
  | "RegistrationAgency"
  | "RegistrationAuthority"
  | "RelatedPerson"
  | "Researcher"
  | "ResearchGroup"
  | "RightsHolder"
  | "Sponsor"
  | "Supervisor"
  | "Translator"
  | "WorkPackageLeader"
  | "Other";

export type RelatedIdentifierType =
  | "ARK"
  | "arXiv"
  | "bibcode"
  | "CSTR"
  | "DOI"
  | "EAN13"
  | "EISSN"
  | "Handle"
  | "IGSN"
  | "ISBN"
  | "ISSN"
  | "ISTC"
  | "LISSN"
  | "LSID"
  | "PMID"
  | "PURL"
  | "RAiD"
  | "RRID"
  | "SWHID"
  | "UPC"
  | "URL"
  | "URN"
  | "w3id";

export type RelationType =
  | "IsCitedBy"
  | "Cites"
  | "IsSupplementTo"
  | "IsSupplementedBy"
  | "IsContinuedBy"
  | "Continues"
  | "IsDescribedBy"
  | "Describes"
  | "HasMetadata"
  | "IsMetadataFor"
  | "HasVersion"
  | "IsVersionOf"
  | "IsNewVersionOf"
  | "IsPreviousVersionOf"
  | "IsPartOf"
  | "HasPart"
  | "IsPublishedIn"
  | "IsReferencedBy"
  | "References"
  | "IsDocumentedBy"
  | "Documents"
  | "IsCompiledBy"
  | "Compiles"
  | "IsVariantFormOf"
  | "IsOriginalFormOf"
  | "IsIdenticalTo"
  | "IsReviewedBy"
  | "Reviews"
  | "IsDerivedFrom"
  | "IsSourceOf"
  | "IsRequiredBy"
  | "Requires"
  | "IsObsoletedBy"
  | "Obsoletes"
  | "IsCollectedBy"
  | "Collects"
  | "IsTranslationOf"
  | "HasTranslation"
  | "Other";

/*
 * Notes
 * -----
 * 1. `publisher` is a union because the object form only appears when the
 *    request includes `?publisher=true`. If you always send that flag, narrow
 *    it to `Publisher` and drop the string branch.
 * 2. Likewise `?affiliation=true` is what populates the identifier fields on
 *    `Affiliation`; without it you typically get just `name`.
 * 3. The spec documents only a 200 response — no 404 or error schema — so
 *    handle non-2xx status codes yourself rather than typing them from here.
 * 4. Almost everything is optional because the OpenAPI schema declares no
 *    required fields below `data.type`. In practice `doi`, `prefix`,
 *    `suffix`, `url`, `state` and the DataCite-managed dates are always
 *    present on a findable DOI, so a `Required<>`-style narrowing is
 *    reasonable if you'd rather not null-check them everywhere.
 */
