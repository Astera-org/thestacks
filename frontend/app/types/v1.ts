import type { PublicationContent } from "@/types";

export type ISODateStringV1 = string;

export interface PaginationV1 {
  total: number;
  page: number;
  perPage: number;
}

export type PaginatedResponseV1<T> = {
  pagination: PaginationV1;
  items: T[];
};

export interface OrganizationV1 {
  slug: string;
  id: string;
  name: string;
  avatar?: string | null;
  profile?: string | null;
  rorId: string | null;
  unlisted?: boolean;
  canEdit?: boolean;
  createdAt: string;
}

export interface UserV1 {
  id: string;
  username: string;
  email: string;
  orcid: string | null;
  firstName: string;
  lastName: string;
  avatar: string | null;
  profile: string | null;
  points: number;
  moderator: boolean;
  admin: boolean;
  state: string;
  createdAt: string;
  loginAt: string | null;
  organization?: OrganizationV1;
  canCreatePublications?: boolean;
  canContactUs?: boolean;
}

export interface LimitedUserV1 {
  id: string;
  username: string;
  email?: string;
  orcid: string | null;
  firstName: string;
  lastName: string;
  avatar: string | null;
  profile?: string | null;
  points?: number;
  moderator?: boolean;
  admin?: boolean;
  state?: string;
  createdAt?: string;
  iconColor?: string;
}

export interface ContributorV1 {
  userId: string;
  avatar?: string;
  firstName: string;
  lastName: string;
  priority: number;
  orcid?: string | null;
  username: string;
  iconColor?: string;
  roles: string[];
  inByline: boolean;
  affiliations?: ContributorAffiliationV1[];
}

export interface ContributorAffiliationV1 {
  orgId: string;
  name: string;
  slug: string;
  rorId: string | null;
  avatar?: string | null;
}

export interface OrgOnPubV1 {
  slug: string;
  orgId: string;
  name: string;
  avatar?: string | null;
  priority?: number | null;
}

export interface ContributorWithRolesV1 extends ContributorV1 {
  roles: string[];
  affiliations: ContributorAffiliationV1[];
}

export type ReferenceV1 = {
  text: string;
  url: string;
};

export type PublicationStateV1 =
  "DRAFT" | "PUBLISHED" | "RETRACTED" | "DELETED";

// UI order matches below order
export enum LinkedAssetTypeV1 {
  Code = "Code",
  Data = "Data",
  CodeAndData = "Code + data",
  Material = "Material",
  Protocol = "Protocol",
  ThreeDPrinting = "3D printing design",
  CompanionPub = "Companion pub",
  Other = "Other"
}

export const LINKED_ASSET_TYPES: LinkedAssetTypeV1[] =
  Object.values(LinkedAssetTypeV1);

export interface LinkedAssetV1 {
  type: LinkedAssetTypeV1;
  url: string;
  name?: string;
}

/** A file stored by Raven and used by a publication version, e.g. an image. */
export interface MediaAssetV1 {
  id: string;
  byteSize: number;
  mimeType: string;
  kind: "audio" | "file" | "image" | "video";
  publicUrl: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  rotation: number | null;
}

type PublicationStats = {
  sections: number;
  audio: number;
  images: number;
  videos: number;
  iframes: number;
  tables: number;
  citations: number;
};

/** A DataCite subject sent with the pub's DOI metadata. */
export interface DoiMetadataSubjectV1 {
  subject: string;
  subjectScheme?: string;
}

export interface PublicationV1 {
  id: string;
  slug: string;
  parentId: string | null;
  templateId: string | null;
  latestVersionId: string | null;
  title: string;
  subtitle: string | null;
  abstract: string;
  doi: string | null;
  body: string;
  versionDesc: string | null;
  versionNumber: number;
  versionId: string;
  state: PublicationStateV1;
  license: string;
  /** The DataCite subjects for the pub's DOIs; only draft responses send them. */
  subjects?: DoiMetadataSubjectV1[];
  createdAt: string;
  updatedAt: string | null;
  contributors: ContributorV1[];
  references: ReferenceV1[];
  pdfUrl: string | null;
  numComments?: number;
  socialPostsCount?: number | null;
  feedbackFormEmbedSrc?: string | null;
  socialPostsEmbedSrc?: string | null;
  tags?: string[];
  linkedAssets?: LinkedAssetV1[];
  /** Every file stored for this version, including ones no longer in the body. */
  mediaAssets: MediaAssetV1[];
  orgs?: OrgOnPubV1[];
  // TODO: Why is this optional?
  versions?: VersionInfoV1[];
  importDocument?: ImportDocumentV1 | null;
  /** The format the content is rendered in; absent when it has none recorded. */
  content?: PublicationContent | null;
  stats: PublicationStats;
}

/** A span of a text field: 1-based lines and columns, end column exclusive. */
export interface SourceRangeV1 {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/** A problem the importer worked around rather than failing the import. */
export interface ImportDiagnosticV1 {
  /** Stable identifier for the kind of problem, e.g. `media-invalid-src`. */
  code: string;
  severity: "error" | "warning";
  message: string;
  /** The publication field the problem is in, e.g. `["body"]`. */
  path: (string | number)[];
  /** Where in that field, when the importer could tell. */
  range?: SourceRangeV1;
  /**
   * The text around `range` when the import was stored. Not sent by backends
   * from before excerpts were added.
   */
  excerpt?: DiagnosticExcerptV1;
}

/**
 * The text around a diagnostic's range when it was imported, so it can still
 * be shown, and found again, after the field has been edited. Every string is
 * verbatim from the field: nothing is inserted where text was cut.
 */
export interface DiagnosticExcerptV1 {
  /** The line of the field that `before` starts on. */
  startLine: number;
  /**
   * The text before the problem: back to the start of the line 3 lines up, or
   * 200 characters, whichever is shorter.
   */
  before: string;
  /**
   * The problem's text. Over 200 characters, `start` and `end` are its first
   * and last halves with the rest omitted; otherwise `start` is all of it and
   * `end` is empty.
   */
  highlight: {
    start: string;
    omittedChars: number;
    /** Line breaks in the omitted text, to keep line numbers right. */
    omittedLines: number;
    end: string;
  };
  /** The text after the problem, limited like `before`. */
  after: string;
  /** `before` starts partway through a line. */
  clippedStart: boolean;
  /** `after` stops partway through a line. */
  clippedEnd: boolean;
}

/** A publication version's current import, without its raw source. */
export interface ImportDocumentV1 {
  id: string | null;
  body: string;
  /** Null when a client sent the document, as with MyST (`format: "mystmd"`). */
  url: string | null;
  format: string;
  syncDate?: string;
  filename?: string | null;
  diagnostics: ImportDiagnosticV1[] | null;
  /**
   * Set by the editor (not the API) when this draft has no import of its own
   * and this is the doc an earlier version was last synced from.
   */
  publicationVersionNumber?: number;
  /**
   * Fields a draft edit has changed since this import, so they no longer
   * match the source document. Empty after an import or re-sync; null off
   * the draft.
   */
  editedFields?: ImportedFieldV1[] | null;
}
/** A listed version's current import, which leaves out the diagnostics. */
export type VersionImportDocumentV1 = Omit<
  ImportDocumentV1,
  "diagnostics" | "editedFields" | "publicationVersionNumber"
>;

/** An imported field a draft edit can change. Mirrors Raven's IMPORTED_VERSION_FIELDS. */
export type ImportedFieldV1 = "title" | "subtitle" | "abstract" | "body";

export interface UserPermissionsOnPublicationV1 {
  canEdit?: boolean;
  userIsCommentsAdmin?: boolean; // Can delete any comment
}

export interface CommentV1 {
  commentId: string;
  // TODO: this is not actually returned by the backend
  publicationId: string;
  userId: string;
  firstName: string;
  lastName: string;
  // TODO: Why is this optional?
  username?: string | null;
  parentId: string | null;
  avatar?: string | null;
  body: string;
  anchorText?: string | null;
  preText?: string | null;
  postText?: string | null;
  createdAt: string;
  updatedAt: string | null;
  viewerRating?: number | null;
  replies?: CommentV1[];
  versionId: string | null;
}

export interface CommentThreadV1 {
  root: CommentV1;
  replies: CommentV1[];
}

/**
 * Shape returned by GET /publications/my/drafts
 */
export interface DraftSummaryV1 {
  publicationId: string;
  slug: string;
  versionId: string;
  versionNumber: number;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponseV1 {
  user: UserV1;
  accessToken: string;
  refreshToken: string;
}

export type PaginatedPublicationsV1 = PaginatedResponseV1<PublicationV1>;

export type PaginatedDraftsV1 = PaginatedResponseV1<DraftSummaryV1>;

export type PaginatedCommentsV1 = PaginatedResponseV1<CommentV1>;

export type PaginatedUsersV1 = PaginatedResponseV1<UserV1>;

export interface NotificationV1 {
  id: string;
  userId: string;
  publicationId: string;
  publicationSlug: string;
  publicationTitle?: string | null;
  commentId?: number;
  commentAuthor?: {
    firstName: string;
    lastName: string;
    avatar: string | null;
  } | null;
  commentTextExcerpt?: string | null;
  publicationOrg?: {
    id: string;
    avatar: string | null;
  } | null;
  state: string;
  message: string;
  // 0 = unread, 1 = read.
  // TODO: Why is this a number? Change this to a boolean.
  seen: number;
  createdAt: string;
}

export type PaginatedNotificationsV1 = PaginatedResponseV1<NotificationV1>;

export interface VersionInfoV1 {
  id: string;
  versionNumber?: number;
  createdAt: string;
  versionDesc?: string;
  /** Only on the draft; null elsewhere. */
  importDocument: VersionImportDocumentV1 | null;
}

export interface HeadingV1 {
  depth: number;
  hasChildren: boolean;
  id: string;
  text: string;
}
